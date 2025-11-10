/**
 * ImageHandler.test.js
 *
 * Unit tests for ImageHandler
 */

// Mock the Logger
jest.mock('./Logger.js');

// Mock browser globals
global.CSS = {
  supports: jest.fn()
};

global.window = {
  innerWidth: 1920,
  innerHeight: 1080
};

global.document = {
  createElement: jest.fn()
};

global.EXIF = {
  getData: jest.fn(),
  getTag: jest.fn()
};

global.Math.random = jest.fn();

const ImageHandler = require('./ImageHandler');
const Log = require('./Logger.js');

describe('ImageHandler', () => {
  let imageHandler;
  let mockConfig;
  let mockDiv;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default config
    mockConfig = {
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      fitPortraitImages: true,
      backgroundAnimationEnabled: true,
      animations: ['fade', 'slide', 'zoom'],
      backgroundAnimationDuration: '3s',
      transitionSpeed: '1s',
      backgroundAnimationLoopCount: 1
    };

    // Mock div element
    mockDiv = {
      style: {},
      className: '',
      classList: {
        add: jest.fn()
      }
    };

    global.document.createElement.mockReturnValue(mockDiv);
    global.CSS.supports.mockReturnValue(true);
    global.Math.random.mockReturnValue(0.5);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      imageHandler = new ImageHandler(mockConfig);

      expect(imageHandler.config).toBe(mockConfig);
    });

    it('should check for native EXIF orientation support', () => {
      global.CSS.supports.mockReturnValue(true);

      imageHandler = new ImageHandler(mockConfig);

      expect(global.CSS.supports).toHaveBeenCalledWith('image-orientation: from-image');
      expect(imageHandler.browserSupportsExifOrientationNatively).toBe(true);
    });

    it('should handle browsers without native EXIF support', () => {
      global.CSS.supports.mockReturnValue(false);

      imageHandler = new ImageHandler(mockConfig);

      expect(imageHandler.browserSupportsExifOrientationNatively).toBe(false);
    });
  });

  describe('createImageDiv', () => {
    beforeEach(() => {
      imageHandler = new ImageHandler(mockConfig);
    });

    it('should create a div element', () => {
      const div = imageHandler.createImageDiv();

      expect(global.document.createElement).toHaveBeenCalledWith('div');
      expect(div).toBe(mockDiv);
    });

    it('should apply backgroundSize from config', () => {
      mockConfig.backgroundSize = 'contain';

      const div = imageHandler.createImageDiv();

      expect(div.style.backgroundSize).toBe('contain');
    });

    it('should apply backgroundPosition from config', () => {
      mockConfig.backgroundPosition = 'top left';

      const div = imageHandler.createImageDiv();

      expect(div.style.backgroundPosition).toBe('top left');
    });

    it('should set className to "image"', () => {
      const div = imageHandler.createImageDiv();

      expect(div.className).toBe('image');
    });
  });

  describe('applyFitMode', () => {
    beforeEach(() => {
      imageHandler = new ImageHandler(mockConfig);
    });

    it('should return false if fitPortraitImages is disabled', () => {
      mockConfig.fitPortraitImages = false;
      const mockImage = {width: 800,
        height: 1200};

      const result = imageHandler.applyFitMode(mockDiv, mockImage);

      expect(result).toBe(false);
      expect(mockDiv.classList.add).not.toHaveBeenCalled();
    });

    it('should add portrait-mode class for portrait images on landscape screen', () => {
      global.window.innerWidth = 1920;
      global.window.innerHeight = 1080;
      const mockImage = {width: 800,
        height: 1200}; // Portrait

      const result = imageHandler.applyFitMode(mockDiv, mockImage);

      expect(result).toBe(true);
      expect(mockDiv.classList.add).toHaveBeenCalledWith('portrait-mode');
      expect(Log.debug).toHaveBeenCalled();
    });

    it('should add landscape-mode class for landscape images', () => {
      global.window.innerWidth = 1920;
      global.window.innerHeight = 1080;
      const mockImage = {width: 1600,
        height: 900}; // Landscape

      const result = imageHandler.applyFitMode(mockDiv, mockImage);

      expect(result).toBe(true);
      expect(mockDiv.classList.add).toHaveBeenCalledWith('landscape-mode');
      expect(Log.debug).toHaveBeenCalled();
    });

    it('should return false for portrait images on portrait screen', () => {
      global.window.innerWidth = 1080;
      global.window.innerHeight = 1920;
      const mockImage = {width: 800,
        height: 1200}; // Portrait

      const result = imageHandler.applyFitMode(mockDiv, mockImage);

      expect(result).toBe(false);
      expect(mockDiv.classList.add).not.toHaveBeenCalled();
    });

    it('should handle square images as landscape', () => {
      global.window.innerWidth = 1920;
      global.window.innerHeight = 1080;
      const mockImage = {width: 1000,
        height: 1000}; // Square

      const result = imageHandler.applyFitMode(mockDiv, mockImage);

      expect(result).toBe(true);
      expect(mockDiv.classList.add).toHaveBeenCalledWith('landscape-mode');
    });
  });

  describe('applyAnimation', () => {
    beforeEach(() => {
      imageHandler = new ImageHandler(mockConfig);
    });

    it('should do nothing if animations are disabled', () => {
      mockConfig.backgroundAnimationEnabled = false;

      imageHandler.applyAnimation(mockDiv, {width: 1920,
        height: 1080});

      expect(mockDiv.style.animationDuration).toBeUndefined();
    });

    it('should do nothing if animations array is empty', () => {
      mockConfig.animations = [];

      imageHandler.applyAnimation(mockDiv, {width: 1920,
        height: 1080});

      expect(mockDiv.style.animationDuration).toBeUndefined();
    });

    it('should set animation duration from config', () => {
      mockConfig.backgroundAnimationDuration = '5s';
      global.Math.random.mockReturnValue(0); // Select first animation

      imageHandler.applyAnimation(mockDiv, {width: 1920,
        height: 1080});

      expect(mockDiv.style.animationDuration).toBe('5s');
    });

    it('should set animation delay from transitionSpeed', () => {
      mockConfig.transitionSpeed = '2s';
      global.Math.random.mockReturnValue(0);

      imageHandler.applyAnimation(mockDiv, {width: 1920,
        height: 1080});

      expect(mockDiv.style.animationDelay).toBe('2s');
    });

    it('should apply non-slide animation class', () => {
      mockConfig.animations = ['fade', 'zoom'];
      global.Math.random.mockReturnValue(0); // Select 'fade'
      mockDiv.className = 'image';

      imageHandler.applyAnimation(mockDiv, {width: 1920,
        height: 1080});

      expect(mockDiv.className).toBe('image fade');
    });

    it('should call applySlideAnimation for slide animation', () => {
      mockConfig.animations = ['slide'];
      global.Math.random.mockReturnValue(0);
      const mockImage = {width: 1920,
        height: 1080};
      const spy = jest.spyOn(imageHandler, 'applySlideAnimation');

      imageHandler.applyAnimation(mockDiv, mockImage);

      expect(spy).toHaveBeenCalledWith(mockDiv, mockImage);
    });

    it('should randomly select animation from array', () => {
      mockConfig.animations = ['fade', 'zoom', 'blur'];
      global.Math.random.mockReturnValue(0.9); // Select last animation
      mockDiv.className = 'image';

      imageHandler.applyAnimation(mockDiv, {width: 1920,
        height: 1080});

      expect(mockDiv.className).toBe('image blur');
    });
  });

  describe('applySlideAnimation', () => {
    beforeEach(() => {
      imageHandler = new ImageHandler(mockConfig);
      global.window.innerWidth = 1920;
      global.window.innerHeight = 1080;
    });

    it('should set backgroundPosition to empty string', () => {
      const mockImage = {width: 3840,
        height: 2160};

      imageHandler.applySlideAnimation(mockDiv, mockImage);

      expect(mockDiv.style.backgroundPosition).toBe('');
    });

    it('should set animationIterationCount from config', () => {
      mockConfig.backgroundAnimationLoopCount = 3;
      const mockImage = {width: 1920,
        height: 1080};

      imageHandler.applySlideAnimation(mockDiv, mockImage);

      expect(mockDiv.style.animationIterationCount).toBe(3);
    });

    it('should set backgroundSize to cover', () => {
      const mockImage = {width: 1920,
        height: 1080};

      imageHandler.applySlideAnimation(mockDiv, mockImage);

      expect(mockDiv.style.backgroundSize).toBe('cover');
    });

    it('should add horizontal slide class for wide images', () => {
      // Wide image that needs horizontal scroll
      const mockImage = {width: 3840,
        height: 1080};
      mockDiv.className = 'image';
      global.Math.random.mockReturnValue(0.6); // Select slideH

      imageHandler.applySlideAnimation(mockDiv, mockImage);

      expect(mockDiv.className).toBe('image slideH');
    });

    it('should add horizontal inverse slide class for wide images', () => {
      const mockImage = {width: 3840,
        height: 1080};
      mockDiv.className = 'image';
      global.Math.random.mockReturnValue(0.4); // Select slideHInv

      imageHandler.applySlideAnimation(mockDiv, mockImage);

      expect(mockDiv.className).toBe('image slideHInv');
    });

    it('should add vertical slide class for tall images', () => {
      // Tall image that needs vertical scroll
      const mockImage = {width: 1920,
        height: 3240};
      mockDiv.className = 'image';
      global.Math.random.mockReturnValue(0.6); // Select slideV

      imageHandler.applySlideAnimation(mockDiv, mockImage);

      expect(mockDiv.className).toBe('image slideV');
    });

    it('should add vertical inverse slide class for tall images', () => {
      const mockImage = {width: 1920,
        height: 3240};
      mockDiv.className = 'image';
      global.Math.random.mockReturnValue(0.4); // Select slideVInv

      imageHandler.applySlideAnimation(mockDiv, mockImage);

      expect(mockDiv.className).toBe('image slideVInv');
    });
  });

  describe('getImageTransformCss', () => {
    beforeEach(() => {
      imageHandler = new ImageHandler(mockConfig);
    });

    it('should return no rotation for orientation 1', () => {
      const result = imageHandler.getImageTransformCss(1);

      expect(result).toBe('rotate(0deg)');
    });

    it('should return horizontal flip for orientation 2', () => {
      const result = imageHandler.getImageTransformCss(2);

      expect(result).toBe('scaleX(-1)');
    });

    it('should return 180 degree rotation for orientation 3', () => {
      const result = imageHandler.getImageTransformCss(3);

      expect(result).toBe('scaleX(-1) scaleY(-1)');
    });

    it('should return vertical flip for orientation 4', () => {
      const result = imageHandler.getImageTransformCss(4);

      expect(result).toBe('scaleY(-1)');
    });

    it('should return flipped 90 degree rotation for orientation 5', () => {
      const result = imageHandler.getImageTransformCss(5);

      expect(result).toBe('scaleX(-1) rotate(90deg)');
    });

    it('should return 90 degree rotation for orientation 6', () => {
      const result = imageHandler.getImageTransformCss(6);

      expect(result).toBe('rotate(90deg)');
    });

    it('should return flipped -90 degree rotation for orientation 7', () => {
      const result = imageHandler.getImageTransformCss(7);

      expect(result).toBe('scaleX(-1) rotate(-90deg)');
    });

    it('should return -90 degree rotation for orientation 8', () => {
      const result = imageHandler.getImageTransformCss(8);

      expect(result).toBe('rotate(-90deg)');
    });

    it('should return default rotation for undefined orientation', () => {
      const result = imageHandler.getImageTransformCss();

      expect(result).toBe('rotate(0deg)');
    });

    it('should return default rotation for invalid orientation', () => {
      const result = imageHandler.getImageTransformCss(99);

      expect(result).toBe('rotate(0deg)');
    });
  });

  describe('applyExifOrientation', () => {
    beforeEach(() => {
      imageHandler = new ImageHandler(mockConfig);
    });

    it('should do nothing if browser supports native EXIF orientation', () => {
      global.CSS.supports.mockReturnValue(true);
      imageHandler.browserSupportsExifOrientationNatively = true;
      const mockImage = {};

      imageHandler.applyExifOrientation(mockDiv, mockImage);

      expect(global.EXIF.getData).not.toHaveBeenCalled();
    });

    it('should apply EXIF transform if browser does not support native orientation', () => {
      imageHandler.browserSupportsExifOrientationNatively = false;
      const mockImage = {};
      let dataCallback;

      global.EXIF.getData.mockImplementation((img, callback) => {
        dataCallback = callback;
      });
      global.EXIF.getTag.mockReturnValue(6); // 90 degree rotation

      imageHandler.applyExifOrientation(mockDiv, mockImage);

      expect(global.EXIF.getData).toHaveBeenCalledWith(mockImage, expect.any(Function));

      // Execute the callback
      dataCallback();

      expect(global.EXIF.getTag).toHaveBeenCalledWith(mockImage, 'Orientation');
      expect(mockDiv.style.transform).toBe('rotate(90deg)');
    });

    it('should handle EXIF orientation 3 (180 degree)', () => {
      imageHandler.browserSupportsExifOrientationNatively = false;
      const mockImage = {};
      let dataCallback;

      global.EXIF.getData.mockImplementation((img, callback) => {
        dataCallback = callback;
      });
      global.EXIF.getTag.mockReturnValue(3);

      imageHandler.applyExifOrientation(mockDiv, mockImage);
      dataCallback();

      expect(mockDiv.style.transform).toBe('scaleX(-1) scaleY(-1)');
    });

    it('should handle EXIF orientation 8 (-90 degree)', () => {
      imageHandler.browserSupportsExifOrientationNatively = false;
      const mockImage = {};
      let dataCallback;

      global.EXIF.getData.mockImplementation((img, callback) => {
        dataCallback = callback;
      });
      global.EXIF.getTag.mockReturnValue(8);

      imageHandler.applyExifOrientation(mockDiv, mockImage);
      dataCallback();

      expect(mockDiv.style.transform).toBe('rotate(-90deg)');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      imageHandler = new ImageHandler(mockConfig);
    });

    it('should handle complete image setup workflow', () => {
      // Create div
      const div = imageHandler.createImageDiv();
      expect(div.className).toBe('image');

      // Apply fit mode for portrait
      const mockImage = {width: 800,
        height: 1200};
      const fitApplied = imageHandler.applyFitMode(div, mockImage);
      expect(fitApplied).toBe(true);

      // Apply animation
      global.Math.random.mockReturnValue(0);
      imageHandler.applyAnimation(div, mockImage);
      expect(div.style.animationDuration).toBe('3s');
    });

    it('should handle landscape image workflow', () => {
      const div = imageHandler.createImageDiv();
      const mockImage = {width: 1920,
        height: 1080};

      imageHandler.applyFitMode(div, mockImage);
      expect(mockDiv.classList.add).toHaveBeenCalledWith('landscape-mode');

      imageHandler.applyAnimation(div, mockImage);
      expect(div.style.animationDuration).toBeDefined();
    });
  });
});

