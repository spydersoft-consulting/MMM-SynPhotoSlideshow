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

/* eslint-disable @typescript-eslint/no-explicit-any */
// Setup mocks
const mockLog = Log as jest.Mocked<typeof Log>;
mockLog.info = jest.fn();
mockLog.error = jest.fn();
mockLog.warn = jest.fn();
mockLog.debug = jest.fn();
mockLog.log = jest.fn();

const mockImageListManager = {
  prepareImageList: jest.fn(() => []) as jest.MockedFunction<any>,
  getNextImage: jest.fn() as jest.MockedFunction<any>,
  getPreviousImage: jest.fn() as jest.MockedFunction<any>,
  isEmpty: jest.fn(() => true) as jest.MockedFunction<any>,
  getList: jest.fn(() => []) as jest.MockedFunction<any>,
  reset: jest.fn() as jest.MockedFunction<any>,
  resetShownImagesTracker: jest.fn() as jest.MockedFunction<any>,
  addImageToShown: jest.fn() as jest.MockedFunction<any>,
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

  describe('gatherImageList', () => {
    it('should send REGISTER_CONFIG notification when synologyUrl is missing', async () => {
      const config = { identifier: 'test' } as ModuleConfig;
      await controller.initialize(config);

      // Call gatherImageList directly
      await (controller as any).gatherImageList(config, false);

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_REGISTER_CONFIG'
      );
    });

    it('should gather image list and send FILELIST notification', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com'
      } as ModuleConfig;

      (mockSynologyManager.fetchPhotos as any).mockResolvedValueOnce([
        { path: '/photo1.jpg' },
        { path: '/photo2.jpg' }
      ]);
      (mockImageListManager.prepareImageList as any).mockReturnValueOnce([
        { path: '/photo1.jpg', url: null },
        { path: '/photo2.jpg', url: null }
      ]);

      await controller.initialize(config);
      await (controller as any).gatherImageList(config, false);

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_FILELIST',
        expect.objectContaining({
          imageList: expect.any(Array)
        })
      );
    });

    it('should send READY notification when sendNotification is true', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com'
      } as ModuleConfig;

      mockSynologyManager.fetchPhotos.mockResolvedValueOnce([]);
      mockImageListManager.prepareImageList.mockReturnValueOnce([]);

      await controller.initialize(config);
      await (controller as any).gatherImageList(config, true);

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_READY',
        { identifier: 'test-module' }
      );
    });

    it('should preload images when cache is enabled', async () => {
      const config: Partial<ModuleConfig> = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        enableImageCache: true
      };

      const imageList = [
        { path: '/photo1.jpg', url: 'http://example.com/1' },
        { path: '/photo2.jpg', url: 'http://example.com/2' }
      ];

      mockSynologyManager.fetchPhotos.mockResolvedValueOnce([]);
      mockImageListManager.prepareImageList.mockReturnValueOnce(imageList);

      await controller.initialize(config);

      // Call gatherImageList directly with the imageList setup
      await (controller as any).gatherImageList(config as ModuleConfig, false);

      expect(mockImageCache.preloadImages).toHaveBeenCalledWith(
        imageList,
        expect.any(Function)
      );
    });
  });

  describe('getNextImage', () => {
    it('should load images if image list is empty', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        slideshowSpeed: 5000
      } as ModuleConfig;

      mockImageListManager.isEmpty.mockReturnValueOnce(true);
      mockSynologyManager.fetchPhotos.mockResolvedValueOnce([]);

      await controller.initialize(config);
      await (controller as any).getNextImage();

      expect(mockSynologyManager.fetchPhotos).toHaveBeenCalled();
    });

    it('should display image when available', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        slideshowSpeed: 5000
      } as ModuleConfig;

      const mockImage = {
        path: '/photo1.jpg',
        url: 'http://example.com/1'
      };

      mockImageListManager.isEmpty.mockReturnValue(false);
      mockImageListManager.getNextImage.mockReturnValue(mockImage);
      mockImageListManager.getList.mockReturnValue([mockImage]);
      mockImageListManager.index = 0;

      mockImageProcessor.readFile.mockImplementation((...args: any[]) => {
        const callback = args[1] as (data: string) => void;
        callback('base64data');
      });

      await controller.initialize(config);
      await (controller as any).getNextImage();

      expect(mockNotificationCallback).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_DISPLAY_IMAGE',
        expect.objectContaining({
          identifier: 'test-module',
          path: '/photo1.jpg',
          data: 'base64data'
        })
      );
    });

    it('should reset shown images tracker when at index 0 and showAllImagesBeforeRestart is true', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        showAllImagesBeforeRestart: true
      } as ModuleConfig;

      const mockImage = { path: '/photo1.jpg', url: null };
      mockImageListManager.isEmpty.mockReturnValue(false);
      mockImageListManager.getNextImage.mockReturnValue(mockImage);
      mockImageListManager.getList.mockReturnValue([mockImage]);
      mockImageListManager.index = 0;

      mockImageProcessor.readFile.mockImplementation((...args: any[]) => {
        const callback = args[1] as (data: string) => void;
        callback('data');
      });

      await controller.initialize(config);
      await (controller as any).getNextImage();

      expect(mockImageListManager.resetShownImagesTracker).toHaveBeenCalled();
    });

    it('should add image to shown list when showAllImagesBeforeRestart is true', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        showAllImagesBeforeRestart: true
      } as ModuleConfig;

      const mockImage = { path: '/photo1.jpg', url: null };
      mockImageListManager.isEmpty.mockReturnValue(false);
      mockImageListManager.getNextImage.mockReturnValue(mockImage);
      mockImageListManager.getList.mockReturnValue([mockImage]);
      mockImageListManager.index = 1;

      mockImageProcessor.readFile.mockImplementation((...args: any[]) => {
        const callback = args[1] as (data: string) => void;
        callback('data');
      });

      await controller.initialize(config);
      await (controller as any).getNextImage();

      expect(mockImageListManager.addImageToShown).toHaveBeenCalledWith(
        '/photo1.jpg'
      );
    });

    it('should schedule retry when no images available', async () => {
      jest.useFakeTimers();

      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com'
      } as ModuleConfig;

      mockImageListManager.isEmpty.mockReturnValue(true);
      mockSynologyManager.fetchPhotos.mockResolvedValue([]);
      mockImageListManager.prepareImageList.mockReturnValue([]);

      await controller.initialize(config);
      await (controller as any).getNextImage();

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('No images available')
      );

      jest.useRealTimers();
    });

    it('should not schedule multiple retries', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com'
      } as ModuleConfig;

      mockImageListManager.isEmpty.mockReturnValue(true);
      mockSynologyManager.fetchPhotos.mockResolvedValue([]);
      mockImageListManager.prepareImageList.mockReturnValue([]);

      await controller.initialize(config);

      // Call getNextImage twice
      await (controller as any).getNextImage();
      await (controller as any).getNextImage();

      // Should only log warning once
      const warnCalls = mockLog.warn.mock.calls.filter((call: any[]) =>
        call[0].includes('No images available')
      );
      expect(warnCalls.length).toBe(1);
    });

    it('should handle null image from getNextImage', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com'
      } as ModuleConfig;

      mockImageListManager.isEmpty.mockReturnValue(false);
      mockImageListManager.getNextImage.mockReturnValue(null);

      await controller.initialize(config);
      await (controller as any).getNextImage();

      expect(mockLog.error).toHaveBeenCalledWith('Failed to get next image');
    });
  });

  describe('refreshImageList', () => {
    it('should refresh the image list and maintain position', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        refreshImageListInterval: 30000
      } as ModuleConfig;

      mockImageListManager.index = 5;
      mockImageListManager.getList.mockReturnValue(
        new Array(10).fill({ path: '/photo.jpg' })
      );
      mockSynologyManager.fetchPhotos.mockResolvedValue([]);
      mockImageListManager.prepareImageList.mockReturnValue(
        new Array(10).fill({ path: '/photo.jpg' })
      );

      await controller.initialize(config);
      await (controller as any).refreshImageList();

      expect(mockImageListManager.index).toBe(5);
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('Maintained position')
      );
    });

    it('should reset position when current index exceeds new list length', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com'
      } as ModuleConfig;

      mockImageListManager.index = 15;
      mockImageListManager.getList.mockReturnValue(
        new Array(5).fill({ path: '/photo.jpg' })
      );
      mockSynologyManager.fetchPhotos.mockResolvedValue([]);
      mockImageListManager.prepareImageList.mockReturnValue(
        new Array(5).fill({ path: '/photo.jpg' })
      );

      await controller.initialize(config);
      await (controller as any).refreshImageList();

      expect(mockImageListManager.reset).toHaveBeenCalled();
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('Reset to beginning')
      );
    });

    it('should restart refresh timer after refreshing', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        refreshImageListInterval: 60000
      } as ModuleConfig;

      mockSynologyManager.fetchPhotos.mockResolvedValue([]);
      mockImageListManager.prepareImageList.mockReturnValue([]);
      mockImageListManager.getList.mockReturnValue([]);

      await controller.initialize(config);

      const initialCallCount =
        mockTimerManager.startRefreshTimer.mock.calls.length;

      await (controller as any).refreshImageList();

      expect(
        mockTimerManager.startRefreshTimer.mock.calls.length
      ).toBeGreaterThan(initialCallCount);
    });

    it('should handle refresh when config is null', async () => {
      await (controller as any).refreshImageList();

      // Should return early without error
      expect(mockSynologyManager.fetchPhotos).not.toHaveBeenCalled();
    });
  });

  describe('pause and play', () => {
    it('should stop all timers when paused', () => {
      controller.pause();

      expect(mockTimerManager.stopAllTimers).toHaveBeenCalled();
    });

    it('should start timers when playing', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        slideshowSpeed: 8000,
        refreshImageListInterval: 120000
      } as ModuleConfig;

      await controller.initialize(config);
      controller.play();

      expect(mockTimerManager.startSlideshowTimer).toHaveBeenCalled();
      expect(mockTimerManager.startRefreshTimer).toHaveBeenCalled();
    });

    it('should use default intervals when config values not provided', async () => {
      const config: ModuleConfig = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com'
      } as ModuleConfig;

      await controller.initialize(config);
      controller.play();

      // Should use defaults: slideshowSpeed=10000, refreshImageListInterval=3600000
      expect(mockTimerManager.startSlideshowTimer).toHaveBeenCalledWith(
        expect.any(Function),
        10000
      );
    });
  });

  describe('memory monitor cleanup callback', () => {
    it('should trigger cache eviction on memory cleanup', async () => {
      const config: Partial<ModuleConfig> = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        enableMemoryMonitor: true,
        enableImageCache: true
      };

      await controller.initialize(config);

      // Get the cleanup callback that was registered
      const [[cleanupCallback]] = mockMemoryMonitor.onCleanupNeeded.mock.calls;
      (cleanupCallback as () => void)();

      expect(mockLog.info).toHaveBeenCalledWith('Running memory cleanup');
      expect(mockImageCache.evictOldFiles).toHaveBeenCalled();
    });

    it('should handle cleanup when cache is not enabled', async () => {
      const config: Partial<ModuleConfig> = {
        identifier: 'test-module',
        synologyUrl: 'https://synology.example.com',
        enableMemoryMonitor: true,
        enableImageCache: false
      };

      await controller.initialize(config);

      // Get the cleanup callback
      const [[cleanupCallback]] = mockMemoryMonitor.onCleanupNeeded.mock.calls;
      (cleanupCallback as () => void)();

      expect(mockLog.info).toHaveBeenCalledWith('Running memory cleanup');
      // Should not crash even though imageCache is null
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
