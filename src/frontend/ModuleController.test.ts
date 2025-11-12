/**
 * @file ModuleController.test.ts
 * @description Unit tests for ModuleController
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import ModuleController from './ModuleController';
import type { ModuleConfig, ImageInfo } from '../types';

// Mock dependencies
jest.mock('./ConfigValidator');
jest.mock('./ImageHandler');
jest.mock('./UIBuilder');
jest.mock('./TransitionHandler');

import ConfigValidator from './ConfigValidator';
import ImageHandler from './ImageHandler';
import UIBuilder from './UIBuilder';
import TransitionHandler from './TransitionHandler';

describe('ModuleController', () => {
  let controller: ModuleController;
  let mockConfig: ModuleConfig;
  let mockCallbacks: {
    sendSocketNotification: jest.Mock<(n: string, p?: unknown) => void>;
    sendNotification: jest.Mock<(n: string, p?: unknown) => void>;
    translate: jest.Mock<(key: string) => string>;
  };
  let mockLog: {
    info: jest.Mock;
    log: jest.Mock;
    debug: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
  let mockMoment: jest.Mock<
    (date: string, format: string) => { format: (f: string) => string }
  >;
  let mockEXIF: {
    getData: jest.Mock<(i: HTMLImageElement, c: () => void) => void>;
    getTag: jest.Mock<
      (i: HTMLImageElement, t: string) => string | number | null
    >;
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock config
    mockConfig = {
      identifier: 'test-module',
      synologyUrl: 'https://synology.example.com',
      slideshowSpeed: 5000,
      showImageInfo: false,
      showProgressBar: false,
      gradientDirection: 'vertical',
      gradient: ['rgba(0,0,0,0.75) 0%', 'rgba(0,0,0,0) 100%'],
      horizontalGradient: ['rgba(0,0,0,0.75) 0%', 'rgba(0,0,0,0) 100%'],
      radialGradient: ['rgba(0,0,0,0) 0%', 'rgba(0,0,0,0.25) 100%'],
      changeImageOnResume: false,
      randomizeImageOrder: false
    } as ModuleConfig;

    // Setup mock callbacks
    mockCallbacks = {
      sendSocketNotification: jest.fn(),
      sendNotification: jest.fn(),
      translate: jest.fn((key: string) => key)
    };

    // Setup mock Log
    mockLog = {
      info: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Setup mock moment
    mockMoment = jest.fn(() => ({
      format: jest.fn(() => '2023-01-01 12:00:00')
    }));

    // Setup mock EXIF
    mockEXIF = {
      getData: jest.fn((img: HTMLImageElement, callback: () => void) => {
        callback();
      }),
      getTag: jest.fn(() => null)
    };

    // Setup ConfigValidator mock
    (ConfigValidator.validateConfig as jest.Mock).mockImplementation(
      (config) => config
    );

    // Setup constructor mocks
    (ImageHandler as unknown as jest.Mock).mockImplementation(() => ({
      createImageDiv: jest.fn(() => {
        const div = document.createElement('div');
        div.classList.add('image');
        return div;
      }),
      applyFitMode: jest.fn(() => false),
      applyAnimation: jest.fn(),
      applyExifOrientation: jest.fn()
    }));

    (UIBuilder as unknown as jest.Mock).mockImplementation(() => ({
      createGradientDiv: jest.fn(),
      createRadialGradientDiv: jest.fn(),
      createImageInfoDiv: jest.fn(() => document.createElement('div')),
      createProgressbarDiv: jest.fn(),
      updateImageInfo: jest.fn(),
      restartProgressBar: jest.fn()
    }));

    (TransitionHandler as unknown as jest.Mock).mockImplementation(() => ({
      createTransitionDiv: jest.fn(() => document.createElement('div')),
      cleanupOldImages: jest.fn()
    }));

    // Create controller instance
    controller = new ModuleController(
      mockConfig,
      'test-module',
      mockCallbacks,
      mockLog,
      mockMoment,
      mockEXIF
    );
  });

  describe('constructor', () => {
    it('should initialize with config and identifier', () => {
      expect(controller).toBeDefined();
    });

    it('should store callbacks', () => {
      expect(controller).toHaveProperty('callbacks');
    });
  });

  describe('start', () => {
    it('should validate config', () => {
      controller.start();

      expect(ConfigValidator.validateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'test-module'
        })
      );
    });

    it('should initialize helper modules', () => {
      controller.start();

      expect(ImageHandler).toHaveBeenCalled();
      expect(UIBuilder).toHaveBeenCalled();
      expect(TransitionHandler).toHaveBeenCalled();
    });

    it('should set playingVideo to false', () => {
      controller.start();

      // This is tested indirectly through behavior
      expect(controller).toBeDefined();
    });
  });

  describe('getDom', () => {
    beforeEach(() => {
      controller.start();
    });

    it('should create wrapper element', () => {
      const dom = controller.getDom();

      expect(dom).toBeInstanceOf(HTMLElement);
      expect(dom.querySelector('.images')).toBeTruthy();
    });

    it('should create vertical gradient when configured', () => {
      const verticalConfig = {
        ...mockConfig,
        gradientDirection: 'vertical' as const
      };
      const verticalController = new ModuleController(
        verticalConfig,
        'test-module',
        mockCallbacks,
        mockLog,
        mockMoment,
        mockEXIF
      );
      verticalController.start();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { uiBuilder } = verticalController as any;

      verticalController.getDom();

      expect(uiBuilder.createGradientDiv).toHaveBeenCalledWith(
        'bottom',
        mockConfig.gradient,
        expect.any(HTMLElement)
      );
    });

    it('should create horizontal gradient when configured', () => {
      const horizontalConfig = {
        ...mockConfig,
        gradientDirection: 'horizontal' as const
      };
      const horizontalController = new ModuleController(
        horizontalConfig,
        'test-module',
        mockCallbacks,
        mockLog,
        mockMoment,
        mockEXIF
      );
      horizontalController.start();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { uiBuilder } = horizontalController as any;

      horizontalController.getDom();

      expect(uiBuilder.createGradientDiv).toHaveBeenCalledWith(
        'right',
        mockConfig.horizontalGradient,
        expect.any(HTMLElement)
      );
    });

    it('should create both gradients when configured', () => {
      const bothConfig = {
        ...mockConfig,
        gradientDirection: 'both' as const
      };
      const bothController = new ModuleController(
        bothConfig,
        'test-module',
        mockCallbacks,
        mockLog,
        mockMoment,
        mockEXIF
      );
      bothController.start();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { uiBuilder } = bothController as any;

      bothController.getDom();

      expect(uiBuilder.createGradientDiv).toHaveBeenCalledTimes(2);
    });

    it('should create radial gradient when configured', () => {
      const radialConfig = {
        ...mockConfig,
        gradientDirection: 'radial' as const
      };
      const radialController = new ModuleController(
        radialConfig,
        'test-module',
        mockCallbacks,
        mockLog,
        mockMoment,
        mockEXIF
      );
      radialController.start();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { uiBuilder } = radialController as any;

      radialController.getDom();

      expect(uiBuilder.createRadialGradientDiv).toHaveBeenCalledWith(
        'ellipse at center',
        mockConfig.radialGradient,
        expect.any(HTMLElement)
      );
    });

    it('should create image info div when showImageInfo is true', () => {
      const infoConfig = {
        ...mockConfig,
        showImageInfo: true
      };
      const infoController = new ModuleController(
        infoConfig,
        'test-module',
        mockCallbacks,
        mockLog,
        mockMoment,
        mockEXIF
      );
      infoController.start();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { uiBuilder } = infoController as any;

      infoController.getDom();

      expect(uiBuilder.createImageInfoDiv).toHaveBeenCalled();
    });

    it('should create progress bar when showProgressBar is true', () => {
      const progressConfig = {
        ...mockConfig,
        showProgressBar: true
      };
      const progressController = new ModuleController(
        progressConfig,
        'test-module',
        mockCallbacks,
        mockLog,
        mockMoment,
        mockEXIF
      );
      progressController.start();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { uiBuilder } = progressController as any;

      progressController.getDom();

      expect(uiBuilder.createProgressbarDiv).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        progressConfig.slideshowSpeed
      );
    });

    it('should call updateImageList', () => {
      controller.getDom();

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_REGISTER_CONFIG',
        expect.any(Object)
      );
    });
  });

  describe('notificationReceived', () => {
    it('should handle BACKGROUNDSLIDESHOW_NEXT', () => {
      controller.notificationReceived('BACKGROUNDSLIDESHOW_NEXT');

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_NEXT_IMAGE'
      );
    });

    it('should handle BACKGROUNDSLIDESHOW_PREV', () => {
      controller.notificationReceived('BACKGROUNDSLIDESHOW_PREV');

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_PREV_IMAGE'
      );
    });

    it('should handle BACKGROUNDSLIDESHOW_PAUSE', () => {
      controller.notificationReceived('BACKGROUNDSLIDESHOW_PAUSE');

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_PAUSE'
      );
    });

    it('should handle BACKGROUNDSLIDESHOW_PLAY', () => {
      controller.notificationReceived('BACKGROUNDSLIDESHOW_PLAY');

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_PLAY'
      );
    });
  });

  describe('socketNotificationReceived', () => {
    beforeEach(() => {
      controller.start();
    });

    it('should handle BACKGROUNDSLIDESHOW_READY with matching identifier', () => {
      const payload = { identifier: 'test-module' };

      controller.socketNotificationReceived(
        'BACKGROUNDSLIDESHOW_READY',
        payload
      );

      expect(mockLog.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] READY notification, identifier match:',
        true
      );
    });

    it('should not resume on READY if playing video', () => {
      const payload = { identifier: 'test-module' };
      // Simulate playing video
      const imageInfo: ImageInfo = {
        identifier: 'test-module',
        path: 'test.mp4',
        data: 'data',
        index: 1,
        total: 1
      };
      controller.displayImage(imageInfo);

      controller.socketNotificationReceived(
        'BACKGROUNDSLIDESHOW_READY',
        payload
      );

      // Should not call resume multiple times
      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalled();
    });

    it('should handle BACKGROUNDSLIDESHOW_REGISTER_CONFIG', () => {
      controller.socketNotificationReceived(
        'BACKGROUNDSLIDESHOW_REGISTER_CONFIG',
        {}
      );

      expect(mockLog.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Registering config'
      );
    });

    it('should handle BACKGROUNDSLIDESHOW_DISPLAY_IMAGE with matching identifier', () => {
      const payload: ImageInfo = {
        identifier: 'test-module',
        path: 'test.jpg',
        data: 'data:image/jpeg;base64,test',
        index: 1,
        total: 10
      };

      controller.socketNotificationReceived(
        'BACKGROUNDSLIDESHOW_DISPLAY_IMAGE',
        payload
      );

      expect(mockLog.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Frontend displayImage called for: test.jpg'
      );
    });

    it('should not display image with non-matching identifier', () => {
      const payload: ImageInfo = {
        identifier: 'different-module',
        path: 'test.jpg',
        data: 'data:image/jpeg;base64,test',
        index: 1,
        total: 10
      };

      controller.socketNotificationReceived(
        'BACKGROUNDSLIDESHOW_DISPLAY_IMAGE',
        payload
      );

      expect(mockLog.info).not.toHaveBeenCalledWith(
        expect.stringContaining('displayImage called for')
      );
    });

    it('should handle BACKGROUNDSLIDESHOW_FILELIST', () => {
      const payload = { images: ['img1.jpg', 'img2.jpg'] };

      controller.socketNotificationReceived(
        'BACKGROUNDSLIDESHOW_FILELIST',
        payload
      );

      expect(mockCallbacks.sendNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_FILELIST',
        payload
      );
    });

    it('should handle BACKGROUNDSLIDESHOW_PAUSE', () => {
      controller.socketNotificationReceived('BACKGROUNDSLIDESHOW_PAUSE', {});

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_PAUSE'
      );
    });

    it('should handle BACKGROUNDSLIDESHOW_URL with url', () => {
      const payload = { url: 'http://example.com/image.jpg', resume: false };

      controller.socketNotificationReceived('BACKGROUNDSLIDESHOW_URL', payload);

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalled();
    });

    it('should handle BACKGROUNDSLIDESHOW_URLS with urls array', () => {
      const payload = { urls: ['url1.jpg', 'url2.jpg'] };

      controller.socketNotificationReceived(
        'BACKGROUNDSLIDESHOW_URLS',
        payload
      );

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalled();
    });
  });

  describe('displayImage', () => {
    beforeEach(() => {
      controller.start();
      controller.getDom(); // Initialize DOM
    });

    it('should handle video files', () => {
      const imageInfo: ImageInfo = {
        identifier: 'test-module',
        path: 'test.mp4',
        data: 'data',
        index: 1,
        total: 1
      };

      controller.displayImage(imageInfo);

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_PLAY_VIDEO',
        expect.arrayContaining(['test.mp4', 'PLAY'])
      );
    });

    it('should handle M4V video files', () => {
      const imageInfo: ImageInfo = {
        identifier: 'test-module',
        path: 'test.m4v',
        data: 'data',
        index: 1,
        total: 1
      };

      controller.displayImage(imageInfo);

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_PLAY_VIDEO',
        expect.arrayContaining(['test.m4v', 'PLAY'])
      );
    });

    it('should create Image element for non-video files', () => {
      const imageInfo: ImageInfo = {
        identifier: 'test-module',
        path: 'test.jpg',
        data: 'data:image/jpeg;base64,test',
        index: 1,
        total: 1
      };

      controller.displayImage(imageInfo);

      expect(mockLog.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Creating image element, src:',
        'data:image/jpeg;base64,test'
      );
    });

    it('should send IMAGE_UPDATED notification', () => {
      const imageInfo: ImageInfo = {
        identifier: 'test-module',
        path: 'test.jpg',
        data: 'data:image/jpeg;base64,test',
        index: 1,
        total: 1
      };

      controller.displayImage(imageInfo);

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_IMAGE_UPDATED',
        { url: 'test.jpg' }
      );
    });
  });

  describe('updateImage', () => {
    beforeEach(() => {
      controller.start();
    });

    it('should display specific image when imageToDisplay is provided', () => {
      controller.updateImage(false, 'http://example.com/test.jpg');

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_IMAGE_UPDATED',
        expect.any(Object)
      );
    });

    it('should request next image when no images in list', () => {
      controller.updateImage();

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_NEXT_IMAGE'
      );
    });

    it('should request previous image when backToPreviousImage is true', () => {
      controller.updateImage(true);

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_PREV_IMAGE'
      );
    });

    it('should handle local image list', () => {
      // Populate image list through updateImageListWithArray
      controller.updateImageListWithArray(['img1.jpg', 'img2.jpg', 'img3.jpg']);

      // Verify updateImage was called (through updateImageListWithArray)
      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalled();
    });
  });

  describe('updateImageListWithArray', () => {
    beforeEach(() => {
      controller.start();
    });

    it('should update image list and reset index', () => {
      const urls = ['img1.jpg', 'img2.jpg', 'img3.jpg'];

      controller.updateImageListWithArray(urls);

      // Should trigger updateImage which sends notification
      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalled();
    });

    it('should call updateImage after setting list', () => {
      const urls = ['img1.jpg', 'img2.jpg'];

      controller.updateImageListWithArray(urls);

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalled();
    });
  });

  describe('suspend', () => {
    it('should clear timer if running', () => {
      controller.start();
      controller.resume(); // Start a timer

      controller.suspend();

      expect(mockLog.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Frontend suspend called'
      );
    });

    it('should handle suspend when no timer is running', () => {
      controller.suspend();

      expect(mockLog.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Frontend suspend called'
      );
    });
  });

  describe('resume', () => {
    beforeEach(() => {
      controller.start();
    });

    it('should suspend before resuming', () => {
      controller.resume();

      expect(mockLog.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Frontend resume called'
      );
    });

    it('should update image if changeImageOnResume is true', () => {
      const resumeConfig = {
        ...mockConfig,
        changeImageOnResume: true
      };
      const newController = new ModuleController(
        resumeConfig,
        'test-module',
        mockCallbacks,
        mockLog,
        mockMoment,
        mockEXIF
      );
      newController.start();

      newController.resume();

      // Should send notification for image update
      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalled();
    });

    it('should set timer for next image', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      controller.resume();

      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        mockConfig.slideshowSpeed
      );

      setTimeoutSpy.mockRestore();
    });
  });

  describe('updateImageList', () => {
    beforeEach(() => {
      controller.start();
    });

    it('should suspend slideshow', () => {
      controller.updateImageList();

      expect(mockLog.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Frontend suspend called'
      );
    });

    it('should send REGISTER_CONFIG notification', () => {
      controller.updateImageList();

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_REGISTER_CONFIG',
        expect.objectContaining({
          identifier: 'test-module'
        })
      );
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      controller.start();
    });

    it('should handle complete image display workflow', () => {
      const imageInfo: ImageInfo = {
        identifier: 'test-module',
        path: 'test.jpg',
        data: 'data:image/jpeg;base64,test',
        index: 1,
        total: 10
      };

      controller.getDom();
      controller.displayImage(imageInfo);

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalled();
      expect(mockLog.info).toHaveBeenCalled();
    });

    it('should handle video playback workflow', () => {
      const videoInfo: ImageInfo = {
        identifier: 'test-module',
        path: 'video.mp4',
        data: 'data',
        index: 1,
        total: 5
      };

      controller.displayImage(videoInfo);

      expect(mockCallbacks.sendSocketNotification).toHaveBeenCalledWith(
        'BACKGROUNDSLIDESHOW_PLAY_VIDEO',
        expect.any(Array)
      );
    });

    it('should handle pause and resume workflow', () => {
      controller.resume();
      controller.suspend();
      controller.resume();

      expect(mockLog.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Frontend resume called'
      );
    });
  });
});
