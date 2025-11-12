/**
 * TransitionHandler.test.ts
 *
 * Unit tests for TransitionHandler
 * @jest-environment jsdom
 */

import TransitionHandler from './TransitionHandler';
import type { ModuleConfig } from '../types';

// Helper function to create mock transition node
const createMockTransitionNode = (): HTMLDivElement => {
  const node = document.createElement('div');
  node.style.opacity = '1';
  const innerNode = document.createElement('div');
  innerNode.style.backgroundImage = 'url(test.jpg)';
  node.appendChild(innerNode);
  return node;
};

// Helper function to create mock image node
const createMockImageNode = (): HTMLDivElement => {
  const node = document.createElement('div');
  node.style.backgroundImage = 'url(test.jpg)';
  return node;
};

describe('TransitionHandler', () => {
  let handler: TransitionHandler;
  let mockConfig: Partial<ModuleConfig>;
  let originalSetTimeout: typeof setTimeout;

  beforeEach(() => {
    originalSetTimeout = global.setTimeout;
    global.setTimeout = jest.fn((callback: () => void, delay?: number) => ({
      callback,
      delay,
      id: Math.random()
    })) as unknown as typeof setTimeout;

    mockConfig = {
      transitionImages: true,
      transitions: ['fadeIn', 'slideLeft', 'zoomIn'],
      transitionSpeed: '1.5s',
      transitionTimingFunction: 'ease-in-out'
    };

    handler = new TransitionHandler(mockConfig as ModuleConfig);

    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      // Test that handler can be created with config
      // Actual behavior is tested through public methods
      expect(handler).toBeInstanceOf(TransitionHandler);
    });

    it('should handle empty config', () => {
      const emptyHandler = new TransitionHandler({} as ModuleConfig);

      expect(emptyHandler).toBeInstanceOf(TransitionHandler);
    });
  });

  describe('createTransitionDiv', () => {
    it('should create div with transition class', () => {
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.tagName).toBe('DIV');
      expect(transitionDiv.className).toBe('transition');
    });

    it('should apply animation properties when transitionImages is true', () => {
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.style.animationDuration).toBe('1.5s');
      expect(transitionDiv.style.transition).toBe('opacity 1.5s ease-in-out');
      expect(transitionDiv.style.animationTimingFunction).toBe('ease-in-out');
    });

    it('should apply random animation from transitions array', () => {
      (Math.random as jest.Mock).mockReturnValue(0.5);
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.style.animationName).toBe('slideLeft');
    });

    it('should select first transition when random is 0', () => {
      (Math.random as jest.Mock).mockReturnValue(0);
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.style.animationName).toBe('fadeIn');
    });

    it('should select last transition when random is close to 1', () => {
      (Math.random as jest.Mock).mockReturnValue(0.99);
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.style.animationName).toBe('zoomIn');
    });

    it('should not apply animation properties when transitionImages is false', () => {
      mockConfig.transitionImages = false;
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.style.animationDuration).toBe('');
      expect(transitionDiv.style.animationName).toBe('');
    });

    it('should not apply animation properties when transitions array is empty', () => {
      mockConfig.transitions = [];
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.style.animationDuration).toBe('');
      expect(transitionDiv.style.animationName).toBe('');
    });

    it('should handle single transition in array', () => {
      mockConfig.transitions = ['fadeIn'];
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.style.animationName).toBe('fadeIn');
    });

    it('should use config transitionSpeed', () => {
      mockConfig.transitionSpeed = '2s';
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.style.animationDuration).toBe('2s');
      expect(transitionDiv.style.transition).toBe('opacity 2s ease-in-out');
    });

    it('should use config transitionTimingFunction', () => {
      mockConfig.transitionTimingFunction = 'linear';
      const transitionDiv = handler.createTransitionDiv();

      expect(transitionDiv.style.animationTimingFunction).toBe('linear');
    });
  });

  describe('cleanupOldImages', () => {
    let imagesDiv: HTMLDivElement;

    beforeEach(() => {
      imagesDiv = document.createElement('div');
    });

    it('should do nothing when imagesDiv has no children', () => {
      handler.cleanupOldImages(imagesDiv);

      expect(imagesDiv.childNodes.length).toBe(0);
    });

    it('should remove oldest nodes when more than 2 children exist', () => {
      const child1 = createMockTransitionNode();
      const child2 = createMockTransitionNode();
      const child3 = createMockTransitionNode();
      const child4 = createMockTransitionNode();

      imagesDiv.appendChild(child1);
      imagesDiv.appendChild(child2);
      imagesDiv.appendChild(child3);
      imagesDiv.appendChild(child4);

      handler.cleanupOldImages(imagesDiv);

      expect(imagesDiv.childNodes.length).toBe(2);
      expect(imagesDiv.childNodes[0]).toBe(child3);
      expect(imagesDiv.childNodes[1]).toBe(child4);
    });

    it('should clear background image of removed nodes', () => {
      const child1 = createMockTransitionNode();
      const child2 = createMockTransitionNode();
      const child3 = createMockTransitionNode();

      imagesDiv.appendChild(child1);
      imagesDiv.appendChild(child2);
      imagesDiv.appendChild(child3);

      handler.cleanupOldImages(imagesDiv);

      expect((child1.firstChild as HTMLDivElement).style.backgroundImage).toBe(
        ''
      );
    });

    it('should fade out current image when children exist', () => {
      const child1 = createMockTransitionNode();
      imagesDiv.appendChild(child1);

      handler.cleanupOldImages(imagesDiv);

      expect(child1.style.opacity).toBe('0');
    });

    it('should schedule cleanup of faded-out image', () => {
      const child1 = createMockTransitionNode();
      const child2 = createMockTransitionNode();

      imagesDiv.appendChild(child1);
      imagesDiv.appendChild(child2);

      global.setTimeout = jest.fn() as unknown as typeof setTimeout;

      handler.cleanupOldImages(imagesDiv);

      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        1500
      );
    });

    it('should remove faded-out image after timeout', () => {
      const child1 = createMockTransitionNode();
      const child2 = createMockTransitionNode();

      imagesDiv.appendChild(child1);
      imagesDiv.appendChild(child2);

      global.setTimeout = originalSetTimeout;
      jest.useFakeTimers();

      handler.cleanupOldImages(imagesDiv);

      expect(imagesDiv.childNodes.length).toBe(2);

      jest.advanceTimersByTime(1500);

      expect(imagesDiv.childNodes.length).toBe(1);
      expect(imagesDiv.childNodes[0]).toBe(child2);

      jest.useRealTimers();
    });

    it('should clear background image before scheduled removal', () => {
      const child1 = createMockTransitionNode();
      const child2 = createMockTransitionNode();

      imagesDiv.appendChild(child1);
      imagesDiv.appendChild(child2);

      global.setTimeout = originalSetTimeout;
      jest.useFakeTimers();

      handler.cleanupOldImages(imagesDiv);

      jest.advanceTimersByTime(1500);

      expect((child1.firstChild as HTMLDivElement).style.backgroundImage).toBe(
        ''
      );

      jest.useRealTimers();
    });

    it('should not remove node if already removed by parent', () => {
      const child1 = createMockTransitionNode();
      const child2 = createMockTransitionNode();

      imagesDiv.appendChild(child1);
      imagesDiv.appendChild(child2);

      global.setTimeout = originalSetTimeout;
      jest.useFakeTimers();

      handler.cleanupOldImages(imagesDiv);

      imagesDiv.removeChild(child1);

      expect(() => {
        jest.advanceTimersByTime(1500);
      }).not.toThrow();

      jest.useRealTimers();
    });

    it('should not remove node if it is the only child left', () => {
      const child1 = createMockTransitionNode();

      imagesDiv.appendChild(child1);

      global.setTimeout = originalSetTimeout;
      jest.useFakeTimers();

      handler.cleanupOldImages(imagesDiv);

      jest.advanceTimersByTime(1500);

      expect(imagesDiv.childNodes.length).toBe(1);
      expect(imagesDiv.childNodes[0]).toBe(child1);

      jest.useRealTimers();
    });

    it('should handle node without firstChild gracefully', () => {
      const child1 = document.createElement('div');
      imagesDiv.appendChild(child1);

      expect(() => {
        handler.cleanupOldImages(imagesDiv);
      }).not.toThrow();
    });

    it('should handle node firstChild without style gracefully', () => {
      const child1 = document.createElement('div');
      const innerDiv = document.createElement('div');
      delete (innerDiv as Partial<HTMLDivElement>).style;
      child1.appendChild(innerDiv);
      imagesDiv.appendChild(child1);

      expect(() => {
        handler.cleanupOldImages(imagesDiv);
      }).not.toThrow();
    });

    it('should parse transitionSpeed with different formats', () => {
      mockConfig.transitionSpeed = '2.5s';
      handler = new TransitionHandler(mockConfig as ModuleConfig);

      global.setTimeout = jest.fn() as unknown as typeof setTimeout;

      const child1 = createMockTransitionNode();
      const child2 = createMockTransitionNode();
      imagesDiv.appendChild(child1);
      imagesDiv.appendChild(child2);

      handler.cleanupOldImages(imagesDiv);

      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        2500
      );
    });

    it('should handle removing multiple old nodes in sequence', () => {
      const child1 = createMockTransitionNode();
      const child2 = createMockTransitionNode();
      const child3 = createMockTransitionNode();
      const child4 = createMockTransitionNode();
      const child5 = createMockTransitionNode();

      imagesDiv.appendChild(child1);
      imagesDiv.appendChild(child2);
      imagesDiv.appendChild(child3);
      imagesDiv.appendChild(child4);
      imagesDiv.appendChild(child5);

      handler.cleanupOldImages(imagesDiv);

      expect(imagesDiv.childNodes.length).toBe(2);
      expect(imagesDiv.childNodes[0]).toBe(child4);
      expect(imagesDiv.childNodes[1]).toBe(child5);

      expect(child4.style.opacity).toBe('0');
    });

    it('should work with exactly 2 children', () => {
      const child1 = createMockTransitionNode();
      const child2 = createMockTransitionNode();

      imagesDiv.appendChild(child1);
      imagesDiv.appendChild(child2);

      handler.cleanupOldImages(imagesDiv);

      expect(imagesDiv.childNodes.length).toBe(2);
      expect(child1.style.opacity).toBe('0');
    });

    it('should work with exactly 1 child', () => {
      const child1 = createMockTransitionNode();

      imagesDiv.appendChild(child1);

      handler.cleanupOldImages(imagesDiv);

      expect(imagesDiv.childNodes.length).toBe(1);
      expect(child1.style.opacity).toBe('0');
    });
  });

  describe('integration scenarios', () => {
    it('should create transition div and cleanup old images in sequence', () => {
      const imagesDiv = document.createElement('div');

      const transition1 = handler.createTransitionDiv();
      const image1 = createMockImageNode();
      transition1.appendChild(image1);
      imagesDiv.appendChild(transition1);

      expect(imagesDiv.childNodes.length).toBe(1);

      const transition2 = handler.createTransitionDiv();
      const image2 = createMockImageNode();
      transition2.appendChild(image2);
      imagesDiv.appendChild(transition2);

      handler.cleanupOldImages(imagesDiv);

      expect(imagesDiv.childNodes.length).toBe(2);
      expect(transition1.style.opacity).toBe('0');
    });

    it('should handle multiple cleanup cycles', () => {
      const imagesDiv = document.createElement('div');

      for (let i = 0; i < 3; i += 1) {
        const transition = handler.createTransitionDiv();
        const image = createMockImageNode();
        transition.appendChild(image);
        imagesDiv.appendChild(transition);
      }

      expect(imagesDiv.childNodes.length).toBe(3);

      handler.cleanupOldImages(imagesDiv);
      expect(imagesDiv.childNodes.length).toBe(2);

      const transition4 = handler.createTransitionDiv();
      const image4 = createMockImageNode();
      transition4.appendChild(image4);
      imagesDiv.appendChild(transition4);

      expect(imagesDiv.childNodes.length).toBe(3);

      handler.cleanupOldImages(imagesDiv);
      expect(imagesDiv.childNodes.length).toBe(2);
    });

    it('should create different transition animations each time', () => {
      (Math.random as jest.Mock)
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.9);

      const div1 = handler.createTransitionDiv();
      const div2 = handler.createTransitionDiv();
      const div3 = handler.createTransitionDiv();

      expect(div1.style.animationName).toBe('fadeIn');
      expect(div2.style.animationName).toBe('slideLeft');
      expect(div3.style.animationName).toBe('zoomIn');
    });

    it('should handle disabled transitions gracefully', () => {
      mockConfig.transitionImages = false;
      handler = new TransitionHandler(mockConfig as ModuleConfig);

      const imagesDiv = document.createElement('div');
      const transition1 = handler.createTransitionDiv();
      const image1 = createMockImageNode();
      transition1.appendChild(image1);
      imagesDiv.appendChild(transition1);

      expect(transition1.style.animationName).toBe('');

      handler.cleanupOldImages(imagesDiv);

      expect(imagesDiv.childNodes.length).toBe(1);
      expect(transition1.style.opacity).toBe('0');
    });
  });
});
