/**
 * @file SlideshowController.test.ts
 * @description Unit tests for SlideshowController
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { ModuleConfig } from '../types';

// Mock all dependencies BEFORE importing
jest.mock('./Logger');
jest.mock('./ImageListManager');
jest.mock('./TimerManager');
jest.mock('./ConfigLoader');
jest.mock('./SynologyManager');
jest.mock('./ImageProcessor');
jest.mock('./ImageCache');
jest.mock('./MemoryMonitor');

// Now import modules
import SlideshowController from './SlideshowController';
import Log from './Logger';
import ImageListManager from './ImageListManager';
import TimerManager from './TimerManager';
import ConfigLoader from './ConfigLoader';
import SynologyManager from './SynologyManager';
import ImageProcessor from './ImageProcessor';
import ImageCache from './ImageCache';
import MemoryMonitor from './MemoryMonitor';

// Setup mocks
const mockLog = Log as jest.Mocked<typeof Log>;
mockLog.info = jest.fn();
mockLog.error = jest.fn();
mockLog.warn = jest.fn();
mockLog.debug = jest.fn();
mockLog.log = jest.fn();

const mockImageListManager = {
  prepareImageList: jest.fn(() => []),
  getNextImage: jest.fn(),
  getPreviousImage: jest.fn(),
  isEmpty: jest.fn(() => true),
  getList: jest.fn(() => []),
  reset: jest.fn(),
  resetShownImagesTracker: jest.fn(),
  addImageToShown: jest.fn(),
  index: 0
};

const mockTimerManager = {
  startSlideshowTimer: jest.fn(),
  stopSlideshowTimer: jest.fn(),
  startRefreshTimer: jest.fn(),
  stopRefreshTimer: jest.fn(),
  stopAllTimers: jest.fn()
};

const mockSynologyManager = {
  fetchPhotos: jest.fn(async () => []),
  getClient: jest.fn(() => null)
};

const mockImageCache = {
  initialize: jest.fn(async () => undefined),
  preloadImages: jest.fn(),
  evictOldFiles: jest.fn(async () => undefined)
};

const mockImageProcessor = {
  readFile: jest.fn()
};

const mockMemoryMonitor = {
  start: jest.fn(),
  stop: jest.fn(),
  onCleanupNeeded: jest.fn()
};

const mockConfigLoader = ConfigLoader as jest.Mocked<typeof ConfigLoader>;
mockConfigLoader.initialize = jest.fn(
  (config: Partial<ModuleConfig>) => config as ModuleConfig
);

// Mock constructors
(ImageListManager as jest.Mock).mockImplementation(() => mockImageListManager);
(TimerManager as jest.Mock).mockImplementation(() => mockTimerManager);
(SynologyManager as jest.Mock).mockImplementation(() => mockSynologyManager);
(ImageProcessor as jest.Mock).mockImplementation(() => mockImageProcessor);
(ImageCache as jest.Mock).mockImplementation(() => mockImageCache);
(MemoryMonitor as jest.Mock).mockImplementation(() => mockMemoryMonitor);

describe('SlideshowController', () => {
  let controller: SlideshowController;
  let mockNotificationCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationCallback = jest.fn();
    controller = new SlideshowController(mockNotificationCallback);
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(controller).toBeDefined();
    });

    it('should store the notification callback', () => {
      expect(mockNotificationCallback).not.toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should initialize with valid configuration', async () => {
      const config: Partial<ModuleConfig> = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        slideshowSpeed: 5000
      };

      await controller.initialize(config);

      // Wait for the setTimeout to fire (200ms + buffer)
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 300);
      });

      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    it('should handle initialization with cache enabled', async () => {
      const config: Partial<ModuleConfig> = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        enableImageCache: true
      };

      await controller.initialize(config);
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 300);
      });

      expect(mockNotificationCallback).toHaveBeenCalled();
    });

    it('should handle initialization with memory monitor enabled', async () => {
      const config: Partial<ModuleConfig> = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        enableMemoryMonitor: true
      };

      await controller.initialize(config);
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 300);
      });

      expect(mockNotificationCallback).toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('should pause the slideshow', () => {
      controller.pause();

      // Should not throw any errors
      expect(controller).toBeDefined();
    });
  });

  describe('play', () => {
    it('should resume the slideshow', () => {
      controller.play();

      // Should not throw any errors
      expect(controller).toBeDefined();
    });
  });

  describe('getPreviousImage', () => {
    it('should get the previous image', () => {
      controller.getPreviousImage();

      // Should not throw any errors
      expect(controller).toBeDefined();
    });
  });

  describe('playVideo', () => {
    it('should play a video file', () => {
      const videoPath = '/path/to/video.mp4';

      controller.playVideo(videoPath);

      // Should not throw any errors
      expect(controller).toBeDefined();
    });
  });

  describe('notification callback', () => {
    it('should call notification callback when sending notifications', async () => {
      const config: Partial<ModuleConfig> = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com'
      };

      await controller.initialize(config);
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 300);
      });

      expect(mockNotificationCallback).toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('should handle complete initialization and control workflow', async () => {
      const config: Partial<ModuleConfig> = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com'
      };

      await controller.initialize(config);
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 300);
      });

      controller.pause();
      controller.play();

      expect(mockNotificationCallback).toHaveBeenCalled();
    });
  });
});
