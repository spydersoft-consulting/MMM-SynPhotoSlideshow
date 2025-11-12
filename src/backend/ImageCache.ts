/**
 * ImageCache.ts
 *
 * Manages image caching with automatic size limits and pre-loading
 */

import NodeCache from 'node-cache';
import crypto from 'node:crypto';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import Log from './Logger';
import type { ModuleConfig, PhotoItem } from '../types';

interface FileStats {
  path: string;
  name: string;
  size: number;
  mtime: Date;
}

type ImageDownloadCallback = (
  image: PhotoItem,
  callback: (imageData: string | null) => void
) => void;

class ImageCache {
  private readonly config: Partial<ModuleConfig>;

  private cache: NodeCache | null = null;

  private cacheDir: string | null = null;

  private preloadQueue: PhotoItem[] = [];

  private isPreloading = false;

  private currentCacheSize = 0;

  private maxCacheSize = 0;

  private readonly preloadDelay: number;

  constructor(config: Partial<ModuleConfig>) {
    this.config = config;
    this.preloadDelay = config.imageCachePreloadDelay || 500;
  }

  /**
   * Initialize the cache
   */
  async initialize(): Promise<boolean> {
    try {
      this.cacheDir = path.join(__dirname, '..', '..', '.image-cache');
      const maxSizeMB = this.config.imageCacheMaxSize || 500;
      this.maxCacheSize = maxSizeMB * 1024 * 1024;

      try {
        await fsPromises.mkdir(this.cacheDir, { recursive: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
      }

      this.cache = new NodeCache({
        stdTTL: 60 * 60 * 24 * 7,
        checkperiod: 600,
        useClones: false,
        maxKeys: 1000
      });

      await this.calculateCacheSize();

      Log.info(
        `Image cache initialized at ${this.cacheDir} with max size ${maxSizeMB}MB`
      );
      return true;
    } catch (error) {
      Log.error(
        `Failed to initialize image cache: ${(error as Error).message}`
      );
      return false;
    }
  }

  /**
   * Calculate current cache size
   */
  private async calculateCacheSize(): Promise<void> {
    try {
      let totalSize = 0;

      if (!this.cacheDir) return;

      try {
        const files = await fsPromises.readdir(this.cacheDir);

        const batchSize = 10;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          const sizes = await Promise.all(
            batch.map(async (file) => {
              try {
                const filePath = path.join(this.cacheDir!, file);
                const stats = await fsPromises.stat(filePath);
                return stats.isFile() ? stats.size : 0;
              } catch {
                return 0;
              }
            })
          );
          totalSize += sizes.reduce((sum, size) => sum + size, 0);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      this.currentCacheSize = totalSize;
      Log.debug(
        `Current cache size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
      );
    } catch (error) {
      Log.error(`Error calculating cache size: ${(error as Error).message}`);
      this.currentCacheSize = 0;
    }
  }

  /**
   * Evict old files if cache is too large
   */
  async evictOldFiles(): Promise<void> {
    if (
      this.currentCacheSize <= this.maxCacheSize ||
      !this.cacheDir ||
      !this.cache
    ) {
      return;
    }

    try {
      const files = await fsPromises.readdir(this.cacheDir);
      const fileStats: FileStats[] = [];

      const statsPromises = files.map(async (file) => {
        try {
          const filePath = path.join(this.cacheDir!, file);
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
      fileStats.push(
        ...(allStats.filter((stat) => stat !== null) as FileStats[])
      );

      fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      const targetSize = this.maxCacheSize * 0.9;
      for (const file of fileStats) {
        if (this.currentCacheSize <= targetSize) {
          break;
        }

        try {
          await fsPromises.unlink(file.path);
          this.cache.del(file.name);
          this.currentCacheSize -= file.size;
          Log.debug(
            `Evicted ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
          );
        } catch (error) {
          Log.debug(
            `Could not evict ${file.name}: ${(error as Error).message}`
          );
        }
      }
    } catch (error) {
      Log.error(`Error evicting files: ${(error as Error).message}`);
    }
  }

  /**
   * Generate cache key from image URL or path
   */
  getCacheKey(imageIdentifier: string): string {
    return crypto.createHash('md5').update(imageIdentifier).digest('hex');
  }

  /**
   * Get image from cache
   */
  async get(imageIdentifier: string): Promise<string | null> {
    if (!this.cache || !this.cacheDir) {
      return null;
    }

    try {
      const key = this.getCacheKey(imageIdentifier);
      const cachedMeta = this.cache.get(key);

      if (cachedMeta) {
        const filePath = path.join(this.cacheDir, key);
        try {
          const data = await fsPromises.readFile(filePath, 'utf8');
          Log.debug(`Cache hit for ${imageIdentifier}`);
          return data;
        } catch {
          this.cache.del(key);
          Log.debug(`Cache file missing for ${imageIdentifier}`);
          return null;
        }
      }

      const filePath = path.join(this.cacheDir, key);
      try {
        await fsPromises.access(filePath);
        const data = await fsPromises.readFile(filePath, 'utf8');
        this.cache.set(key, true);
        Log.debug(`Disk cache hit for ${imageIdentifier}`);
        return data;
      } catch {
        Log.debug(`Cache miss for ${imageIdentifier}`);
        return null;
      }
    } catch (error) {
      Log.error(`Error getting from cache: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Store image in cache
   */
  async set(imageIdentifier: string, imageData: string): Promise<boolean> {
    if (!this.cache || !this.cacheDir) {
      return false;
    }

    try {
      const key = this.getCacheKey(imageIdentifier);
      const filePath = path.join(this.cacheDir, key);

      this.cache.set(key, true);

      const dataSize = Buffer.byteLength(imageData, 'utf8');
      await fsPromises.writeFile(filePath, imageData, 'utf8');

      this.currentCacheSize += dataSize;

      if (this.currentCacheSize > this.maxCacheSize) {
        this.evictOldFiles().catch((error) => {
          Log.error(`Error evicting old files: ${(error as Error).message}`);
        });
      }

      Log.debug(
        `Cached image ${imageIdentifier} (${(dataSize / 1024 / 1024).toFixed(2)}MB)`
      );
      return true;
    } catch (error) {
      Log.error(`Error setting cache: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Pre-load images in the background
   */
  async preloadImages(
    images: PhotoItem[],
    downloadCallback: ImageDownloadCallback
  ): Promise<void> {
    if (!this.config.enableImageCache || !this.cache) {
      return;
    }

    this.preloadQueue = images
      .filter((img) => img.url)
      .slice(0, this.config.imageCachePreloadCount || 10);

    Log.info(
      `Starting background preload of ${this.preloadQueue.length} images`
    );

    this.processPreloadQueue(downloadCallback).catch((error) => {
      Log.error(`Error processing preload queue: ${(error as Error).message}`);
    });
  }

  /**
   * Process preload queue in background
   */
  private async processPreloadQueue(
    downloadCallback: ImageDownloadCallback
  ): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const image = this.preloadQueue.shift();
      if (!image) continue;

      const key = this.getCacheKey(image.url || image.path);
      const cachedMeta = this.cache?.get(key);

      if (cachedMeta) {
        Log.debug(`Skipping preload, already cached: ${image.path}`);
      } else {
        try {
          await new Promise<void>((resolve, reject) => {
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

          await new Promise((resolve) => {
            setTimeout(resolve, this.preloadDelay);
          });
        } catch (error) {
          Log.error(`Error preloading image: ${(error as Error).message}`);
        }
      }
    }

    this.isPreloading = false;
    Log.info('Background preload complete');
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.cache || !this.cacheDir) {
      return;
    }

    try {
      this.cache.flushAll();

      try {
        const files = await fsPromises.readdir(this.cacheDir);

        const batchSize = 10;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (file) => {
              try {
                const filePath = path.join(this.cacheDir!, file);
                await fsPromises.unlink(filePath);
              } catch {
                // File might already be deleted
              }
            })
          );
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      this.currentCacheSize = 0;
      Log.info('Cache cleared');
    } catch (error) {
      Log.error(`Error clearing cache: ${(error as Error).message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    maxSize: number;
    preloadCount: number;
  } | null> {
    if (!this.cache) {
      return null;
    }

    try {
      return {
        enabled: this.config.enableImageCache || false,
        maxSize: this.config.imageCacheMaxSize || 500,
        preloadCount: this.config.imageCachePreloadCount || 10
      };
    } catch (error) {
      Log.error(`Error getting cache stats: ${(error as Error).message}`);
      return null;
    }
  }
}

export default ImageCache;
