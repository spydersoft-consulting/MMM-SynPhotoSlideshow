/**
 * ImageCache.js
 *
 * Manages image caching with automatic size limits and pre-loading
 */

const NodeCache = require('node-cache');
const fs = require('node:fs');
const path = require('node:path');
const Log = require('../../../js/logger.js');
const crypto = require('node:crypto');

class ImageCache {
  constructor (config) {
    this.config = config;
    this.cache = null;
    this.cacheDir = null;
    this.preloadQueue = [];
    this.isPreloading = false;
    this.currentCacheSize = 0;
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
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, {recursive: true});
      }

      // Initialize in-memory cache for quick lookups
      // TTL of 7 days (in seconds)
      this.cache = new NodeCache({
        stdTTL: 60 * 60 * 24 * 7,
        checkperiod: 600,
        useClones: false
      });

      // Calculate current cache size
      this.calculateCacheSize();

      Log.info(`[MMM-SynPhotoSlideshow] Image cache initialized at ${this.cacheDir} with max size ${maxSizeMB}MB`);
      return true;
    } catch (error) {
      Log.error(`[MMM-SynPhotoSlideshow] Failed to initialize image cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate current cache size
   */
  calculateCacheSize () {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        this.currentCacheSize = 0;
        return;
      }

      let totalSize = 0;
      const files = fs.readdirSync(this.cacheDir);

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          totalSize += stats.size;
        }
      }

      this.currentCacheSize = totalSize;
      Log.debug(`[MMM-SynPhotoSlideshow] Current cache size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      Log.error(`[MMM-SynPhotoSlideshow] Error calculating cache size: ${error.message}`);
      this.currentCacheSize = 0;
    }
  }

  /**
   * Evict old files if cache is too large
   */
  async evictOldFiles () {
    if (this.currentCacheSize <= this.maxCacheSize) {
      return;
    }

    try {
      const files = fs.readdirSync(this.cacheDir);
      const fileStats = [];

      // Get file stats with modification time
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          fileStats.push({
            path: filePath,
            name: file,
            size: stats.size,
            mtime: stats.mtime
          });
        }
      }

      // Sort by modification time (oldest first)
      fileStats.sort((a, b) => a.mtime - b.mtime);

      // Remove oldest files until we're under the limit
      for (const file of fileStats) {
        if (this.currentCacheSize <= this.maxCacheSize * 0.9) {
          break; // Leave 10% headroom
        }

        fs.unlinkSync(file.path);
        this.cache.del(file.name);
        this.currentCacheSize -= file.size;
        Log.debug(`[MMM-SynPhotoSlideshow] Evicted ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      }
    } catch (error) {
      Log.error(`[MMM-SynPhotoSlideshow] Error evicting files: ${error.message}`);
    }
  }

  /**
   * Generate cache key from image URL or path
   */
  getCacheKey (imageIdentifier) {
    return crypto.createHash('md5').update(imageIdentifier).digest('hex');
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

      // Check memory cache first
      const memCached = this.cache.get(key);

      if (memCached) {
        Log.debug(`[MMM-SynPhotoSlideshow] Memory cache hit for ${imageIdentifier}`);
        return memCached;
      }

      // Check disk cache
      const filePath = path.join(this.cacheDir, key);

      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        // Store in memory cache for faster access next time
        this.cache.set(key, data);
        Log.debug(`[MMM-SynPhotoSlideshow] Disk cache hit for ${imageIdentifier}`);
        return data;
      }

      Log.debug(`[MMM-SynPhotoSlideshow] Cache miss for ${imageIdentifier}`);
      return null;
    } catch (error) {
      Log.error(`[MMM-SynPhotoSlideshow] Error getting from cache: ${error.message}`);
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

      // Store in memory cache
      this.cache.set(key, imageData);

      // Store on disk
      const dataSize = Buffer.byteLength(imageData, 'utf8');
      fs.writeFileSync(filePath, imageData, 'utf8');

      this.currentCacheSize += dataSize;

      // Check if we need to evict old files
      if (this.currentCacheSize > this.maxCacheSize) {
        await this.evictOldFiles();
      }

      Log.debug(`[MMM-SynPhotoSlideshow] Cached image ${imageIdentifier} (${(dataSize / 1024 / 1024).toFixed(2)}MB)`);
      return true;
    } catch (error) {
      Log.error(`[MMM-SynPhotoSlideshow] Error setting cache: ${error.message}`);
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

    Log.info(`[MMM-SynPhotoSlideshow] Starting background preload of ${this.preloadQueue.length} images`);

    // Start preloading in background
    this.processPreloadQueue(downloadCallback);
  }

  /**
   * Process preload queue in background
   */
  async processPreloadQueue (downloadCallback) {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const image = this.preloadQueue.shift();

      // Check if already cached
      const cached = await this.get(image.url || image.path);

      if (!cached) {
        // Download and cache
        try {
          await new Promise((resolve) => {
            downloadCallback(image, (imageData) => {
              if (imageData) {
                this.set(image.url || image.path, imageData);
                Log.debug(`[MMM-SynPhotoSlideshow] Preloaded and cached: ${image.path}`);
              }

              resolve();
            });
          });

          // Small delay between downloads to avoid overwhelming the system
          await new Promise((resolve) => {
            setTimeout(resolve, 100);
          });
        } catch (error) {
          Log.error(`[MMM-SynPhotoSlideshow] Error preloading image: ${error.message}`);
        }
      }
    }

    this.isPreloading = false;
    Log.info('[MMM-SynPhotoSlideshow] Background preload complete');
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

      // Clear disk cache
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);

        for (const file of files) {
          const filePath = path.join(this.cacheDir, file);
          fs.unlinkSync(filePath);
        }
      }

      this.currentCacheSize = 0;
      Log.info('[MMM-SynPhotoSlideshow] Cache cleared');
    } catch (error) {
      Log.error(`[MMM-SynPhotoSlideshow] Error clearing cache: ${error.message}`);
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
      Log.error(`[MMM-SynPhotoSlideshow] Error getting cache stats: ${error.message}`);
      return null;
    }
  }
}

module.exports = ImageCache;
