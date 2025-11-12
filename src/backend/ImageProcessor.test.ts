/**
 * ImageProcessor.test.ts
 *
 * Unit tests for ImageProcessor
 */

// Mock the Logger
jest.mock('./Logger');
import Log from './Logger';

// Mock sharp
jest.mock('sharp');
import sharp from 'sharp';

// Mock node:fs/promises
jest.mock('node:fs/promises');
import * as fsPromises from 'node:fs/promises';

import ImageProcessor from './ImageProcessor';
import type ImageCache from './ImageCache';
import type SynologyPhotosClient from './SynologyPhotosClient';

describe('ImageProcessor', () => {
  let processor: ImageProcessor;
  let mockConfig: {
    maxWidth: number;
    maxHeight: number;
    resizeImages: boolean;
    enableImageCache: boolean;
  };
  let mockImageCache: jest.Mocked<ImageCache>;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default config
    mockConfig = {
      maxWidth: 1920,
      maxHeight: 1080,
      resizeImages: true,
      enableImageCache: true
    };

    // Mock callback
    mockCallback = jest.fn();

    // Mock image cache
    mockImageCache = {
      get: jest.fn(),
      set: jest.fn()
    } as unknown as jest.Mocked<ImageCache>;

    processor = new ImageProcessor(mockConfig as never, mockImageCache);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect((processor as unknown as { config: unknown }).config).toBe(
        mockConfig
      );
    });

    it('should initialize with imageCache', () => {
      expect((processor as unknown as { imageCache: unknown }).imageCache).toBe(
        mockImageCache
      );
    });

    it('should handle null imageCache', () => {
      const processorWithoutCache = new ImageProcessor(
        mockConfig as never,
        null
      );

      expect(
        (processorWithoutCache as unknown as { imageCache: unknown }).imageCache
      ).toBeNull();
    });

    it('should handle undefined imageCache', () => {
      const processorWithoutCache = new ImageProcessor(mockConfig as never);

      expect(
        (processorWithoutCache as unknown as { imageCache: unknown }).imageCache
      ).toBeNull();
    });
  });

  describe('resizeImage', () => {
    let mockSharpInstance: {
      rotate: jest.Mock;
      resize: jest.Mock;
      jpeg: jest.Mock;
      toBuffer: jest.Mock;
    };

    beforeEach(() => {
      // Create a mock chain for sharp
      mockSharpInstance = {
        rotate: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn()
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);
    });

    it('should log resize dimensions', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('test'));

      await (
        processor as unknown as {
          resizeImage: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).resizeImage('/path/to/image.jpg', mockCallback);

      expect(Log.log).toHaveBeenCalledWith('Resizing image to max: 1920x1080');
    });

    it('should call sharp with input path', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('test'));

      await (
        processor as unknown as {
          resizeImage: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).resizeImage('/path/to/image.jpg', mockCallback);

      expect(sharp).toHaveBeenCalledWith('/path/to/image.jpg');
    });

    it('should rotate image', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('test'));

      await (
        processor as unknown as {
          resizeImage: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).resizeImage('/path/to/image.jpg', mockCallback);

      expect(mockSharpInstance.rotate).toHaveBeenCalled();
    });

    it('should resize with correct dimensions', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('test'));

      await (
        processor as unknown as {
          resizeImage: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).resizeImage('/path/to/image.jpg', mockCallback);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 1920,
        height: 1080,
        fit: 'inside'
      });
    });

    it('should use JPEG format with quality settings', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('test'));

      await (
        processor as unknown as {
          resizeImage: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).resizeImage('/path/to/image.jpg', mockCallback);

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 80,
        progressive: true,
        mozjpeg: true
      });
    });

    it('should convert buffer to base64 data URL', async () => {
      const testBuffer = Buffer.from('test-image-data');
      mockSharpInstance.toBuffer.mockResolvedValue(testBuffer);

      await (
        processor as unknown as {
          resizeImage: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).resizeImage('/path/to/image.jpg', mockCallback);

      const expectedDataUrl = `data:image/jpg;base64,${testBuffer.toString('base64')}`;
      expect(mockCallback).toHaveBeenCalledWith(expectedDataUrl);
    });

    it('should log completion', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('test'));

      await (
        processor as unknown as {
          resizeImage: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).resizeImage('/path/to/image.jpg', mockCallback);

      expect(Log.log).toHaveBeenCalledWith('Resizing complete');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Sharp processing failed');
      mockSharpInstance.toBuffer.mockRejectedValue(error);

      await (
        processor as unknown as {
          resizeImage: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).resizeImage('/path/to/image.jpg', mockCallback);

      expect(Log.error).toHaveBeenCalledWith('Error resizing image:', error);
      expect(mockCallback).toHaveBeenCalledWith(null);
    });

    it('should parse maxWidth as integer', async () => {
      mockConfig.maxWidth = '2560' as unknown as number;
      mockConfig.maxHeight = '1440' as unknown as number;
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('test'));

      await (
        processor as unknown as {
          resizeImage: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).resizeImage('/path/to/image.jpg', mockCallback);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 2560,
        height: 1440,
        fit: 'inside'
      });
    });
  });

  describe('readFileRaw', () => {
    it('should read file using fs promises', async () => {
      const testBuffer = Buffer.from('test-image-data');
      (fsPromises.readFile as jest.Mock).mockResolvedValue(testBuffer);

      await (
        processor as unknown as {
          readFileRaw: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).readFileRaw('/path/to/image.jpg', mockCallback);

      expect(fsPromises.readFile).toHaveBeenCalledWith('/path/to/image.jpg');
    });

    it('should extract file extension', async () => {
      const testBuffer = Buffer.from('test-image-data');
      (fsPromises.readFile as jest.Mock).mockResolvedValue(testBuffer);

      await (
        processor as unknown as {
          readFileRaw: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).readFileRaw('/path/to/image.png', mockCallback);

      const expectedDataUrl = `data:image/png;base64,${testBuffer.toString('base64')}`;
      expect(mockCallback).toHaveBeenCalledWith(expectedDataUrl);
    });

    it('should create data URL with correct format', async () => {
      const testBuffer = Buffer.from('test-image-data');
      (fsPromises.readFile as jest.Mock).mockResolvedValue(testBuffer);

      await (
        processor as unknown as {
          readFileRaw: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).readFileRaw('/path/to/image.jpg', mockCallback);

      const expectedDataUrl = `data:image/jpg;base64,${testBuffer.toString('base64')}`;
      expect(mockCallback).toHaveBeenCalledWith(expectedDataUrl);
    });

    it('should log completion', async () => {
      (fsPromises.readFile as jest.Mock).mockResolvedValue(Buffer.from('test'));

      await (
        processor as unknown as {
          readFileRaw: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).readFileRaw('/path/to/image.jpg', mockCallback);

      expect(Log.log).toHaveBeenCalledWith('File read complete');
    });

    it('should handle read errors', async () => {
      const error = new Error('File not found');
      (fsPromises.readFile as jest.Mock).mockRejectedValue(error);

      await (
        processor as unknown as {
          readFileRaw: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).readFileRaw('/path/to/missing.jpg', mockCallback);

      expect(Log.error).toHaveBeenCalledWith('Error reading file:', error);
      expect(mockCallback).toHaveBeenCalledWith(null);
    });

    it('should handle different file extensions', async () => {
      const testBuffer = Buffer.from('test');
      (fsPromises.readFile as jest.Mock).mockResolvedValue(testBuffer);

      await (
        processor as unknown as {
          readFileRaw: (
            _path: string,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).readFileRaw('/path/to/image.webp', mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('data:image/webp;base64,')
      );
    });
  });

  describe('downloadSynologyImage', () => {
    let mockSynologyClient: jest.Mocked<SynologyPhotosClient>;

    beforeEach(() => {
      mockSynologyClient = {
        downloadPhoto: jest.fn()
      } as unknown as jest.Mocked<SynologyPhotosClient>;
    });

    it('should check cache first when caching is enabled', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      mockImageCache.get.mockResolvedValue('cached-data-url');

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      expect(mockImageCache.get).toHaveBeenCalledWith(imageUrl);
    });

    it('should return cached image if available', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      const cachedData = 'data:image/jpeg;base64,cached123';
      mockImageCache.get.mockResolvedValue(cachedData);

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      expect(Log.debug).toHaveBeenCalledWith('Serving image from cache');
      expect(mockCallback).toHaveBeenCalledWith(cachedData);
      expect(mockSynologyClient.downloadPhoto).not.toHaveBeenCalled();
    });

    it('should skip cache check when cache is disabled', async () => {
      mockConfig.enableImageCache = false;
      const imageUrl = 'http://synology.local/photo/123';
      const imageBuffer = Buffer.from('test-image');
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      expect(mockImageCache.get).not.toHaveBeenCalled();
    });

    it('should skip cache check when imageCache is null', async () => {
      (processor as unknown as { imageCache: ImageCache | null }).imageCache =
        null;
      const imageUrl = 'http://synology.local/photo/123';
      const imageBuffer = Buffer.from('test-image');
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should download image when not cached', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      mockImageCache.get.mockResolvedValue(null);
      const imageBuffer = Buffer.from('test-image');
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      expect(Log.debug).toHaveBeenCalledWith('Downloading Synology image...');
      expect(mockSynologyClient.downloadPhoto).toHaveBeenCalledWith(imageUrl);
    });

    it('should convert buffer to base64 data URL', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      mockImageCache.get.mockResolvedValue(null);
      const imageBuffer = Buffer.from('test-image-data');
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      const expectedDataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
      expect(mockCallback).toHaveBeenCalledWith(expectedDataUrl);
    });

    it('should log download size', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      mockImageCache.get.mockResolvedValue(null);
      const imageBuffer = Buffer.from('test-image-data');
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      expect(Log.debug).toHaveBeenCalledWith(
        `Downloaded Synology image: ${imageBuffer.length} bytes`
      );
    });

    it('should cache downloaded image when caching is enabled', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      mockImageCache.get.mockResolvedValue(null);
      const imageBuffer = Buffer.from('test-image-data');
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      const expectedDataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
      expect(mockImageCache.set).toHaveBeenCalledWith(
        imageUrl,
        expectedDataUrl
      );
    });

    it('should not cache when caching is disabled', async () => {
      mockConfig.enableImageCache = false;
      const imageUrl = 'http://synology.local/photo/123';
      const imageBuffer = Buffer.from('test-image-data');
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      expect(mockImageCache.set).not.toHaveBeenCalled();
    });

    it('should handle null imageBuffer', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      mockImageCache.get.mockResolvedValue(null);
      mockSynologyClient.downloadPhoto.mockResolvedValue(
        null as unknown as Buffer
      );

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      expect(Log.error).toHaveBeenCalledWith(
        'Failed to download Synology image'
      );
      expect(mockCallback).toHaveBeenCalledWith(null);
    });

    it('should handle download errors', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      mockImageCache.get.mockResolvedValue(null);
      const error = new Error('Network error');
      mockSynologyClient.downloadPhoto.mockRejectedValue(error);

      await (
        processor as unknown as {
          downloadSynologyImage: (
            _url: string,
            _client: SynologyPhotosClient,
            _callback: (_data: string | null) => void
          ) => Promise<void>;
        }
      ).downloadSynologyImage(imageUrl, mockSynologyClient, mockCallback);

      expect(Log.error).toHaveBeenCalledWith(
        'Error downloading Synology image: Network error'
      );
      expect(mockCallback).toHaveBeenCalledWith(null);
    });
  });

  describe('readFile', () => {
    let mockSynologyClient: jest.Mocked<SynologyPhotosClient>;

    beforeEach(() => {
      mockSynologyClient = {
        downloadPhoto: jest.fn()
      } as unknown as jest.Mocked<SynologyPhotosClient>;
    });

    it('should delegate to downloadSynologyImage when imageUrl and synologyClient provided', async () => {
      const filepath = '/local/path.jpg';
      const imageUrl = 'http://synology.local/photo/123';
      const imageBuffer = Buffer.from('test');
      mockImageCache.get.mockResolvedValue(null);
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);

      await processor.readFile(
        filepath,
        mockCallback,
        imageUrl,
        mockSynologyClient
      );

      expect(mockSynologyClient.downloadPhoto).toHaveBeenCalledWith(imageUrl);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should not process local file when Synology URL provided', async () => {
      const filepath = '/local/path.jpg';
      const imageUrl = 'http://synology.local/photo/123';
      const imageBuffer = Buffer.from('test');
      mockImageCache.get.mockResolvedValue(null);
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);
      const mockSharpInstance = {
        rotate: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn()
      };
      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

      await processor.readFile(
        filepath,
        mockCallback,
        imageUrl,
        mockSynologyClient
      );

      expect(sharp).not.toHaveBeenCalled();
    });

    it('should resize local image when resizeImages is true', async () => {
      mockConfig.resizeImages = true;
      const filepath = '/path/to/image.jpg';
      const mockSharpInstance = {
        rotate: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('test'))
      };
      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

      await processor.readFile(filepath, mockCallback);

      expect(sharp).toHaveBeenCalledWith(filepath);
      expect(mockSharpInstance.resize).toHaveBeenCalled();
    });

    it('should read raw file when resizeImages is false', async () => {
      mockConfig.resizeImages = false;
      const filepath = '/path/to/image.jpg';
      (fsPromises.readFile as jest.Mock).mockResolvedValue(Buffer.from('test'));

      await processor.readFile(filepath, mockCallback);

      expect(Log.log).toHaveBeenCalledWith('Reading image without resizing');
      expect(fsPromises.readFile).toHaveBeenCalledWith(filepath);
    });

    it('should handle imageUrl without synologyClient', async () => {
      mockConfig.resizeImages = false;
      const filepath = '/path/to/image.jpg';
      const imageUrl = 'http://synology.local/photo/123';
      (fsPromises.readFile as jest.Mock).mockResolvedValue(Buffer.from('test'));

      await processor.readFile(
        filepath,
        mockCallback,
        imageUrl,
        null as unknown as SynologyPhotosClient
      );

      // Should treat as local file
      expect(fsPromises.readFile).toHaveBeenCalledWith(filepath);
    });

    it('should handle synologyClient without imageUrl', async () => {
      mockConfig.resizeImages = false;
      const filepath = '/path/to/image.jpg';
      (fsPromises.readFile as jest.Mock).mockResolvedValue(Buffer.from('test'));

      await processor.readFile(
        filepath,
        mockCallback,
        null as unknown as string,
        mockSynologyClient
      );

      // Should treat as local file
      expect(fsPromises.readFile).toHaveBeenCalledWith(filepath);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete local file resize workflow', async () => {
      const filepath = '/path/to/image.jpg';
      const mockSharpInstance = {
        rotate: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized-image'))
      };
      (sharp as unknown as jest.Mock).mockReturnValue(mockSharpInstance);

      await processor.readFile(filepath, mockCallback);

      expect(sharp).toHaveBeenCalled();
      expect(mockSharpInstance.rotate).toHaveBeenCalled();
      expect(mockSharpInstance.resize).toHaveBeenCalled();
      expect(mockSharpInstance.jpeg).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('data:image/jpg;base64,')
      );
    });

    it('should handle complete raw file read workflow', async () => {
      mockConfig.resizeImages = false;
      const filepath = '/path/to/image.jpg';
      const testBuffer = Buffer.from('raw-image-data');
      (fsPromises.readFile as jest.Mock).mockResolvedValue(testBuffer);

      await processor.readFile(filepath, mockCallback);

      expect(fsPromises.readFile).toHaveBeenCalledWith(filepath);
      expect(mockCallback).toHaveBeenCalledWith(
        `data:image/jpg;base64,${testBuffer.toString('base64')}`
      );
    });

    it('should handle complete Synology download with cache workflow', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      const mockSynologyClient = {
        downloadPhoto: jest.fn()
      } as unknown as jest.Mocked<SynologyPhotosClient>;
      const imageBuffer = Buffer.from('synology-image');
      mockImageCache.get.mockResolvedValue(null);
      mockSynologyClient.downloadPhoto.mockResolvedValue(imageBuffer);

      await processor.readFile(
        '/dummy',
        mockCallback,
        imageUrl,
        mockSynologyClient
      );

      // Should check cache
      expect(mockImageCache.get).toHaveBeenCalledWith(imageUrl);
      // Should download
      expect(mockSynologyClient.downloadPhoto).toHaveBeenCalledWith(imageUrl);
      // Should cache result
      expect(mockImageCache.set).toHaveBeenCalled();
      // Should callback with data
      expect(mockCallback).toHaveBeenCalledWith(
        expect.stringContaining('data:image/jpeg;base64,')
      );
    });

    it('should serve from cache on subsequent Synology requests', async () => {
      const imageUrl = 'http://synology.local/photo/123';
      const mockSynologyClient = {
        downloadPhoto: jest.fn()
      } as unknown as jest.Mocked<SynologyPhotosClient>;
      const cachedData = 'data:image/jpeg;base64,cached123';
      mockImageCache.get.mockResolvedValue(cachedData);

      await processor.readFile(
        '/dummy',
        mockCallback,
        imageUrl,
        mockSynologyClient
      );

      expect(mockImageCache.get).toHaveBeenCalledWith(imageUrl);
      expect(mockSynologyClient.downloadPhoto).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(cachedData);
    });
  });
});
