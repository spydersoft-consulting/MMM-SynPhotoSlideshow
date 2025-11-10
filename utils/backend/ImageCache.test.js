/**
 * ImageCache.test.js
 *
 * Unit tests for ImageCache
 */

const fsPromises = require('node:fs/promises');
const crypto = require('node:crypto');

// Mock the logger module
jest.mock('./Logger.js');

// Mock node-cache
jest.mock('node-cache');
const NodeCache = require('node-cache');

// Mock fs/promises
jest.mock('node:fs/promises');

// Import after mocks
const ImageCache = require('./ImageCache');
const Log = require('./Logger.js');

describe('ImageCache', () => {
  let imageCache;
  let mockConfig;
  let mockCacheInstance;

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

    NodeCache.mockImplementation(() => mockCacheInstance);

    // Setup default fs mock behaviors
    fsPromises.mkdir.mockResolvedValue(null);
    fsPromises.readdir.mockResolvedValue([]);
    fsPromises.stat.mockResolvedValue({
      isFile: () => true,
      size: 1024,
      mtime: new Date()
    });

    imageCache = new ImageCache(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(imageCache.config).toBe(mockConfig);
      expect(imageCache.cache).toBeNull();
      expect(imageCache.cacheDir).toBeNull();
      expect(imageCache.preloadQueue).toEqual([]);
      expect(imageCache.isPreloading).toBe(false);
      expect(imageCache.currentCacheSize).toBe(0);
    });

    it('should use default preload delay if not specified', () => {
      const cache = new ImageCache({});
      expect(cache.preloadDelay).toBe(500);
    });

    it('should use configured preload delay', () => {
      expect(imageCache.preloadDelay).toBe(100);
    });
  });

  describe('initialize', () => {
    it('should create cache directory and initialize cache', async () => {
      const result = await imageCache.initialize();

      expect(result).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.image-cache'),
        {recursive: true}
      );
      expect(NodeCache).toHaveBeenCalledWith({
        stdTTL: 60 * 60 * 24 * 7,
        checkperiod: 600,
        useClones: false,
        maxKeys: 1000
      });
      expect(imageCache.cache).toBe(mockCacheInstance);
      expect(Log.info).toHaveBeenCalledWith(expect.stringContaining('Image cache initialized'));
    });

    it('should handle existing directory', async () => {
      const error = new Error('EEXIST');
      error.code = 'EEXIST';
      fsPromises.mkdir.mockRejectedValueOnce(error);

      const result = await imageCache.initialize();

      expect(result).toBe(true);
    });

    it('should handle initialization errors', async () => {
      fsPromises.mkdir.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await imageCache.initialize();

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize image cache'));
    });

    it('should calculate cache size on initialization', async () => {
      fsPromises.readdir.mockResolvedValueOnce(['file1.jpg', 'file2.jpg']);
      fsPromises.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024 * 1024 // 1MB
      });

      await imageCache.initialize();

      expect(imageCache.currentCacheSize).toBe(2 * 1024 * 1024); // 2MB
    });
  });

  describe('calculateCacheSize', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should calculate total size of cached files', async () => {
      fsPromises.readdir.mockResolvedValueOnce(['file1.jpg', 'file2.jpg', 'file3.jpg']);
      fsPromises.stat.mockResolvedValueOnce({
        isFile: () => true,
        size: 1024 * 1024
      }).mockResolvedValueOnce({
        isFile: () => true,
        size: 2 * 1024 * 1024
      })
        .mockResolvedValueOnce({
          isFile: () => true,
          size: 512 * 1024
        });

      await imageCache.calculateCacheSize();

      expect(imageCache.currentCacheSize).toBe(3.5 * 1024 * 1024);
    });

    it('should handle missing cache directory', async () => {
      const error = new Error('ENOENT');
      error.code = 'ENOENT';
      fsPromises.readdir.mockRejectedValueOnce(error);

      await imageCache.calculateCacheSize();

      expect(imageCache.currentCacheSize).toBe(0);
    });

    it('should skip non-file entries', async () => {
      fsPromises.readdir.mockResolvedValueOnce(['file1.jpg', 'subdir']);
      fsPromises.stat.mockResolvedValueOnce({
        isFile: () => true,
        size: 1024
      }).mockResolvedValueOnce({
        isFile: () => false,
        size: 0
      });

      await imageCache.calculateCacheSize();

      expect(imageCache.currentCacheSize).toBe(1024);
    });

    it('should handle stat errors gracefully', async () => {
      fsPromises.readdir.mockResolvedValueOnce(['file1.jpg', 'file2.jpg']);
      fsPromises.stat.mockResolvedValueOnce({
        isFile: () => true,
        size: 1024
      }).mockRejectedValueOnce(new Error('Permission denied'));

      await imageCache.calculateCacheSize();

      expect(imageCache.currentCacheSize).toBe(1024);
    });
  });

  describe('getCacheKey', () => {
    it('should generate MD5 hash of image identifier', () => {
      const identifier = 'https://example.com/image.jpg';
      const expectedHash = crypto.createHash('md5').update(identifier)
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
      imageCache.cache = null;
      const result = await imageCache.get('image.jpg');

      expect(result).toBeNull();
    });

    it('should return cached data from memory cache', async () => {
      const imageData = 'base64encodeddata';
      mockCacheInstance.get.mockReturnValue(true);
      fsPromises.readFile.mockResolvedValue(imageData);

      const result = await imageCache.get('image.jpg');

      expect(result).toBe(imageData);
      expect(Log.debug).toHaveBeenCalledWith(expect.stringContaining('Cache hit'));
    });

    it('should return cached data from disk cache', async () => {
      const imageData = 'base64encodeddata';
      mockCacheInstance.get.mockReturnValue(null);
      fsPromises.access.mockResolvedValue(null);
      fsPromises.readFile.mockResolvedValue(imageData);

      const result = await imageCache.get('image.jpg');

      expect(result).toBe(imageData);
      expect(mockCacheInstance.set).toHaveBeenCalled();
      expect(Log.debug).toHaveBeenCalledWith(expect.stringContaining('Disk cache hit'));
    });

    it('should return null on cache miss', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      fsPromises.access.mockRejectedValue(new Error('ENOENT'));

      const result = await imageCache.get('image.jpg');

      expect(result).toBeNull();
      expect(Log.debug).toHaveBeenCalledWith(expect.stringContaining('Cache miss'));
    });

    it('should remove from memory cache if disk file is missing', async () => {
      mockCacheInstance.get.mockReturnValue(true);
      fsPromises.readFile.mockRejectedValue(new Error('ENOENT'));

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
      expect(Log.error).toHaveBeenCalledWith(expect.stringContaining('Error getting from cache'));
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should return false when cache is not initialized', async () => {
      imageCache.cache = null;
      const result = await imageCache.set('image.jpg', 'data');

      expect(result).toBe(false);
    });

    it('should store image data in cache', async () => {
      fsPromises.writeFile.mockResolvedValue(null);

      const result = await imageCache.set('image.jpg', 'imagedata');

      expect(result).toBe(true);
      expect(mockCacheInstance.set).toHaveBeenCalled();
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        'imagedata',
        'utf8'
      );
    });

    it('should update current cache size', async () => {
      fsPromises.writeFile.mockResolvedValue(null);
      const initialSize = imageCache.currentCacheSize;
      const imageData = 'x'.repeat(1024); // 1KB

      await imageCache.set('image.jpg', imageData);

      expect(imageCache.currentCacheSize).toBeGreaterThan(initialSize);
    });

    it('should trigger eviction when cache size exceeds max', async () => {
      fsPromises.writeFile.mockResolvedValue(null);
      imageCache.currentCacheSize = mockConfig.imageCacheMaxSize * 1024 * 1024;
      const evictSpy = jest.spyOn(imageCache, 'evictOldFiles').mockResolvedValue(null);

      await imageCache.set('image.jpg', 'data');

      // Wait a bit for async eviction to be triggered
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      expect(evictSpy).toHaveBeenCalled();
    });

    it('should handle write errors', async () => {
      fsPromises.writeFile.mockRejectedValue(new Error('Disk full'));

      const result = await imageCache.set('image.jpg', 'data');

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(expect.stringContaining('Error setting cache'));
    });
  });

  describe('evictOldFiles', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should not evict if cache size is under limit', async () => {
      // Clear any calls from initialization
      fsPromises.readdir.mockClear();

      imageCache.currentCacheSize = 50 * 1024 * 1024; // 50MB (under 100MB limit)

      await imageCache.evictOldFiles();

      expect(fsPromises.readdir).not.toHaveBeenCalled();
    });

    it('should evict oldest files when cache exceeds limit', async () => {
      imageCache.currentCacheSize = 150 * 1024 * 1024; // 150MB (over 100MB limit)

      const oldFile = {
        isFile: () => true,
        size: 30 * 1024 * 1024,
        mtime: new Date('2024-01-01')
      };
      const newFile = {
        isFile: () => true,
        size: 30 * 1024 * 1024,
        mtime: new Date('2024-12-01')
      };

      fsPromises.readdir.mockResolvedValue(['old.jpg', 'new.jpg']);
      fsPromises.stat.mockResolvedValueOnce(oldFile).mockResolvedValueOnce(newFile);
      fsPromises.unlink.mockResolvedValue(null);

      await imageCache.evictOldFiles();

      expect(fsPromises.unlink).toHaveBeenCalled();
      expect(mockCacheInstance.del).toHaveBeenCalled();
      expect(imageCache.currentCacheSize).toBeLessThan(150 * 1024 * 1024);
    });

    it('should handle eviction errors gracefully', async () => {
      imageCache.currentCacheSize = 150 * 1024 * 1024;
      fsPromises.readdir.mockRejectedValue(new Error('Read error'));

      await imageCache.evictOldFiles();

      expect(Log.error).toHaveBeenCalledWith(expect.stringContaining('Error evicting files'));
    });

    it('should skip non-file entries during eviction', async () => {
      imageCache.currentCacheSize = 150 * 1024 * 1024;

      fsPromises.readdir.mockResolvedValue(['file.jpg', 'directory']);
      fsPromises.stat.mockResolvedValueOnce({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      }).mockResolvedValueOnce({
        isFile: () => false,
        size: 0,
        mtime: new Date()
      });

      await imageCache.evictOldFiles();

      // Should only process the file, not the directory
      expect(fsPromises.unlink).toHaveBeenCalledTimes(1);
    });
  });

  describe('preloadImages', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should not preload when cache is disabled', async () => {
      imageCache.config.enableImageCache = false;
      const images = [
        {isSynology: true,
          url: 'image1.jpg'}
      ];
      const callback = jest.fn();

      await imageCache.preloadImages(images, callback);

      expect(imageCache.preloadQueue).toEqual([]);
    });

    it('should add images to preload queue', async () => {
      const images = [
        {isSynology: true,
          url: 'image1.jpg'},
        {isSynology: true,
          url: 'image2.jpg'},
        {isSynology: false,
          url: 'image3.jpg'} // Should be filtered out
      ];
      const callback = jest.fn();

      const processSpy = jest.spyOn(imageCache, 'processPreloadQueue').mockResolvedValue(null);

      await imageCache.preloadImages(images, callback);

      expect(imageCache.preloadQueue).toHaveLength(2);
      expect(imageCache.preloadQueue.every((img) => img.isSynology)).toBe(true);
      expect(processSpy).toHaveBeenCalled();
    });

    it('should limit preload queue to configured count', async () => {
      mockConfig.imageCachePreloadCount = 3;
      const images = Array.from({length: 10}, (_, i) => ({
        isSynology: true,
        url: `image${i}.jpg`
      }));
      const callback = jest.fn();

      jest.spyOn(imageCache, 'processPreloadQueue').mockResolvedValue(null);

      await imageCache.preloadImages(images, callback);

      expect(imageCache.preloadQueue).toHaveLength(3);
    });
  });

  describe('processPreloadQueue', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should not process if already preloading', async () => {
      imageCache.isPreloading = true;
      imageCache.preloadQueue = [{url: 'image.jpg'}];
      const callback = jest.fn();

      await imageCache.processPreloadQueue(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not process if queue is empty', async () => {
      imageCache.preloadQueue = [];
      const callback = jest.fn();

      await imageCache.processPreloadQueue(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should skip already cached images', async () => {
      mockCacheInstance.get.mockReturnValue(true);
      imageCache.preloadQueue = [
        {url: 'image.jpg',
          path: 'image.jpg'}
      ];
      const callback = jest.fn();

      await imageCache.processPreloadQueue(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(imageCache.isPreloading).toBe(false);
    });

    it('should download and cache uncached images', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      imageCache.preloadQueue = [
        {url: 'image.jpg',
          path: 'image.jpg'}
      ];

      const callback = jest.fn((image, cb) => {
        cb('imagedata');
      });

      const setSpy = jest.spyOn(imageCache, 'set').mockResolvedValue(true);

      await imageCache.processPreloadQueue(callback);

      expect(callback).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalledWith('image.jpg', 'imagedata');
      expect(imageCache.isPreloading).toBe(false);
    });

    it('should handle download timeouts', async () => {
      mockCacheInstance.get.mockReturnValue(null);
      imageCache.preloadQueue = [
        {url: 'image.jpg',
          path: 'image.jpg'}
      ];

      const callback = jest.fn(() => {
        // Never calls the callback
      });

      jest.useFakeTimers();

      const promise = imageCache.processPreloadQueue(callback);

      jest.advanceTimersByTime(31000);
      await promise;

      expect(Log.error).toHaveBeenCalledWith(expect.stringContaining('Error preloading image'));

      jest.useRealTimers();
    });

    it(
      'should continue processing on error',
      async () => {
        mockCacheInstance.get.mockReturnValue(null);
        imageCache.preloadQueue = [
          {url: 'image1.jpg',
            path: 'image1.jpg'},
          {url: 'image2.jpg',
            path: 'image2.jpg'}
        ];

        let callCount = 0;
        const callback = jest.fn((image, cb) => {
          callCount++;
          if (image.url === 'image1.jpg') {
            // Don't call callback to simulate timeout
            // The processPreloadQueue will handle the timeout
          } else {
            cb('imagedata');
          }
        });

        const setSpy = jest.spyOn(imageCache, 'set').mockResolvedValue(true);

        await imageCache.processPreloadQueue(callback);

        // The first image should timeout and continue to second
        expect(setSpy).toHaveBeenCalledWith('image2.jpg', 'imagedata');
        expect(callCount).toBe(2);
      },
      35000
    ); // 35 second timeout for this test
  });

  describe('clear', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should return early when cache is not initialized', async () => {
      imageCache.cache = null;

      await imageCache.clear();

      expect(mockCacheInstance.flushAll).not.toHaveBeenCalled();
    });

    it('should clear memory and disk cache', async () => {
      fsPromises.readdir.mockResolvedValue(['file1.jpg', 'file2.jpg']);
      fsPromises.unlink.mockResolvedValue(null);

      await imageCache.clear();

      expect(mockCacheInstance.flushAll).toHaveBeenCalled();
      expect(fsPromises.unlink).toHaveBeenCalledTimes(2);
      expect(imageCache.currentCacheSize).toBe(0);
      expect(Log.info).toHaveBeenCalledWith(expect.stringContaining('Cache cleared'));
    });

    it('should handle missing cache directory', async () => {
      const error = new Error('ENOENT');
      error.code = 'ENOENT';
      fsPromises.readdir.mockRejectedValue(error);

      await imageCache.clear();

      expect(mockCacheInstance.flushAll).toHaveBeenCalled();
      expect(imageCache.currentCacheSize).toBe(0);
    });

    it('should handle file deletion errors gracefully', async () => {
      fsPromises.readdir.mockResolvedValue(['file1.jpg']);
      fsPromises.unlink.mockRejectedValue(new Error('Permission denied'));

      await imageCache.clear();

      expect(mockCacheInstance.flushAll).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await imageCache.initialize();
    });

    it('should return null when cache is not initialized', async () => {
      imageCache.cache = null;

      const stats = await imageCache.getStats();

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
      imageCache.config = {};

      const stats = await imageCache.getStats();

      expect(stats).toEqual({
        enabled: false,
        maxSize: 500,
        preloadCount: 10
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock the config access to throw an error
      Object.defineProperty(imageCache, 'config', {
        get: () => {
          throw new Error('Stats error');
        }
      });

      const stats = await imageCache.getStats();

      expect(stats).toBeNull();
      expect(Log.error).toHaveBeenCalledWith(expect.stringContaining('Error getting cache stats'));
    });
  });
});
