/**
 * ImageCache.test.ts
 *
 * Unit tests for ImageCache
 */

// Mock the logger module
jest.mock('./Logger');

// Mock node-cache
jest.mock('node-cache');

// Mock fs/promises
jest.mock('node:fs/promises');

import * as crypto from 'node:crypto';
import * as fsPromises from 'node:fs/promises';
import type { PhotoItem } from '../types';
import ImageCache from './ImageCache';
import Log from './Logger';
import NodeCache from 'node-cache';

type MockConfig = {
  enableImageCache: boolean;
  imageCacheMaxSize: number;
  imageCachePreloadCount: number;
  imageCachePreloadDelay: number;
};

describe('ImageCache', () => {
  let imageCache: ImageCache;
  let mockConfig: MockConfig;
  let mockCacheInstance: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    flushAll: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock config
    mockConfig = {
      enableImageCache: true,
      imageCacheMaxSize: 100, // 100MB for testing
      imageCachePreloadCount: 5,
      imageCachePreloadDelay: 100
    };

    // Setup mock NodeCache instance
    mockCacheInstance = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn()
    };

    (NodeCache as unknown as jest.Mock).mockImplementation(
      () => mockCacheInstance
    );

    // Setup default fs mock behaviors
    (fsPromises.mkdir as jest.Mock).mockResolvedValue(null);
    (fsPromises.readdir as jest.Mock).mockResolvedValue([]);
    (fsPromises.stat as jest.Mock).mockResolvedValue({
      isFile: () => true,
      size: 1024,
      mtime: new Date()
    });

    imageCache = new ImageCache(mockConfig as never);
  });

  // Constructor tests removed - testing private implementation details
  // The constructor behavior is tested implicitly through public method tests

  describe('initialize', () => {
    it('should create cache directory and initialize cache', async () => {
      const result = await imageCache.initialize();

      expect(result).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.image-cache'),
        { recursive: true }
      );
      expect(NodeCache).toHaveBeenCalledWith({
        stdTTL: 60 * 60 * 24 * 7,
        checkperiod: 600,
        useClones: false,
        maxKeys: 1000
      });
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Image cache initialized')
      );
    });

    it('should handle existing directory', async () => {
      const error = new Error('EEXIST') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      (fsPromises.mkdir as jest.Mock).mockRejectedValueOnce(error);

      const result = await imageCache.initialize();

      expect(result).toBe(true);
    });

    it('should handle initialization errors', async () => {
      (fsPromises.mkdir as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const result = await imageCache.initialize();

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize image cache')
      );
    });

    it('should calculate cache size after initialization', async () => {
      (fsPromises.readdir as jest.Mock).mockResolvedValue([
        'file1.jpg',
        'file2.jpg',
        'file3.jpg'
      ]);
      (fsPromises.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 1024 * 1024, // 1MB each
        mtime: new Date()
      });

      await imageCache.initialize();

      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Current cache size')
      );
    });

    it('should handle ENOENT error when calculating cache size on init', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      (fsPromises.readdir as jest.Mock).mockRejectedValueOnce(error);

      const result = await imageCache.initialize();

      expect(result).toBe(true);
      // Should not throw error
    });

    it('should handle errors when reading individual files during size calculation', async () => {
      (fsPromises.readdir as jest.Mock).mockResolvedValue([
        'file1.jpg',
        'file2.jpg'
      ]);
      (fsPromises.stat as jest.Mock)
        .mockResolvedValueOnce({
          isFile: () => true,
          size: 1024,
          mtime: new Date()
        })
        .mockRejectedValueOnce(new Error('File disappeared'));

      await imageCache.initialize();

      // Should complete without throwing
      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Current cache size')
      );
    });

    it('should handle non-file entries in cache directory', async () => {
      (fsPromises.readdir as jest.Mock).mockResolvedValue([
        'file1.jpg',
        'subdirectory'
      ]);
      (fsPromises.stat as jest.Mock)
        .mockResolvedValueOnce({
          isFile: () => true,
          size: 1024,
          mtime: new Date()
        })
        .mockResolvedValueOnce({
          isFile: () => false,
          size: 0,
          mtime: new Date()
        });

      await imageCache.initialize();

      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Current cache size')
      );
    });

    it('should handle errors during cache size calculation', async () => {
      (fsPromises.readdir as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      await imageCache.initialize();

      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Error calculating cache size')
      );
    });

    it('should process files in batches during size calculation', async () => {
      const files = Array.from({ length: 25 }, (_, i) => `file${i}.jpg`);
      (fsPromises.readdir as jest.Mock).mockResolvedValue(files);
      (fsPromises.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      });

      await imageCache.initialize();

      // Should have called stat for all files
      expect(fsPromises.stat).toHaveBeenCalledTimes(files.length);
    });
  });

  // calculateCacheSize tests removed - private method, tested through public API

  /* eslint-disable @typescript-eslint/no-explicit-any */
  describe('evictOldFiles', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should not evict when cache size is below max', async () => {
      // Set current cache size below max
      (imageCache as any).currentCacheSize = 50 * 1024 * 1024; // 50MB
      (imageCache as any).maxCacheSize = 100 * 1024 * 1024; // 100MB

      // Clear any previous calls from initialization
      jest.clearAllMocks();

      await imageCache.evictOldFiles();

      expect(fsPromises.readdir).not.toHaveBeenCalled();
    });

    it('should evict oldest files when cache exceeds max size', async () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-12-01');

      (imageCache as any).currentCacheSize = 150 * 1024 * 1024; // 150MB
      (imageCache as any).maxCacheSize = 100 * 1024 * 1024; // 100MB

      (fsPromises.readdir as jest.Mock).mockResolvedValue([
        'old-file.jpg',
        'new-file.jpg'
      ]);

      (fsPromises.stat as jest.Mock)
        .mockResolvedValueOnce({
          isFile: () => true,
          size: 30 * 1024 * 1024,
          mtime: oldDate
        })
        .mockResolvedValueOnce({
          isFile: () => true,
          size: 40 * 1024 * 1024,
          mtime: newDate
        });

      (fsPromises.unlink as jest.Mock).mockResolvedValue(null);

      await imageCache.evictOldFiles();

      expect(fsPromises.unlink).toHaveBeenCalled();
      expect(mockCacheInstance.del).toHaveBeenCalled();
      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Evicted')
      );
    });

    it('should stop evicting when cache size reaches target', async () => {
      (imageCache as any).currentCacheSize = 150 * 1024 * 1024;
      (imageCache as any).maxCacheSize = 100 * 1024 * 1024;

      const files = Array.from({ length: 10 }, (_, i) => `file${i}.jpg`);
      (fsPromises.readdir as jest.Mock).mockResolvedValue(files);

      (fsPromises.stat as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          isFile: () => true,
          size: 10 * 1024 * 1024,
          mtime: new Date()
        })
      );

      (fsPromises.unlink as jest.Mock).mockImplementation(() => {
        (imageCache as any).currentCacheSize -= 10 * 1024 * 1024;
        return Promise.resolve();
      });

      await imageCache.evictOldFiles();

      // Should stop when target size (90MB) is reached
      expect((imageCache as any).currentCacheSize).toBeLessThanOrEqual(
        90 * 1024 * 1024
      );
    });

    it('should handle errors when deleting files', async () => {
      (imageCache as any).currentCacheSize = 150 * 1024 * 1024;
      (imageCache as any).maxCacheSize = 100 * 1024 * 1024;

      (fsPromises.readdir as jest.Mock).mockResolvedValue(['file1.jpg']);
      (fsPromises.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 60 * 1024 * 1024,
        mtime: new Date()
      });

      (fsPromises.unlink as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      await imageCache.evictOldFiles();

      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Could not evict')
      );
    });

    it('should handle files that disappear during eviction', async () => {
      (imageCache as any).currentCacheSize = 150 * 1024 * 1024;
      (imageCache as any).maxCacheSize = 100 * 1024 * 1024;

      (fsPromises.readdir as jest.Mock).mockResolvedValue([
        'file1.jpg',
        'file2.jpg'
      ]);
      (fsPromises.stat as jest.Mock)
        .mockResolvedValueOnce({
          isFile: () => true,
          size: 30 * 1024 * 1024,
          mtime: new Date()
        })
        .mockRejectedValueOnce(new Error('ENOENT'));

      await imageCache.evictOldFiles();

      // Should handle gracefully
      expect(Log.error).not.toHaveBeenCalled();
    });

    it('should handle errors reading directory', async () => {
      (imageCache as any).currentCacheSize = 150 * 1024 * 1024;
      (imageCache as any).maxCacheSize = 100 * 1024 * 1024;

      (fsPromises.readdir as jest.Mock).mockRejectedValue(
        new Error('Read error')
      );

      await imageCache.evictOldFiles();

      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Error evicting files')
      );
    });
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  describe('getCacheKey', () => {
    it('should generate MD5 hash of image identifier', () => {
      const identifier = 'https://example.com/image.jpg';
      const expectedHash = crypto
        .createHash('md5')
        .update(identifier)
        .digest('hex');

      const key = imageCache.getCacheKey(identifier);

      expect(key).toBe(expectedHash);
    });

    it('should generate different keys for different identifiers', () => {
      const key1 = imageCache.getCacheKey('image1.jpg');
      const key2 = imageCache.getCacheKey('image2.jpg');

      expect(key1).not.toBe(key2);
    });

    it('should generate same key for same identifier', () => {
      const identifier = 'https://example.com/image.jpg';
      const key1 = imageCache.getCacheKey(identifier);
      const key2 = imageCache.getCacheKey(identifier);

      expect(key1).toBe(key2);
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should return null when cache is not initialized', async () => {
      const uninitializedCache = new ImageCache(mockConfig as never);
      const result = await uninitializedCache.get('image.jpg');

      expect(result).toBeNull();
    });

    it('should return cached data from memory cache', async () => {
      const imageData = 'base64encodeddata';
      mockCacheInstance.get.mockReturnValue(true);
      (fsPromises.readFile as jest.Mock).mockResolvedValue(imageData);

      const result = await imageCache.get('image.jpg');

      expect(result).toBe(imageData);
      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit')
      );
    });

    it('should return cached data from disk cache', async () => {
      const imageData = 'base64encodeddata';
      mockCacheInstance.get.mockReturnValue(null);
      (fsPromises.access as jest.Mock).mockResolvedValue(null);
      (fsPromises.readFile as jest.Mock).mockResolvedValue(imageData);

      const result = await imageCache.get('image.jpg');

      expect(result).toBe(imageData);
      expect(mockCacheInstance.set).toHaveBeenCalled();
      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Disk cache hit')
      );
    });

    it('should return null on cache miss', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      (fsPromises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await imageCache.get('image.jpg');

      expect(result).toBeNull();
      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss')
      );
    });

    it('should remove from memory cache if disk file is missing', async () => {
      mockCacheInstance.get.mockReturnValue(true);
      (fsPromises.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await imageCache.get('image.jpg');

      expect(result).toBeNull();
      expect(mockCacheInstance.del).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockCacheInstance.get.mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = await imageCache.get('image.jpg');

      expect(result).toBeNull();
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting from cache')
      );
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should return false when cache is not initialized', async () => {
      const uninitializedCache = new ImageCache(mockConfig as never);
      const result = await uninitializedCache.set('image.jpg', 'data');

      expect(result).toBe(false);
    });

    it('should store image data in cache', async () => {
      (fsPromises.writeFile as jest.Mock).mockResolvedValue(null);

      const result = await imageCache.set('image.jpg', 'imagedata');

      expect(result).toBe(true);
      expect(mockCacheInstance.set).toHaveBeenCalled();
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'imagedata',
        'utf8'
      );
    });

    it('should successfully cache image and retrieve it', async () => {
      (fsPromises.writeFile as jest.Mock).mockResolvedValue(null);
      const imageData = 'base64imagedata';

      const setResult = await imageCache.set('test-image.jpg', imageData);
      expect(setResult).toBe(true);

      // Verify data can be retrieved
      mockCacheInstance.get.mockReturnValue(true);
      (fsPromises.readFile as jest.Mock).mockResolvedValue(imageData);

      const getResult = await imageCache.get('test-image.jpg');
      expect(getResult).toBe(imageData);
    });

    it('should handle write errors', async () => {
      (fsPromises.writeFile as jest.Mock).mockRejectedValue(
        new Error('Disk full')
      );

      const result = await imageCache.set('image.jpg', 'data');

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Error setting cache')
      );
    });

    it('should trigger eviction when cache exceeds max size', async () => {
      (fsPromises.writeFile as jest.Mock).mockResolvedValue(null);

      // Set cache to near max
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (imageCache as any).currentCacheSize = 99 * 1024 * 1024;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (imageCache as any).maxCacheSize = 100 * 1024 * 1024;

      // Mock evictOldFiles
      const evictSpy = jest.spyOn(imageCache, 'evictOldFiles');
      evictSpy.mockResolvedValue();

      // Write 2MB file which will exceed max
      const largeData = 'x'.repeat(2 * 1024 * 1024);
      await imageCache.set('large-image.jpg', largeData);

      // Give time for async eviction to be called
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 10);
      });

      expect(evictSpy).toHaveBeenCalled();
    });
  });

  // evictOldFiles tests removed - private method, tested indirectly through set() behavior

  describe('preloadImages', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should not preload when cache is disabled', async () => {
      const disabledCache = new ImageCache({
        enableImageCache: false
      } as never);
      await disabledCache.initialize();

      const images: PhotoItem[] = [
        { url: 'image1.jpg', path: 'image1.jpg', created: 0, modified: 0 }
      ];
      const callback = jest.fn();

      await disabledCache.preloadImages(images, callback);

      // Callback should not be invoked for disabled cache
      expect(callback).not.toHaveBeenCalled();
    });

    it('should invoke callback for images to preload', async () => {
      mockCacheInstance.get.mockReturnValue(null); // Images not in cache
      (fsPromises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const images: PhotoItem[] = [
        { url: 'image1.jpg', path: 'image1.jpg', created: 0, modified: 0 },
        { url: 'image2.jpg', path: 'image2.jpg', created: 0, modified: 0 }
      ];
      const callback = jest.fn((image, cb) => {
        cb('imagedata');
      });

      (fsPromises.writeFile as jest.Mock).mockResolvedValue(null);

      await imageCache.preloadImages(images, callback);

      // Give time for async preloading to complete
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should respect configured preload count limit', async () => {
      const limitedCache = new ImageCache({
        enableImageCache: true,
        imageCachePreloadCount: 2,
        imageCachePreloadDelay: 10
      } as never);
      await limitedCache.initialize();

      mockCacheInstance.get.mockReturnValue(null);
      (fsPromises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const images: PhotoItem[] = Array.from({ length: 10 }, (_, i) => ({
        url: `image${i}.jpg`,
        path: `image${i}.jpg`,
        created: 0,
        modified: 0
      }));

      let callbackCount = 0;
      const callback = jest.fn((image, cb) => {
        callbackCount++;
        cb('imagedata');
      });

      (fsPromises.writeFile as jest.Mock).mockResolvedValue(null);

      await limitedCache.preloadImages(images, callback);

      // Give time for async preloading to complete
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 200);
      });

      // Should only preload up to the limit
      expect(callbackCount).toBeLessThanOrEqual(2);
    });

    it('should skip already cached images during preload', async () => {
      mockCacheInstance.get.mockReturnValue(true); // Image already cached

      const images: PhotoItem[] = [
        { url: 'image1.jpg', path: 'image1.jpg', created: 0, modified: 0 }
      ];
      const callback = jest.fn();

      await imageCache.preloadImages(images, callback);

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 200);
      });

      expect(callback).not.toHaveBeenCalled();
      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping preload, already cached')
      );
    });

    it('should filter out images without urls during preload', async () => {
      const images: PhotoItem[] = [
        { url: 'image1.jpg', path: 'image1.jpg', created: 0, modified: 0 },
        { url: '', path: 'image2.jpg', created: 0, modified: 0 },
        { path: 'image3.jpg', created: 0, modified: 0 } as PhotoItem
      ];

      mockCacheInstance.get.mockReturnValue(null);
      const callback = jest.fn((image, cb) => {
        cb('imagedata');
      });
      (fsPromises.writeFile as jest.Mock).mockResolvedValue(null);

      await imageCache.preloadImages(images, callback);

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 200);
      });

      // Should only process image with valid URL
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle preload timeout', async () => {
      jest.useFakeTimers();

      mockCacheInstance.get.mockReturnValue(null);

      const images: PhotoItem[] = [
        { url: 'image1.jpg', path: 'image1.jpg', created: 0, modified: 0 }
      ];

      // Callback that never calls the completion callback
      const callback = jest.fn();

      const preloadPromise = imageCache.preloadImages(images, callback);

      // Fast-forward time past the 30 second timeout
      jest.advanceTimersByTime(31000);

      await preloadPromise;

      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Error preloading image')
      );

      jest.useRealTimers();
    });

    it('should handle callback errors during preload', async () => {
      mockCacheInstance.get.mockReturnValue(null);

      const images: PhotoItem[] = [
        { url: 'image1.jpg', path: 'image1.jpg', created: 0, modified: 0 }
      ];

      const callback = jest.fn(() => {
        throw new Error('Callback error');
      });

      await imageCache.preloadImages(images, callback);

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 200);
      });

      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Error preloading image')
      );
    });

    it('should not start multiple preload processes simultaneously', async () => {
      mockCacheInstance.get.mockReturnValue(null);

      const images: PhotoItem[] = [
        { url: 'image1.jpg', path: 'image1.jpg', created: 0, modified: 0 }
      ];

      const callback = jest.fn((image, cb) => {
        // Delay the callback
        setTimeout(() => cb('imagedata'), 100);
      });

      (fsPromises.writeFile as jest.Mock).mockResolvedValue(null);

      // Start first preload
      imageCache.preloadImages(images, callback);

      // Wait for first to start processing
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 50);
      });

      // Second call should return immediately since isPreloading is true
      const startTime = Date.now();
      await imageCache.preloadImages(images, callback);
      const endTime = Date.now();

      // Second call should return quickly (not wait for processing)
      expect(endTime - startTime).toBeLessThan(10);

      // Wait for first preload to finish
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 200);
      });
    });

    it('should log completion message after preload finishes', async () => {
      mockCacheInstance.get.mockReturnValue(null);

      const images: PhotoItem[] = [
        { url: 'image1.jpg', path: 'image1.jpg', created: 0, modified: 0 }
      ];

      const callback = jest.fn((image, cb) => {
        cb('imagedata');
      });

      (fsPromises.writeFile as jest.Mock).mockResolvedValue(null);

      await imageCache.preloadImages(images, callback);

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 300);
      });

      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Background preload complete')
      );
    });
  });

  // processPreloadQueue tests removed - private method, tested through preloadImages()

  describe('clear', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should do nothing when cache is not initialized', async () => {
      const uninitializedCache = new ImageCache(mockConfig as never);

      await uninitializedCache.clear();

      expect(mockCacheInstance.flushAll).not.toHaveBeenCalled();
    });

    it('should clear cache and log success', async () => {
      (fsPromises.readdir as jest.Mock).mockResolvedValue([
        'file1.jpg',
        'file2.jpg'
      ]);
      (fsPromises.unlink as jest.Mock).mockResolvedValue(null);

      await imageCache.clear();

      expect(mockCacheInstance.flushAll).toHaveBeenCalled();
      expect(fsPromises.unlink).toHaveBeenCalledTimes(2);
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache cleared')
      );
    });

    it('should handle missing cache directory', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      (fsPromises.readdir as jest.Mock).mockRejectedValue(error);

      await imageCache.clear();

      expect(mockCacheInstance.flushAll).toHaveBeenCalled();
      // Cache should still be cleared even if directory doesn't exist
    });

    it('should handle file deletion errors gracefully', async () => {
      (fsPromises.readdir as jest.Mock).mockResolvedValue(['file1.jpg']);
      (fsPromises.unlink as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      await imageCache.clear();

      expect(mockCacheInstance.flushAll).toHaveBeenCalled();
    });

    it('should process files in batches during clear', async () => {
      const files = Array.from({ length: 25 }, (_, i) => `file${i}.jpg`);
      (fsPromises.readdir as jest.Mock).mockResolvedValue(files);
      (fsPromises.unlink as jest.Mock).mockResolvedValue(null);

      await imageCache.clear();

      expect(fsPromises.unlink).toHaveBeenCalledTimes(files.length);
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache cleared')
      );
    });

    it('should handle errors during clear operation', async () => {
      (fsPromises.readdir as jest.Mock).mockRejectedValue(
        new Error('Read error')
      );

      await imageCache.clear();

      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Error clearing cache')
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should return null when cache is not initialized', async () => {
      const uninitializedCache = new ImageCache(mockConfig as never);

      const stats = await uninitializedCache.getStats();

      expect(stats).toBeNull();
    });

    it('should return cache statistics', async () => {
      const stats = await imageCache.getStats();

      expect(stats).toEqual({
        enabled: true,
        maxSize: 100,
        preloadCount: 5
      });
    });

    it('should use default values when not configured', async () => {
      const defaultCache = new ImageCache({} as never);
      await defaultCache.initialize();

      const stats = await defaultCache.getStats();

      expect(stats).toEqual({
        enabled: false,
        maxSize: 500,
        preloadCount: 10
      });
    });
  });
});
