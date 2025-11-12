/**
 * UIBuilder.test.ts
 *
 * Unit tests for UIBuilder
 * @jest-environment jsdom
 */

import UIBuilder from './UIBuilder';
import type { ImageInfo, ModuleConfig } from '../types';

// Mock Log for updateImageInfo
global.Log = {
  warn: jest.fn()
};

// Helper function to create mock image info
const createMockImageInfo = (overrides: Partial<ImageInfo> = {}): ImageInfo =>
  ({
    identifier: '',
    path: '/path/to/image.jpg',
    data: '',
    index: 5,
    total: 20,
    width: 1920,
    height: 1080,
    ...overrides
  }) as ImageInfo;

// Helper function to create mock translate
const createMockTranslate = (translations: Record<string, string> = {}) => {
  const defaults: Record<string, string> = {
    PICTURE_INFO: 'Picture Information'
  };
  return (key: string) => translations[key] || defaults[key] || key;
};

describe('UIBuilder', () => {
  let builder: UIBuilder;
  let mockConfig: Partial<ModuleConfig>;
  let wrapper: HTMLDivElement;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      imageInfoLocation: 'bottomLeft',
      imageInfo: ['date', 'name', 'imagecount'],
      imageInfoNoFileExt: false
    };

    builder = new UIBuilder(mockConfig as ModuleConfig);
    wrapper = document.createElement('div');
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(builder).toBeInstanceOf(UIBuilder);
    });

    it('should create instance with empty config', () => {
      const emptyBuilder = new UIBuilder({} as ModuleConfig);

      expect(emptyBuilder).toBeInstanceOf(UIBuilder);
    });

    it('should use config values in public methods', () => {
      mockConfig.imageInfoLocation = 'topRight';
      builder = new UIBuilder(mockConfig as ModuleConfig);

      const infoDiv = builder.createImageInfoDiv(wrapper);

      expect(infoDiv.className).toContain('topRight');
    });
  });

  describe('createGradientDiv', () => {
    it('should create div with gradient class', () => {
      const gradient = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'];

      builder.createGradientDiv('bottom', gradient, wrapper);

      const gradientDiv = wrapper.querySelector('.gradient');
      expect(gradientDiv).not.toBeNull();
      expect(gradientDiv?.className).toBe('gradient');
    });

    it('should apply linear gradient with direction', () => {
      const gradient = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'];

      builder.createGradientDiv('bottom', gradient, wrapper);

      const gradientDiv = wrapper.querySelector('.gradient') as HTMLDivElement;
      expect(gradientDiv.style.backgroundImage).toBe(
        'linear-gradient( to bottom, rgba(0,0,0,0.5),rgba(0,0,0,0))'
      );
    });

    it('should handle multiple gradient colors', () => {
      const gradient = ['red', 'yellow', 'green', 'blue'];

      builder.createGradientDiv('top', gradient, wrapper);

      const gradientDiv = wrapper.querySelector('.gradient') as HTMLDivElement;
      expect(gradientDiv.style.backgroundImage).toBe(
        'linear-gradient( to top, red,yellow,green,blue)'
      );
    });

    it('should append to wrapper', () => {
      const gradient = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'];

      expect(wrapper.childNodes.length).toBe(0);

      builder.createGradientDiv('bottom', gradient, wrapper);

      expect(wrapper.childNodes.length).toBe(1);
    });

    it('should handle different directions', () => {
      const gradient = ['black', 'white'];

      builder.createGradientDiv('left', gradient, wrapper);
      const leftDiv = wrapper.querySelector('.gradient') as HTMLDivElement;
      expect(leftDiv.style.backgroundImage).toContain('to left');

      wrapper.innerHTML = '';

      builder.createGradientDiv('right', gradient, wrapper);
      const rightDiv = wrapper.querySelector('.gradient') as HTMLDivElement;
      expect(rightDiv.style.backgroundImage).toContain('to right');
    });

    it('should handle single color gradient', () => {
      const gradient = ['rgba(0,0,0,0.5)'];

      builder.createGradientDiv('bottom', gradient, wrapper);

      const gradientDiv = wrapper.querySelector('.gradient');
      expect(gradientDiv).not.toBeNull();
      expect(gradientDiv?.className).toBe('gradient');
    });
  });

  describe('createRadialGradientDiv', () => {
    it('should create div with gradient class', () => {
      const gradient = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'];

      builder.createRadialGradientDiv('circle', gradient, wrapper);

      const gradientDiv = wrapper.querySelector('.gradient');
      expect(gradientDiv).not.toBeNull();
      expect(gradientDiv?.className).toBe('gradient');
    });

    it('should apply radial gradient with type', () => {
      const gradient = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'];

      builder.createRadialGradientDiv('circle', gradient, wrapper);

      const gradientDiv = wrapper.querySelector('.gradient') as HTMLDivElement;
      expect(gradientDiv.style.backgroundImage).toBe(
        'radial-gradient( circle, rgba(0,0,0,0.5),rgba(0,0,0,0))'
      );
    });

    it('should handle ellipse type', () => {
      const gradient = ['red', 'blue'];

      builder.createRadialGradientDiv('ellipse', gradient, wrapper);

      const gradientDiv = wrapper.querySelector('.gradient') as HTMLDivElement;
      expect(gradientDiv.style.backgroundImage).toBe(
        'radial-gradient( ellipse, red,blue)'
      );
    });

    it('should append to wrapper', () => {
      const gradient = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'];

      expect(wrapper.childNodes.length).toBe(0);

      builder.createRadialGradientDiv('circle', gradient, wrapper);

      expect(wrapper.childNodes.length).toBe(1);
    });

    it('should handle multiple gradient colors', () => {
      const gradient = ['red', 'yellow', 'green', 'blue'];

      builder.createRadialGradientDiv('circle', gradient, wrapper);

      const gradientDiv = wrapper.querySelector('.gradient') as HTMLDivElement;
      expect(gradientDiv.style.backgroundImage).toBe(
        'radial-gradient( circle, red,yellow,green,blue)'
      );
    });
  });

  describe('createImageInfoDiv', () => {
    it('should create div with info class', () => {
      const infoDiv = builder.createImageInfoDiv(wrapper);

      expect(infoDiv.className).toContain('info');
    });

    it('should apply imageInfoLocation from config', () => {
      mockConfig.imageInfoLocation = 'bottomRight';
      builder = new UIBuilder(mockConfig as ModuleConfig);

      const infoDiv = builder.createImageInfoDiv(wrapper);

      expect(infoDiv.className).toBe('info bottomRight');
    });

    it('should handle different locations', () => {
      const locations: Array<
        'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
      > = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

      locations.forEach((location) => {
        mockConfig.imageInfoLocation = location;
        builder = new UIBuilder(mockConfig as ModuleConfig);
        const testWrapper = document.createElement('div');

        const infoDiv = builder.createImageInfoDiv(testWrapper);

        expect(infoDiv.className).toBe(`info ${location}`);
      });
    });

    it('should append to wrapper', () => {
      expect(wrapper.childNodes.length).toBe(0);

      builder.createImageInfoDiv(wrapper);

      expect(wrapper.childNodes.length).toBe(1);
    });

    it('should return the created div', () => {
      const infoDiv = builder.createImageInfoDiv(wrapper);

      expect(infoDiv).toBe(wrapper.firstChild);
      expect(infoDiv.tagName).toBe('DIV');
    });
  });

  describe('createProgressbarDiv', () => {
    it('should create progress div with progress class', () => {
      builder.createProgressbarDiv(wrapper, 5000);

      const progressDiv = wrapper.querySelector('.progress');
      expect(progressDiv).not.toBeNull();
    });

    it('should create inner progress div with progress-inner class', () => {
      builder.createProgressbarDiv(wrapper, 5000);

      const innerDiv = wrapper.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(innerDiv).not.toBeNull();
      expect(innerDiv.className).toBe('progress-inner');
    });

    it('should set inner div display to none initially', () => {
      builder.createProgressbarDiv(wrapper, 5000);

      const innerDiv = wrapper.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(innerDiv.style.display).toBe('none');
    });

    it('should set animation with slideshowSpeed', () => {
      builder.createProgressbarDiv(wrapper, 5000);

      const innerDiv = wrapper.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(innerDiv.style.animation).toBe('move 5000ms linear');
    });

    it('should handle different slideshow speeds', () => {
      builder.createProgressbarDiv(wrapper, 10000);

      const innerDiv = wrapper.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(innerDiv.style.animation).toBe('move 10000ms linear');
    });

    it('should append inner div to progress div', () => {
      builder.createProgressbarDiv(wrapper, 5000);

      const progressDiv = wrapper.querySelector('.progress');
      const innerDiv = wrapper.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(innerDiv.parentNode).toBe(progressDiv);
    });

    it('should append progress div to wrapper', () => {
      expect(wrapper.childNodes.length).toBe(0);

      builder.createProgressbarDiv(wrapper, 5000);

      expect(wrapper.childNodes.length).toBe(1);
    });
  });

  describe('restartProgressBar', () => {
    beforeEach(() => {
      const progressDiv = document.createElement('div');
      progressDiv.className = 'progress';
      const innerDiv = document.createElement('div');
      innerDiv.className = 'progress-inner';
      innerDiv.style.display = 'none';
      innerDiv.style.animation = 'move 5000ms linear';
      progressDiv.appendChild(innerDiv);
      document.body.appendChild(progressDiv);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should clone the progress-inner div', () => {
      const oldDiv = document.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      const oldParent = oldDiv.parentNode;

      builder.restartProgressBar();

      const newDiv = document.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(newDiv).not.toBe(oldDiv);
      expect(newDiv.parentNode).toBe(oldParent);
    });

    it('should set display to empty string on new div', () => {
      const oldDiv = document.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(oldDiv.style.display).toBe('none');

      builder.restartProgressBar();

      const newDiv = document.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(newDiv.style.display).toBe('');
    });

    it('should preserve animation style', () => {
      builder.restartProgressBar();

      const newDiv = document.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(newDiv.style.animation).toBe('move 5000ms linear');
    });

    it('should preserve className', () => {
      builder.restartProgressBar();

      const newDiv = document.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(newDiv.className).toBe('progress-inner');
    });

    it('should do nothing if progress-inner does not exist', () => {
      document.body.innerHTML = '';

      expect(() => {
        builder.restartProgressBar();
      }).not.toThrow();
    });

    it('should replace old div in DOM', () => {
      const progressDiv = document.querySelector('.progress') as HTMLDivElement;
      const oldDiv = document.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;

      expect(progressDiv.childNodes.length).toBe(1);
      expect(progressDiv.firstChild).toBe(oldDiv);

      builder.restartProgressBar();

      const newDiv = document.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(progressDiv.childNodes.length).toBe(1);
      expect(progressDiv.firstChild).toBe(newDiv);
      expect(progressDiv.firstChild).not.toBe(oldDiv);
    });
  });

  describe('updateImageInfo', () => {
    let imageInfoDiv: HTMLDivElement;
    let imageInfo: ImageInfo;
    let translate: (key: string) => string;

    beforeEach(() => {
      imageInfoDiv = document.createElement('div');
      imageInfo = createMockImageInfo();
      translate = createMockTranslate();
    });

    it('should create header with translated text', () => {
      builder.updateImageInfo(imageInfoDiv, imageInfo, '2025-11-09', translate);

      expect(imageInfoDiv.innerHTML).toContain(
        '<header class="infoDivHeader">Picture Information</header>'
      );
    });

    it('should use custom translation', () => {
      const customTranslate = createMockTranslate({
        PICTURE_INFO: 'Photo Details'
      });

      builder.updateImageInfo(
        imageInfoDiv,
        imageInfo,
        '2025-11-09',
        customTranslate
      );

      expect(imageInfoDiv.innerHTML).toContain(
        '<header class="infoDivHeader">Photo Details</header>'
      );
    });

    it('should display date when in config', () => {
      mockConfig.imageInfo = ['date'];
      builder = new UIBuilder(mockConfig as ModuleConfig);

      builder.updateImageInfo(imageInfoDiv, imageInfo, '2025-11-09', translate);

      expect(imageInfoDiv.innerHTML).toContain('2025-11-09<br');
    });

    it('should not display date when Invalid date', () => {
      mockConfig.imageInfo = ['date'];
      builder = new UIBuilder(mockConfig as ModuleConfig);

      builder.updateImageInfo(
        imageInfoDiv,
        imageInfo,
        'Invalid date',
        translate
      );

      expect(imageInfoDiv.innerHTML).not.toContain('Invalid date');
    });

    it('should not display date when imageDate is null', () => {
      mockConfig.imageInfo = ['date'];
      builder = new UIBuilder(mockConfig as ModuleConfig);

      builder.updateImageInfo(imageInfoDiv, imageInfo, null, translate);

      const content = imageInfoDiv.innerHTML;
      expect(content).toContain('<header');
      expect(content.split('<br').length).toBe(1);
    });

    it('should display image name from path', () => {
      mockConfig.imageInfo = ['name'];
      builder = new UIBuilder(mockConfig as ModuleConfig);
      imageInfo.path = '/photos/vacation/beach.jpg';

      builder.updateImageInfo(imageInfoDiv, imageInfo, null, translate);

      expect(imageInfoDiv.innerHTML).toContain('beach.jpg<br');
    });

    it('should display name without extension when imageInfoNoFileExt is true', () => {
      mockConfig.imageInfo = ['name'];
      mockConfig.imageInfoNoFileExt = true;
      builder = new UIBuilder(mockConfig as ModuleConfig);
      imageInfo.path = '/photos/vacation/beach.jpg';

      builder.updateImageInfo(imageInfoDiv, imageInfo, null, translate);

      expect(imageInfoDiv.innerHTML).toContain('beach<br');
      expect(imageInfoDiv.innerHTML).not.toContain('beach.jpg');
    });

    it('should handle name without extension', () => {
      mockConfig.imageInfo = ['name'];
      mockConfig.imageInfoNoFileExt = true;
      builder = new UIBuilder(mockConfig as ModuleConfig);
      imageInfo.path = '/photos/vacation/image';

      builder.updateImageInfo(imageInfoDiv, imageInfo, null, translate);

      expect(imageInfoDiv.innerHTML).toContain('image<br');
    });

    it('should display image count', () => {
      mockConfig.imageInfo = ['imagecount'];
      builder = new UIBuilder(mockConfig as ModuleConfig);
      imageInfo.index = 5;
      imageInfo.total = 20;

      builder.updateImageInfo(imageInfoDiv, imageInfo, null, translate);

      expect(imageInfoDiv.innerHTML).toContain('5 of 20<br');
    });

    it('should display multiple properties in order', () => {
      mockConfig.imageInfo = ['imagecount', 'name', 'date'];
      builder = new UIBuilder(mockConfig as ModuleConfig);
      imageInfo.path = '/photos/sunset.jpg';
      imageInfo.index = 3;
      imageInfo.total = 10;

      builder.updateImageInfo(imageInfoDiv, imageInfo, '2025-11-09', translate);

      const content = imageInfoDiv.innerHTML;
      const countIndex = content.indexOf('3 of 10');
      const nameIndex = content.indexOf('sunset.jpg');
      const dateIndex = content.indexOf('2025-11-09');

      expect(countIndex).toBeLessThan(nameIndex);
      expect(nameIndex).toBeLessThan(dateIndex);
    });

    it('should warn on invalid property', () => {
      mockConfig.imageInfo = ['invalid', 'date'];
      builder = new UIBuilder(mockConfig as ModuleConfig);

      builder.updateImageInfo(imageInfoDiv, imageInfo, '2025-11-09', translate);

      expect(Log.warn).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] invalid is not a valid value for imageInfo. Please check your configuration'
      );
    });

    it('should continue processing after invalid property', () => {
      mockConfig.imageInfo = ['invalid', 'date'];
      builder = new UIBuilder(mockConfig as ModuleConfig);

      builder.updateImageInfo(imageInfoDiv, imageInfo, '2025-11-09', translate);

      expect(imageInfoDiv.innerHTML).toContain('2025-11-09<br');
    });

    it('should handle empty imageInfo array', () => {
      mockConfig.imageInfo = [];
      builder = new UIBuilder(mockConfig as ModuleConfig);

      builder.updateImageInfo(imageInfoDiv, imageInfo, '2025-11-09', translate);

      expect(imageInfoDiv.innerHTML).toContain('<header');
      expect(imageInfoDiv.innerHTML.split('<br').length).toBe(1);
    });

    it('should handle complex paths', () => {
      mockConfig.imageInfo = ['name'];
      builder = new UIBuilder(mockConfig as ModuleConfig);
      imageInfo.path = '/home/user/photos/2025/11/vacation/beach/IMG_1234.JPG';

      builder.updateImageInfo(imageInfoDiv, imageInfo, null, translate);

      expect(imageInfoDiv.innerHTML).toContain('IMG_1234.JPG<br');
    });

    it('should handle paths with multiple extensions', () => {
      mockConfig.imageInfo = ['name'];
      mockConfig.imageInfoNoFileExt = true;
      builder = new UIBuilder(mockConfig as ModuleConfig);
      imageInfo.path = '/photos/archive.tar.gz';

      builder.updateImageInfo(imageInfoDiv, imageInfo, null, translate);

      expect(imageInfoDiv.innerHTML).toContain('archive.tar<br');
    });
  });

  describe('integration scenarios', () => {
    it('should create complete UI with all elements', () => {
      const gradient1 = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'];
      builder.createGradientDiv('bottom', gradient1, wrapper);

      const gradient2 = ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)'];
      builder.createRadialGradientDiv('circle', gradient2, wrapper);

      builder.createImageInfoDiv(wrapper);
      builder.createProgressbarDiv(wrapper, 5000);

      expect(wrapper.childNodes.length).toBe(4);
      expect(wrapper.querySelectorAll('.gradient').length).toBe(2);
      expect(wrapper.querySelector('.info')).not.toBeNull();
      expect(wrapper.querySelector('.progress')).not.toBeNull();
    });

    it('should update image info with all properties', () => {
      const infoDiv = builder.createImageInfoDiv(wrapper);
      const imageInfo = createMockImageInfo({
        path: '/vacation/sunset.jpg',
        index: 7,
        total: 25
      });
      const translate = createMockTranslate();

      builder.updateImageInfo(infoDiv, imageInfo, '2025-11-09', translate);

      expect(infoDiv.innerHTML).toContain('Picture Information');
      expect(infoDiv.innerHTML).toContain('2025-11-09');
      expect(infoDiv.innerHTML).toContain('sunset.jpg');
      expect(infoDiv.innerHTML).toContain('7 of 25');
    });

    it('should handle progress bar restart after creation', () => {
      builder.createProgressbarDiv(wrapper, 5000);
      document.body.appendChild(wrapper);

      const oldInner = wrapper.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(oldInner.style.display).toBe('none');

      builder.restartProgressBar();

      const newInner = wrapper.querySelector(
        '.progress-inner'
      ) as HTMLDivElement;
      expect(newInner).not.toBe(oldInner);
      expect(newInner.style.display).toBe('');

      document.body.removeChild(wrapper);
    });

    it('should handle multiple gradient layers', () => {
      const gradients = [
        ['black', 'transparent'],
        ['red', 'yellow'],
        ['blue', 'green']
      ];

      gradients.forEach((gradient, index) => {
        if (index % 2 === 0) {
          builder.createGradientDiv('bottom', gradient, wrapper);
        } else {
          builder.createRadialGradientDiv('circle', gradient, wrapper);
        }
      });

      expect(wrapper.querySelectorAll('.gradient').length).toBe(3);
    });

    it('should handle configuration changes between operations', () => {
      const infoDiv1 = builder.createImageInfoDiv(wrapper);
      expect(infoDiv1.className).toContain('bottomLeft');

      mockConfig.imageInfoLocation = 'topRight';
      builder = new UIBuilder(mockConfig as ModuleConfig);

      const wrapper2 = document.createElement('div');
      const infoDiv2 = builder.createImageInfoDiv(wrapper2);
      expect(infoDiv2.className).toContain('topRight');
    });
  });
});
