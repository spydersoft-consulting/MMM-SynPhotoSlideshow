/**
 * ConfigLoader.test.ts
 *
 * Unit tests for ConfigLoader
 */

// Mock the logger and fs before importing ConfigLoader
jest.mock('./Logger');
jest.mock('node:fs');
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

import * as fs from 'node:fs';
import ConfigLoader from './ConfigLoader';
import Log from './Logger';

describe('ConfigLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    delete process.env.SYNOLOGY_URL;
    delete process.env.SYNOLOGY_ACCOUNT;
    delete process.env.SYNOLOGY_PASSWORD;
    delete process.env.SYNOLOGY_ALBUM_NAME;
    delete process.env.SYNOLOGY_SHARE_TOKEN;
    delete process.env.SYNOLOGY_TAG_NAMES;
    delete process.env.SYNOLOGY_MAX_PHOTOS;
    delete process.env.SLIDESHOW_SPEED;
    delete process.env.REFRESH_IMAGE_LIST_INTERVAL;
    delete process.env.ENABLE_IMAGE_CACHE;
    delete process.env.IMAGE_CACHE_MAX_SIZE;
    delete process.env.IMAGE_CACHE_PRELOAD_COUNT;
    delete process.env.IMAGE_CACHE_PRELOAD_DELAY;
    delete process.env.ENABLE_MEMORY_MONITOR;
    delete process.env.MEMORY_MONITOR_INTERVAL;
    delete process.env.MEMORY_THRESHOLD;
    delete process.env.RANDOMIZE_IMAGE_ORDER;
    delete process.env.SHOW_ALL_IMAGES_BEFORE_RESTART;
    delete process.env.RESIZE_IMAGES;
    delete process.env.MAX_WIDTH;
    delete process.env.MAX_HEIGHT;

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadEnv', () => {
    it('should log when .env file is not found', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      ConfigLoader.loadEnv();

      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Looking for .env file at:')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining(
          '.env file not found, using config.js values only'
        )
      );
    });

    it('should load .env file when it exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Get the mocked config function and set its return value
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dotenv = require('dotenv');
      dotenv.config.mockReturnValueOnce({
        parsed: {
          SYNOLOGY_URL: 'http://test.com',
          SYNOLOGY_ACCOUNT: 'testuser'
        }
      });

      ConfigLoader.loadEnv();

      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Looking for .env file at:')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('.env file found, loading...')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'Successfully loaded configuration from .env file'
        )
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'Loaded variables: SYNOLOGY_URL, SYNOLOGY_ACCOUNT'
        )
      );
    });

    it('should handle errors when loading .env file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Get the mocked config function and set its return value
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dotenv = require('dotenv');
      dotenv.config.mockReturnValueOnce({
        error: new Error('Parse error')
      });

      ConfigLoader.loadEnv();

      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Looking for .env file at:')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('.env file found, loading...')
      );
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Error loading .env file: Parse error')
      );
    });
  });

  describe('mergeEnvWithConfig', () => {
    it('should return config unchanged when no environment variables are set', () => {
      const config = {
        synologyUrl: 'http://original.com',
        synologyAccount: 'originaluser'
      };

      const result = ConfigLoader.mergeEnvWithConfig(
        config as Parameters<typeof ConfigLoader.mergeEnvWithConfig>[0]
      );

      expect(result).toEqual(config);
    });

    it('should override config with environment variables', () => {
      process.env.SYNOLOGY_URL = 'http://env.com';
      process.env.SYNOLOGY_ACCOUNT = 'envuser';
      process.env.SYNOLOGY_PASSWORD = 'envpass';

      const config = {
        synologyUrl: 'http://original.com',
        synologyAccount: 'originaluser'
      };

      const result = ConfigLoader.mergeEnvWithConfig(
        config as Parameters<typeof ConfigLoader.mergeEnvWithConfig>[0]
      );

      expect(result.synologyUrl).toBe('http://env.com');
      expect(result.synologyAccount).toBe('envuser');
      expect(result.synologyPassword).toBe('envpass');
    });

    it('should parse comma-separated tag names', () => {
      process.env.SYNOLOGY_TAG_NAMES = 'tag1, tag2, tag3';

      const config = {};
      const result = ConfigLoader.mergeEnvWithConfig(
        config as Parameters<typeof ConfigLoader.mergeEnvWithConfig>[0]
      );

      expect(result.synologyTagNames).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should parse numeric values correctly', () => {
      process.env.SYNOLOGY_MAX_PHOTOS = '100';
      process.env.SLIDESHOW_SPEED = '5000';
      process.env.REFRESH_IMAGE_LIST_INTERVAL = '3600000';
      process.env.IMAGE_CACHE_MAX_SIZE = '500';
      process.env.IMAGE_CACHE_PRELOAD_COUNT = '3';
      process.env.IMAGE_CACHE_PRELOAD_DELAY = '1000';
      process.env.MEMORY_MONITOR_INTERVAL = '60000';
      process.env.MEMORY_THRESHOLD = '0.85';
      process.env.MAX_WIDTH = '1920';
      process.env.MAX_HEIGHT = '1080';

      const config = {};
      const result = ConfigLoader.mergeEnvWithConfig(
        config as Parameters<typeof ConfigLoader.mergeEnvWithConfig>[0]
      );

      expect(result.synologyMaxPhotos).toBe(100);
      expect(result.slideshowSpeed).toBe(5000);
      expect(result.refreshImageListInterval).toBe(3600000);
      expect(result.imageCacheMaxSize).toBe(500);
      expect(result.imageCachePreloadCount).toBe(3);
      expect(result.imageCachePreloadDelay).toBe(1000);
      expect(result.memoryMonitorInterval).toBe(60000);
      expect(result.memoryThreshold).toBe(0.85);
      expect(result.maxWidth).toBe(1920);
      expect(result.maxHeight).toBe(1080);
    });

    it('should parse boolean values correctly', () => {
      process.env.ENABLE_IMAGE_CACHE = 'true';
      process.env.ENABLE_MEMORY_MONITOR = 'false';
      process.env.RANDOMIZE_IMAGE_ORDER = 'true';
      process.env.SHOW_ALL_IMAGES_BEFORE_RESTART = 'false';
      process.env.RESIZE_IMAGES = 'true';

      const config = {};
      const result = ConfigLoader.mergeEnvWithConfig(
        config as Parameters<typeof ConfigLoader.mergeEnvWithConfig>[0]
      );

      expect(result.enableImageCache).toBe(true);
      expect(result.enableMemoryMonitor).toBe(false);
      expect(result.randomizeImageOrder).toBe(true);
      expect(result.showAllImagesBeforeRestart).toBe(false);
      expect(result.resizeImages).toBe(true);
    });

    it('should handle all environment variables together', () => {
      process.env.SYNOLOGY_URL = 'http://test.com';
      process.env.SYNOLOGY_ACCOUNT = 'testuser';
      process.env.SYNOLOGY_PASSWORD = 'testpass';
      process.env.SYNOLOGY_ALBUM_NAME = 'TestAlbum';
      process.env.SYNOLOGY_SHARE_TOKEN = 'sharetoken123';
      process.env.SYNOLOGY_TAG_NAMES = 'vacation, family';
      process.env.SYNOLOGY_MAX_PHOTOS = '50';
      process.env.SLIDESHOW_SPEED = '7000';
      process.env.ENABLE_IMAGE_CACHE = 'true';
      process.env.IMAGE_CACHE_MAX_SIZE = '200';

      const config = {
        synologyUrl: 'http://original.com'
      };

      const result = ConfigLoader.mergeEnvWithConfig(
        config as Parameters<typeof ConfigLoader.mergeEnvWithConfig>[0]
      );

      expect(result.synologyUrl).toBe('http://test.com');
      expect(result.synologyAccount).toBe('testuser');
      expect(result.synologyPassword).toBe('testpass');
      expect(result.synologyAlbumName).toBe('TestAlbum');
      expect(result.synologyShareToken).toBe('sharetoken123');
      expect(result.synologyTagNames).toEqual(['vacation', 'family']);
      expect(result.synologyMaxPhotos).toBe(50);
      expect(result.slideshowSpeed).toBe(7000);
      expect(result.enableImageCache).toBe(true);
      expect(result.imageCacheMaxSize).toBe(200);
    });
  });

  describe('validateConfig', () => {
    it('should return false when synologyUrl is missing', () => {
      const config = {};

      const result = ConfigLoader.validateConfig(
        config as Parameters<typeof ConfigLoader.validateConfig>[0]
      );

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: synologyUrl is required!')
      );
    });

    it('should return false when authentication is missing', () => {
      const config = {
        synologyUrl: 'http://test.com'
      };

      const result = ConfigLoader.validateConfig(
        config as Parameters<typeof ConfigLoader.validateConfig>[0]
      );

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Authentication is required!')
      );
    });

    it('should return true with valid credentials authentication', () => {
      const config = {
        synologyUrl: 'http://test.com',
        synologyAccount: 'testuser',
        synologyPassword: 'testpass'
      };

      const result = ConfigLoader.validateConfig(
        config as Parameters<typeof ConfigLoader.validateConfig>[0]
      );

      expect(result).toBe(true);
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validated successfully')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Auth: Account Credentials')
      );
    });

    it('should return true with valid share token authentication', () => {
      const config = {
        synologyUrl: 'http://test.com',
        synologyShareToken: 'token123'
      };

      const result = ConfigLoader.validateConfig(
        config as Parameters<typeof ConfigLoader.validateConfig>[0]
      );

      expect(result).toBe(true);
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validated successfully')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Auth: Share Token')
      );
    });

    it('should warn when synologyUrl is missing http/https', () => {
      const config = {
        synologyUrl: 'test.com',
        synologyAccount: 'testuser',
        synologyPassword: 'testpass'
      };

      ConfigLoader.validateConfig(
        config as Parameters<typeof ConfigLoader.validateConfig>[0]
      );

      expect(Log.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'WARNING: synologyUrl should start with http:// or https://'
        )
      );
    });

    it('should log album and tags when present', () => {
      const config = {
        synologyUrl: 'http://test.com',
        synologyAccount: 'testuser',
        synologyPassword: 'testpass',
        synologyAlbumName: 'TestAlbum',
        synologyTagNames: ['tag1', 'tag2']
      };

      ConfigLoader.validateConfig(
        config as Parameters<typeof ConfigLoader.validateConfig>[0]
      );

      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Album: TestAlbum')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Tags: tag1, tag2')
      );
    });

    it('should return false and log all errors when multiple fields are missing', () => {
      const config = {};

      const result = ConfigLoader.validateConfig(
        config as Parameters<typeof ConfigLoader.validateConfig>[0]
      );

      expect(result).toBe(false);
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: synologyUrl is required!')
      );
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Authentication is required!')
      );
      expect(Log.error).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validation FAILED')
      );
    });
  });

  describe('initialize', () => {
    it('should merge config and validate', () => {
      const config = {
        synologyUrl: 'http://test.com',
        synologyAccount: 'testuser',
        synologyPassword: 'testpass'
      };

      // Mock loadEnv to prevent loading actual .env file
      const loadEnvSpy = jest
        .spyOn(ConfigLoader, 'loadEnv')
        .mockImplementation(() => {
          // No-op mock
        });

      const result = ConfigLoader.initialize(
        config as Parameters<typeof ConfigLoader.initialize>[0]
      );

      expect(result.synologyUrl).toBe('http://test.com');
      expect(result.synologyAccount).toBe('testuser');
      expect(result.synologyPassword).toBe('testpass');
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Initializing configuration...')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validated successfully')
      );

      loadEnvSpy.mockRestore();
    });

    it('should merge environment variables with config', () => {
      process.env.SYNOLOGY_URL = 'http://env.com';
      process.env.SYNOLOGY_PASSWORD = 'envpass';

      const config = {
        synologyUrl: 'http://config.com',
        synologyAccount: 'configuser'
      };

      // Mock loadEnv to prevent loading actual .env file
      const loadEnvSpy = jest
        .spyOn(ConfigLoader, 'loadEnv')
        .mockImplementation(() => {
          // No-op mock
        });

      const result = ConfigLoader.initialize(
        config as Parameters<typeof ConfigLoader.initialize>[0]
      );

      expect(result.synologyUrl).toBe('http://env.com');
      expect(result.synologyAccount).toBe('configuser');
      expect(result.synologyPassword).toBe('envpass');

      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'Using environment variables: SYNOLOGY_URL, SYNOLOGY_PASSWORD'
        )
      );

      loadEnvSpy.mockRestore();
    });

    it('should handle initialization with empty config and environment variables', () => {
      process.env.SYNOLOGY_URL = 'http://env.com';
      process.env.SYNOLOGY_ACCOUNT = 'envuser';
      process.env.SYNOLOGY_PASSWORD = 'envpass';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = ConfigLoader.initialize(
        {} as Parameters<typeof ConfigLoader.initialize>[0]
      );

      expect(result.synologyUrl).toBe('http://env.com');
      expect(result.synologyAccount).toBe('envuser');
      expect(result.synologyPassword).toBe('envpass');
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validated successfully')
      );
    });

    it('should return config keys in logs', () => {
      const config = {
        synologyUrl: 'http://test.com',
        synologyAccount: 'testuser',
        synologyPassword: 'testpass'
      };

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      ConfigLoader.initialize(
        config as Parameters<typeof ConfigLoader.initialize>[0]
      );

      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Config received from config.js')
      );
      expect(Log.info).toHaveBeenCalledWith(
        expect.stringContaining('Final merged config keys')
      );
    });
  });
});
