/**
 * ImageHandler.test.ts
 *
 * Unit tests for ImageHandler - Public API only
 * @jest-environment jsdom
 */

import ImageHandler from './ImageHandler';
import type { ModuleConfig } from '../types';

// Mock global CSS
(globalThis as Record<string, unknown>).CSS = {
  supports: jest.fn()
};

// Mock global EXIF
const EXIF = {
  getData: jest.fn(),
  getTag: jest.fn()
};
(globalThis as Record<string, unknown>).EXIF = EXIF;

describe('ImageHandler', () => {
  let handler: ImageHandler;
  let mockConfig: Partial<ModuleConfig>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      fitPortraitImages: true,
      backgroundAnimationEnabled: true,
      animations: ['fade', 'zoom'],
      backgroundAnimationDuration: '3s',
      transitionSpeed: '1s',
      backgroundAnimationLoopCount: '1'
    };

    (CSS.supports as jest.Mock).mockReturnValue(true);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      handler = new ImageHandler(mockConfig as ModuleConfig);

      expect(handler).toBeInstanceOf(ImageHandler);
    });

    it('should check for native EXIF orientation support', () => {
      handler = new ImageHandler(mockConfig as ModuleConfig);

      expect(CSS.supports).toHaveBeenCalledWith(
        'image-orientation: from-image'
      );
    });

    it('should handle browsers without EXIF support', () => {
      (CSS.supports as jest.Mock).mockReturnValue(false);

      handler = new ImageHandler(mockConfig as ModuleConfig);

      expect(handler).toBeInstanceOf(ImageHandler);
    });
  });

  describe('createImageDiv', () => {
    beforeEach(() => {
      handler = new ImageHandler(mockConfig as ModuleConfig);
    });

    it('should create a div element', () => {
      const div = handler.createImageDiv();

      expect(div).toBeInstanceOf(HTMLDivElement);
      expect(div.tagName).toBe('DIV');
    });

    it('should apply backgroundSize from config', () => {
      mockConfig.backgroundSize = 'contain';
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const div = handler.createImageDiv();

      expect(div.style.backgroundSize).toBe('contain');
    });

    it('should apply backgroundPosition from config', () => {
      mockConfig.backgroundPosition = 'center center';
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const div = handler.createImageDiv();

      // jsdom may normalize the style value
      expect(div.style.backgroundPosition).toBeTruthy();
    });

    it('should set className to "image"', () => {
      const div = handler.createImageDiv();

      expect(div.className).toBe('image');
    });

    it('should handle different background sizes', () => {
      const sizes = ['cover', 'contain', '100% 100%', 'auto'];

      sizes.forEach((size) => {
        mockConfig.backgroundSize = size;
        handler = new ImageHandler(mockConfig as ModuleConfig);
        const div = handler.createImageDiv();

        expect(div.style.backgroundSize).toBe(size);
      });
    });
  });

  describe('applyFitMode', () => {
    let div: HTMLDivElement;

    beforeEach(() => {
      handler = new ImageHandler(mockConfig as ModuleConfig);
      div = document.createElement('div');
      // Mock window dimensions (landscape screen)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080
      });
    });

    it('should return false when fitPortraitImages is disabled', () => {
      mockConfig.fitPortraitImages = false;
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const mockImage = { width: 800, height: 1200 } as HTMLImageElement;
      const result = handler.applyFitMode(div, mockImage);

      expect(result).toBe(false);
      expect(div.classList.contains('portrait-mode')).toBe(false);
    });

    it('should add portrait-mode class for portrait images on landscape screen', () => {
      const mockImage = { width: 800, height: 1200 } as HTMLImageElement;

      const result = handler.applyFitMode(div, mockImage);

      expect(result).toBe(true);
      expect(div.classList.contains('portrait-mode')).toBe(true);
    });

    it('should return false for landscape images', () => {
      const mockImage = { width: 1920, height: 1080 } as HTMLImageElement;

      const result = handler.applyFitMode(div, mockImage);

      expect(result).toBe(false);
      expect(div.classList.contains('portrait-mode')).toBe(false);
    });

    it('should return false for portrait image on portrait screen', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1080 });
      Object.defineProperty(window, 'innerHeight', { value: 1920 });

      const mockImage = { width: 800, height: 1200 } as HTMLImageElement;
      const result = handler.applyFitMode(div, mockImage);

      expect(result).toBe(false);
      expect(div.classList.contains('portrait-mode')).toBe(false);
    });

    it('should handle square images as landscape', () => {
      const mockImage = { width: 1000, height: 1000 } as HTMLImageElement;

      const result = handler.applyFitMode(div, mockImage);

      expect(result).toBe(false);
    });

    it('should handle very tall portrait images', () => {
      const mockImage = { width: 600, height: 2400 } as HTMLImageElement;

      const result = handler.applyFitMode(div, mockImage);

      expect(result).toBe(true);
      expect(div.classList.contains('portrait-mode')).toBe(true);
    });
  });

  describe('applyAnimation', () => {
    let div: HTMLDivElement;

    beforeEach(() => {
      handler = new ImageHandler(mockConfig as ModuleConfig);
      div = document.createElement('div');
      div.className = 'image';
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      Object.defineProperty(window, 'innerHeight', { value: 1080 });
    });

    it('should do nothing when animations are disabled', () => {
      mockConfig.backgroundAnimationEnabled = false;
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const mockImage = { width: 1920, height: 1080 } as HTMLImageElement;
      handler.applyAnimation(div, mockImage);

      expect(div.style.animationDuration).toBe('');
    });

    it('should do nothing when animations array is empty', () => {
      mockConfig.animations = [];
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const mockImage = { width: 1920, height: 1080 } as HTMLImageElement;
      handler.applyAnimation(div, mockImage);

      expect(div.style.animationDuration).toBe('');
    });

    it('should set animation duration from config', () => {
      mockConfig.backgroundAnimationDuration = '5s';
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const mockImage = { width: 1920, height: 1080 } as HTMLImageElement;
      handler.applyAnimation(div, mockImage);

      expect(div.style.animationDuration).toBe('5s');
    });

    it('should set animation delay from transitionSpeed', () => {
      mockConfig.transitionSpeed = '2s';
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const mockImage = { width: 1920, height: 1080 } as HTMLImageElement;
      handler.applyAnimation(div, mockImage);

      expect(div.style.animationDelay).toBe('2s');
    });

    it('should apply animation class to div', () => {
      mockConfig.animations = ['fade'];
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const mockImage = { width: 1920, height: 1080 } as HTMLImageElement;
      handler.applyAnimation(div, mockImage);

      expect(div.className).toContain('fade');
    });

    it('should handle slide animation', () => {
      mockConfig.animations = ['slide'];
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const mockImage = { width: 3840, height: 2160 } as HTMLImageElement;
      handler.applyAnimation(div, mockImage);

      // Should have animation properties set
      expect(div.style.animationDuration).toBe('3s');
      expect(div.style.animationDelay).toBe('1s');
      // Should have slide class added (either slideH, slideHInv, slideV, or slideVInv)
      expect(div.className.includes('slide')).toBe(true);
    });

    it('should randomly select from multiple animations', () => {
      mockConfig.animations = ['fade', 'zoom', 'blur'];
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const mockImage = { width: 1920, height: 1080 } as HTMLImageElement;
      handler.applyAnimation(div, mockImage);

      // Should have one of the animation classes
      const hasAnimation =
        div.className.includes('fade') ||
        div.className.includes('zoom') ||
        div.className.includes('blur');
      expect(hasAnimation).toBe(true);
    });
  });

  describe('getImageTransformCss', () => {
    beforeEach(() => {
      handler = new ImageHandler(mockConfig as ModuleConfig);
    });

    it('should return no rotation for orientation 1', () => {
      const result = handler.getImageTransformCss(1);

      expect(result).toBe('rotate(0deg)');
    });

    it('should return horizontal flip for orientation 2', () => {
      const result = handler.getImageTransformCss(2);

      expect(result).toBe('scaleX(-1)');
    });

    it('should return 180 degree rotation for orientation 3', () => {
      const result = handler.getImageTransformCss(3);

      expect(result).toBe('scaleX(-1) scaleY(-1)');
    });

    it('should return vertical flip for orientation 4', () => {
      const result = handler.getImageTransformCss(4);

      expect(result).toBe('scaleY(-1)');
    });

    it('should return flipped 90 degree rotation for orientation 5', () => {
      const result = handler.getImageTransformCss(5);

      expect(result).toBe('scaleX(-1) rotate(90deg)');
    });

    it('should return 90 degree rotation for orientation 6', () => {
      const result = handler.getImageTransformCss(6);

      expect(result).toBe('rotate(90deg)');
    });

    it('should return flipped -90 degree rotation for orientation 7', () => {
      const result = handler.getImageTransformCss(7);

      expect(result).toBe('scaleX(-1) rotate(-90deg)');
    });

    it('should return -90 degree rotation for orientation 8', () => {
      const result = handler.getImageTransformCss(8);

      expect(result).toBe('rotate(-90deg)');
    });

    it('should return default rotation for invalid orientation', () => {
      const result = handler.getImageTransformCss(99);

      expect(result).toBe('rotate(0deg)');
    });

    it('should handle all 8 EXIF orientations', () => {
      const orientations = [1, 2, 3, 4, 5, 6, 7, 8];

      orientations.forEach((orientation) => {
        const result = handler.getImageTransformCss(orientation);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('applyExifOrientation', () => {
    let div: HTMLDivElement;
    let mockImage: HTMLImageElement;

    beforeEach(() => {
      div = document.createElement('div');
      mockImage = new Image();
    });

    it('should do nothing when browser supports native EXIF orientation', () => {
      (CSS.supports as jest.Mock).mockReturnValue(true);
      handler = new ImageHandler(mockConfig as ModuleConfig);

      handler.applyExifOrientation(div, mockImage);

      expect(EXIF.getData).not.toHaveBeenCalled();
    });

    it('should use EXIF library when browser lacks native support', () => {
      (CSS.supports as jest.Mock).mockReturnValue(false);
      handler = new ImageHandler(mockConfig as ModuleConfig);

      handler.applyExifOrientation(div, mockImage);

      expect(EXIF.getData).toHaveBeenCalledWith(
        mockImage,
        expect.any(Function)
      );
    });

    it('should apply correct transform for EXIF orientation 6', () => {
      (CSS.supports as jest.Mock).mockReturnValue(false);
      handler = new ImageHandler(mockConfig as ModuleConfig);

      (EXIF.getData as jest.Mock).mockImplementation(
        (img: HTMLImageElement, callback: () => void) => {
          callback();
        }
      );
      (EXIF.getTag as jest.Mock).mockReturnValue(6);

      handler.applyExifOrientation(div, mockImage);

      expect(EXIF.getTag).toHaveBeenCalledWith(mockImage, 'Orientation');
      expect(div.style.transform).toBe('rotate(90deg)');
    });

    it('should apply correct transform for EXIF orientation 3', () => {
      (CSS.supports as jest.Mock).mockReturnValue(false);
      handler = new ImageHandler(mockConfig as ModuleConfig);

      (EXIF.getData as jest.Mock).mockImplementation(
        (img: HTMLImageElement, callback: () => void) => {
          callback();
        }
      );
      (EXIF.getTag as jest.Mock).mockReturnValue(3);

      handler.applyExifOrientation(div, mockImage);

      expect(div.style.transform).toBe('scaleX(-1) scaleY(-1)');
    });

    it('should handle callback from EXIF.getData', () => {
      (CSS.supports as jest.Mock).mockReturnValue(false);
      handler = new ImageHandler(mockConfig as ModuleConfig);

      let callbackFn: (() => void) | undefined;
      (EXIF.getData as jest.Mock).mockImplementation(
        (img: HTMLImageElement, callback: () => void) => {
          callbackFn = callback;
        }
      );
      (EXIF.getTag as jest.Mock).mockReturnValue(8);

      handler.applyExifOrientation(div, mockImage);

      expect(callbackFn).toBeDefined();
      callbackFn!();

      expect(div.style.transform).toBe('rotate(-90deg)');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      handler = new ImageHandler(mockConfig as ModuleConfig);
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      Object.defineProperty(window, 'innerHeight', { value: 1080 });
    });

    it('should handle complete workflow for portrait image', () => {
      const div = handler.createImageDiv();
      expect(div.className).toBe('image');

      const mockImage = { width: 800, height: 1200 } as HTMLImageElement;

      const fitApplied = handler.applyFitMode(div, mockImage);
      expect(fitApplied).toBe(true);

      handler.applyAnimation(div, mockImage);
      expect(div.style.animationDuration).toBe('3s');
    });

    it('should handle complete workflow for landscape image', () => {
      const div = handler.createImageDiv();
      const mockImage = { width: 1920, height: 1080 } as HTMLImageElement;

      handler.applyFitMode(div, mockImage);
      handler.applyAnimation(div, mockImage);

      expect(div.style.animationDuration).toBe('3s');
      expect(div.style.animationDelay).toBe('1s');
    });

    it('should handle workflow without animations', () => {
      mockConfig.backgroundAnimationEnabled = false;
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const div = handler.createImageDiv();
      const mockImage = { width: 1920, height: 1080 } as HTMLImageElement;

      handler.applyFitMode(div, mockImage);
      handler.applyAnimation(div, mockImage);

      expect(div.style.animationDuration).toBe('');
    });

    it('should handle EXIF orientation workflow', () => {
      (CSS.supports as jest.Mock).mockReturnValue(false);
      handler = new ImageHandler(mockConfig as ModuleConfig);

      const div = handler.createImageDiv();
      const mockImage = new Image();

      (EXIF.getData as jest.Mock).mockImplementation(
        (img: HTMLImageElement, callback: () => void) => {
          callback();
        }
      );
      (EXIF.getTag as jest.Mock).mockReturnValue(6);

      handler.applyExifOrientation(div, mockImage);

      expect(div.style.transform).toBe('rotate(90deg)');
    });

    it('should create and configure multiple images independently', () => {
      const div1 = handler.createImageDiv();
      const div2 = handler.createImageDiv();

      expect(div1).not.toBe(div2);
      expect(div1.className).toBe('image');
      expect(div2.className).toBe('image');

      const image1 = { width: 800, height: 1200 } as HTMLImageElement;
      const image2 = { width: 1920, height: 1080 } as HTMLImageElement;

      handler.applyFitMode(div1, image1);
      handler.applyFitMode(div2, image2);

      expect(div1.classList.contains('portrait-mode')).toBe(true);
      expect(div2.classList.contains('portrait-mode')).toBe(false);
    });
  });
});
