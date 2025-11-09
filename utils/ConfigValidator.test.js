/**
 * ConfigValidator.test.js
 *
 * Unit tests for ConfigValidator
 */

// Mock the logger
jest.mock('./Logger.js');

const ConfigValidator = require('./ConfigValidator');
const Log = require('./Logger.js');

describe('ConfigValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateConfig', () => {
    describe('sortImagesBy normalization', () => {
      it('should convert sortImagesBy to lowercase', () => {
        const config = {
          sortImagesBy: 'RANDOM',
          imageInfo: 'name',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.sortImagesBy).toBe('random');
      });

      it('should handle mixed case sortImagesBy', () => {
        const config = {
          sortImagesBy: 'CreatedDate',
          imageInfo: 'name',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.sortImagesBy).toBe('createddate');
      });
    });

    describe('imageInfo validation', () => {
      it('should convert valid imageInfo to lowercase array', () => {
        const config = {
          sortImagesBy: 'random',
          showImageInfo: true,
          imageInfo: 'NAME,DATE',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.imageInfo).toEqual(['name', 'date']);
      });

      it('should handle imageInfo with spaces', () => {
        const config = {
          sortImagesBy: 'random',
          showImageInfo: true,
          imageInfo: 'name date',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.imageInfo).toEqual(['name', 'date']);
      });

      it('should handle imageInfo with mixed spaces and commas', () => {
        const config = {
          sortImagesBy: 'random',
          showImageInfo: true,
          imageInfo: 'name, date',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.imageInfo).toEqual(['name', 'date']);
      });

      it('should filter out empty values from imageInfo', () => {
        const config = {
          sortImagesBy: 'random',
          showImageInfo: true,
          imageInfo: 'name,,date,',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.imageInfo).toEqual(['name', 'date']);
      });

      it('should warn and default to ["name"] when showImageInfo is true but imageInfo is invalid', () => {
        const config = {
          sortImagesBy: 'random',
          showImageInfo: true,
          imageInfo: 'invalid',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(Log.warn).toHaveBeenCalledWith(expect.stringContaining('showImageInfo is set, but imageInfo does not have a valid value.'));
        expect(result.imageInfo).toEqual(['name']);
      });

      it('should accept "name" as valid imageInfo', () => {
        const config = {
          sortImagesBy: 'random',
          showImageInfo: true,
          imageInfo: 'name',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(Log.warn).not.toHaveBeenCalled();
        expect(result.imageInfo).toEqual(['name']);
      });

      it('should accept "date" as valid imageInfo', () => {
        const config = {
          sortImagesBy: 'random',
          showImageInfo: true,
          imageInfo: 'date',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(Log.warn).not.toHaveBeenCalled();
        expect(result.imageInfo).toEqual(['date']);
      });

      it('should handle case-insensitive "NAME" and "DATE"', () => {
        const config = {
          sortImagesBy: 'random',
          showImageInfo: true,
          imageInfo: 'NAME DATE',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(Log.warn).not.toHaveBeenCalled();
        expect(result.imageInfo).toEqual(['name', 'date']);
      });

      it('should process imageInfo even when showImageInfo is false', () => {
        const config = {
          sortImagesBy: 'random',
          showImageInfo: false,
          imageInfo: 'name,date',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.imageInfo).toEqual(['name', 'date']);
      });
    });

    describe('transitionSpeed behavior', () => {
      it('should set transitionSpeed to "0" when transitionImages is false', () => {
        const config = {
          sortImagesBy: 'random',
          imageInfo: 'name',
          slideshowSpeed: 5000,
          transitionImages: false,
          transitionSpeed: '500ms',
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.transitionSpeed).toBe('0');
      });

      it('should not modify transitionSpeed when transitionImages is true', () => {
        const config = {
          sortImagesBy: 'random',
          imageInfo: 'name',
          slideshowSpeed: 5000,
          transitionImages: true,
          transitionSpeed: '500ms',
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.transitionSpeed).toBe('500ms');
      });
    });

    describe('backgroundAnimationDuration behavior', () => {
      it('should match backgroundAnimationDuration to slideshowSpeed when set to default "1s"', () => {
        const config = {
          sortImagesBy: 'random',
          imageInfo: 'name',
          slideshowSpeed: 10000,
          transitionImages: true,
          backgroundAnimationDuration: '1s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.backgroundAnimationDuration).toBe('10s');
      });

      it('should not modify backgroundAnimationDuration when not "1s"', () => {
        const config = {
          sortImagesBy: 'random',
          imageInfo: 'name',
          slideshowSpeed: 10000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.backgroundAnimationDuration).toBe('5s');
      });

      it('should calculate correct seconds from milliseconds', () => {
        const config = {
          sortImagesBy: 'random',
          imageInfo: 'name',
          slideshowSpeed: 7500,
          transitionImages: true,
          backgroundAnimationDuration: '1s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.backgroundAnimationDuration).toBe('7.5s');
      });

      it('should handle very short slideshow speeds', () => {
        const config = {
          sortImagesBy: 'random',
          imageInfo: 'name',
          slideshowSpeed: 500,
          transitionImages: true,
          backgroundAnimationDuration: '1s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.backgroundAnimationDuration).toBe('0.5s');
      });
    });

    describe('complete configuration flow', () => {
      it('should handle a complete typical configuration', () => {
        const config = {
          sortImagesBy: 'RANDOM',
          showImageInfo: true,
          imageInfo: 'NAME, DATE',
          slideshowSpeed: 6000,
          transitionImages: true,
          transitionSpeed: '1000ms',
          backgroundAnimationDuration: '1s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.sortImagesBy).toBe('random');
        expect(result.imageInfo).toEqual(['name', 'date']);
        expect(result.transitionSpeed).toBe('1000ms');
        expect(result.backgroundAnimationDuration).toBe('6s');
      });

      it('should handle configuration with transitions disabled', () => {
        const config = {
          sortImagesBy: 'createdDate',
          showImageInfo: false,
          imageInfo: 'date',
          slideshowSpeed: 5000,
          transitionImages: false,
          transitionSpeed: '1000ms',
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result.sortImagesBy).toBe('createddate');
        expect(result.imageInfo).toEqual(['date']);
        expect(result.transitionSpeed).toBe('0');
        expect(result.backgroundAnimationDuration).toBe('5s');
      });

      it('should return the modified config object', () => {
        const config = {
          sortImagesBy: 'random',
          imageInfo: 'name',
          slideshowSpeed: 5000,
          transitionImages: true,
          backgroundAnimationDuration: '5s'
        };

        const result = ConfigValidator.validateConfig(config);

        expect(result).toBe(config);
        expect(result).toHaveProperty('sortImagesBy');
        expect(result).toHaveProperty('imageInfo');
      });
    });
  });
});
