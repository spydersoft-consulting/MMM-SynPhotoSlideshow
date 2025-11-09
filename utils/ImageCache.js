/**
 * ImageCache.js
 *
 * Manages image caching with automatic size limits and pre-loading
 */

const NodeCache = require('node-cache');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const Log = require('./Logger.js');
const crypto = require('node:crypto');

class ImageCache {
  constructor (config) {
    this.config = config;
    this.cache = null;
    this.cacheDir = null;
    this.preloadQueue = [];
    this.isPreloading = false;
    this.currentCacheSize = 0;
    this.preloadDelay = config.imageCachePreloadDelay || 500; // Configurable delay between preloads
  }

  /**
   * Initialize the cache
   */
  async initialize () {
    try {
      this.cacheDir = path.join(__dirname, '..', '.image-cache');
      const maxSizeMB = this.config.imageCacheMaxSize || 500; // Default 500MB
      this.maxCacheSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes

      // Create cache directory if it doesn't exist
      try {
        await fsPromises.mkdir(this.cacheDir, {recursive: true});
      } catch (error) {
        // Directory might already exist
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }

      // Initialize in-memory cache for quick lookups only
      // Don't store full images in memory, just metadata
      // TTL of 7 days (in seconds)
      this.cache = new NodeCache({
        stdTTL: 60 * 60 * 24 * 7,
        checkperiod: 600,
        useClones: false,
        maxKeys: 1000 // Limit memory cache entries
      });

      // Calculate current cache size asynchronously
      await this.calculateCacheSize();

      Log.info(`Image cache initialized at ${this.cacheDir} with max size ${maxSizeMB}MB`);
      return true;
    } catch (error) {
      Log.error(`Failed to initialize image cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate current cache size (async to avoid blocking)
   */
  async calculateCacheSize () {
    try {
      let totalSize = 0;

      try {
        const files = await fsPromises.readdir(this.cacheDir);

        // Process files in batches to avoid overwhelming system
        const batchSize = 10;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          const sizes = await Promise.all(batch.map(async (file) => {
            try {
              const filePath = path.join(this.cacheDir, file);
              const stats = await fsPromises.stat(filePath);
              return stats.isFile()
                ? stats.size
                : 0;
            } catch {
              return 0;
            }
          }));
          totalSize += sizes.reduce((sum, size) => sum + size, 0);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      this.currentCacheSize = totalSize;
      Log.debug(`Current cache size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      Log.error(`Error calculating cache size: ${error.message}`);
      this.currentCacheSize = 0;
    }
  }

  /**
   * Evict old files if cache is too large (async to avoid blocking)
   */
  async evictOldFiles () {
    if (this.currentCacheSize <= this.maxCacheSize) {
      return;
    }

    try {
      const files = await fsPromises.readdir(this.cacheDir);
      const fileStats = [];

      // Get file stats with modification time (parallel for speed)
      const statsPromises = files.map(async (file) => {
        try {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fsPromises.stat(filePath);

          if (stats.isFile()) {
            return {
              path: filePath,
              name: file,
              size: stats.size,
              mtime: stats.mtime
            };
          }
        } catch {
          // File might have been deleted
        }
        return null;
      });

      const allStats = await Promise.all(statsPromises);
      fileStats.push(...allStats.filter((stat) => stat !== null));

      // Sort by modification time (oldest first)
      fileStats.sort((a, b) => a.mtime - b.mtime);

      // Remove oldest files until we're under the limit
      const targetSize = this.maxCacheSize * 0.9; // Leave 10% headroom
      for (const file of fileStats) {
        if (this.currentCacheSize <= targetSize) {
          break;
        }

        try {
          await fsPromises.unlink(file.path);
          this.cache.del(file.name);
          this.currentCacheSize -= file.size;
          Log.debug(`Evicted ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        } catch (error) {
          // File might have been deleted already
          Log.debug(`Could not evict ${file.name}: ${error.message}`);
        }
      }
    } catch (error) {
      Log.error(`Error evicting files: ${error.message}`);
    }
  }

  /**
   * Generate cache key from image URL or path
   */
  getCacheKey (imageIdentifier) {
    return crypto.createHash('md5').update(imageIdentifier)
      .digest('hex');
  }

  /**
   * Get image from cache
   */
  async get (imageIdentifier) {
    if (!this.cache) {
      return null;
    }

    try {
      const key = this.getCacheKey(imageIdentifier);

      // Check if file exists in memory cache metadata
      const cachedMeta = this.cache.get(key);

      if (cachedMeta) {
        // Load from disk async (don't store full image in memory)
        const filePath = path.join(this.cacheDir, key);
        try {
          const data = await fsPromises.readFile(filePath, 'utf8');
          Log.debug(`Cache hit for ${imageIdentifier}`);
          return data;
        } catch {
          // File was deleted, remove from cache
          this.cache.del(key);
          Log.debug(`Cache file missing for ${imageIdentifier}`);
          return null;
        }
      }

      // Check disk cache directly
      const filePath = path.join(this.cacheDir, key);

      try {
        await fsPromises.access(filePath);
        const data = await fsPromises.readFile(filePath, 'utf8');
        // Store metadata in memory (not the full image)
        this.cache.set(key, true);
        Log.debug(`Disk cache hit for ${imageIdentifier}`);
        return data;
      } catch {
        Log.debug(`Cache miss for ${imageIdentifier}`);
        return null;
      }
    } catch (error) {
      Log.error(`Error getting from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Store image in cache
   */
  async set (imageIdentifier, imageData) {
    if (!this.cache) {
      return false;
    }

    try {
      const key = this.getCacheKey(imageIdentifier);
      const filePath = path.join(this.cacheDir, key);

      // Store metadata in memory (not the full image)
      this.cache.set(key, true);

      // Store on disk async
      const dataSize = Buffer.byteLength(imageData, 'utf8');
      await fsPromises.writeFile(filePath, imageData, 'utf8');

      this.currentCacheSize += dataSize;

      // Check if we need to evict old files (async, don't block)
      if (this.currentCacheSize > this.maxCacheSize) {
        // Run eviction in background
        this.evictOldFiles().catch(() => {
          // Errors are already logged in evictOldFiles
        });
      }

      Log.debug(`Cached image ${imageIdentifier} (${(dataSize / 1024 / 1024).toFixed(2)}MB)`);
      return true;
    } catch (error) {
      Log.error(`Error setting cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Pre-load images in the background
   */
  async preloadImages (images, downloadCallback) {
    if (!this.config.enableImageCache || !this.cache) {
      return;
    }

    // Add images to preload queue
    this.preloadQueue = images.filter((img) => img.isSynology).slice(0, this.config.imageCachePreloadCount || 10);

    Log.info(`Starting background preload of ${this.preloadQueue.length} images`);

    // Start preloading in background (non-blocking)
    this.processPreloadQueue(downloadCallback).catch((error) => {
      Log.error(`Preload queue error: ${error.message}`);
    });
  }

  /**
   * Process preload queue in background (with rate limiting for low-power devices)
   */
  async processPreloadQueue (downloadCallback) {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const image = this.preloadQueue.shift();

      // Check if already cached (quick metadata check)
      const key = this.getCacheKey(image.url || image.path);
      const cachedMeta = this.cache.get(key);

      if (!cachedMeta) {
        // Download and cache
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Preload timeout'));
            }, 30000);

            downloadCallback(image, async (imageData) => {
              clearTimeout(timeout);
              if (imageData) {
                await this.set(image.url || image.path, imageData);
                Log.debug(`Preloaded and cached: ${image.path}`);
              }

              resolve();
            });
          });

          // Configurable delay between downloads (default 500ms for low-power devices)
          await new Promise((resolve) => {
            setTimeout(resolve, this.preloadDelay);
          });
        } catch (error) {
          Log.error(`Error preloading image: ${error.message}`);
          // Continue with next image
        }
      } else {
        Log.debug(`Skipping preload, already cached: ${image.path}`);
      }
    }

    this.isPreloading = false;
    Log.info('Background preload complete');
  }

  /**
   * Clear all cache
   */
  async clear () {
    if (!this.cache) {
      return;
    }

    try {
      // Clear memory cache
      this.cache.flushAll();

      // Clear disk cache async
      try {
        const files = await fsPromises.readdir(this.cacheDir);

        // Delete files in batches to avoid overwhelming system
        const batchSize = 10;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          await Promise.all(batch.map(async (file) => {
            try {
              const filePath = path.join(this.cacheDir, file);
              await fsPromises.unlink(filePath);
            } catch {
              // File might already be deleted
            }
          }));
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      this.currentCacheSize = 0;
      Log.info('Cache cleared');
    } catch (error) {
      Log.error(`Error clearing cache: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats () {
    if (!this.cache) {
      return null;
    }

    try {
      // Cache manager doesn't provide direct stats, but we can estimate
      return {
        enabled: this.config.enableImageCache || false,
        maxSize: this.config.imageCacheMaxSize || 500,
        preloadCount: this.config.imageCachePreloadCount || 10,
      };
    } catch (error) {
      Log.error(`Error getting cache stats: ${error.message}`);
      return null;
    }
  }
}

module.exports = ImageCache;
