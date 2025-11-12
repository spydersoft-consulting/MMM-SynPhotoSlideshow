/**
 * ImageListManager.test.ts
 *
 * Unit tests for ImageListManager
 */

// Mock the logger
jest.mock('./Logger');

// Mock node:fs
jest.mock('node:fs');

// Mock node:fs/promises
jest.mock('node:fs/promises');

import * as FileSystem from 'node:fs';
import type { ModuleConfig, PhotoItem } from '../types';
import ImageListManager from './ImageListManager';
import Log from './Logger';

describe('ImageListManager', () => {
  let manager: ImageListManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ImageListManager();
  });

  // Private method tests removed - shuffleArray, sortByFilename, sortByCreated,
  // sortByModified, sortImageList, readShownImagesTracker are all private
  // Their behavior is tested through the public prepareImageList method

  describe('addImageToShown', () => {
    it('should append to existing tracker file', () => {
      (FileSystem.existsSync as jest.Mock).mockReturnValue(true);
      const imgPath = 'test-image.jpg';

      manager.addImageToShown(imgPath);

      expect(FileSystem.existsSync).toHaveBeenCalledWith(
        'modules/MMM-SynPhotoSlideshow/filesShownTracker.txt'
      );
      expect(FileSystem.appendFileSync as jest.Mock).toHaveBeenCalledWith(
        'modules/MMM-SynPhotoSlideshow/filesShownTracker.txt',
        'test-image.jpg\n'
      );
    });

    it('should create new tracker file if it does not exist', () => {
      (FileSystem.existsSync as jest.Mock).mockReturnValue(false);
      const imgPath = 'test-image.jpg';

      manager.addImageToShown(imgPath);

      expect(FileSystem.writeFileSync).toHaveBeenCalledWith(
        'modules/MMM-SynPhotoSlideshow/filesShownTracker.txt',
        'test-image.jpg\n',
        { flag: 'wx' }
      );
    });

    it('should handle multiple images', () => {
      (FileSystem.existsSync as jest.Mock).mockReturnValue(true);

      manager.addImageToShown('image1.jpg');
      manager.addImageToShown('image2.jpg');
      manager.addImageToShown('image3.jpg');

      expect(FileSystem.appendFileSync as jest.Mock).toHaveBeenCalledTimes(3);
    });
  });

  describe('resetShownImagesTracker', () => {
    it('should clear the tracker file', () => {
      manager.resetShownImagesTracker();

      expect(FileSystem.writeFileSync).toHaveBeenCalledWith(
        'modules/MMM-SynPhotoSlideshow/filesShownTracker.txt',
        '',
        'utf8'
      );
    });

    it('should log success message', () => {
      manager.resetShownImagesTracker();

      expect(Log.info).toHaveBeenCalledWith('Reset shown images tracker');
    });

    it('should handle file system errors', () => {
      const error = new Error('Permission denied');
      (FileSystem.writeFileSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      manager.resetShownImagesTracker();

      expect(Log.error).toHaveBeenCalledWith('Error resetting tracker:', error);
    });
  });

  describe('prepareImageList', () => {
    let images: PhotoItem[];
    let config: Partial<ModuleConfig>;

    beforeEach(() => {
      images = [
        {
          path: 'image1.jpg',
          created: 1000,
          modified: 100
        },
        {
          path: 'image2.jpg',
          created: 2000,
          modified: 200
        },
        {
          path: 'image3.jpg',
          created: 3000,
          modified: 300
        }
      ];

      config = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };
    });

    it('should reset index to 0', () => {
      manager.index = 5;

      manager.prepareImageList(images, config as ModuleConfig);

      expect(manager.index).toBe(0);
    });

    it('should sort images by name when randomize is false', () => {
      const result = manager.prepareImageList(
        [...images].reverse(),
        config as ModuleConfig
      );

      expect(result[0].path).toBe('image1.jpg');
      expect(result[1].path).toBe('image2.jpg');
      expect(result[2].path).toBe('image3.jpg');
    });

    it('should return sorted list when randomizeImageOrder is true', () => {
      config.randomizeImageOrder = true;

      const result = manager.prepareImageList(images, config as ModuleConfig);

      expect(result.length).toBe(3);
      // Can't test exact order due to randomization, but verify all images present
      expect(result).toEqual(expect.arrayContaining(images));
    });

    it('should load tracker when showAllImagesBeforeRestart is true', () => {
      config.showAllImagesBeforeRestart = true;
      (FileSystem.readFileSync as jest.Mock).mockReturnValue('image1.jpg\n');

      manager.prepareImageList(images, config as ModuleConfig);

      expect(FileSystem.readFileSync).toHaveBeenCalled();
    });

    it('should filter out already shown images', () => {
      config.showAllImagesBeforeRestart = true;
      (FileSystem.readFileSync as jest.Mock).mockReturnValue(
        'image1.jpg\nimage2.jpg\n'
      );

      const result = manager.prepareImageList(images, config as ModuleConfig);

      expect(result.length).toBe(1);
      expect(result[0].path).toBe('image3.jpg');
    });

    it('should log skipped files count', () => {
      config.showAllImagesBeforeRestart = true;
      (FileSystem.readFileSync as jest.Mock).mockReturnValue('image1.jpg\n');

      manager.prepareImageList(images, config as ModuleConfig);

      expect(Log.info).toHaveBeenCalledWith('Skipped 1 already shown files');
    });

    it('should log final image list count', () => {
      manager.prepareImageList(images, config as ModuleConfig);

      expect(Log.info).toHaveBeenCalledWith(
        'Final image list contains 3 files'
      );
    });

    it('should sort by created date', () => {
      config.sortImagesBy = 'created';

      const result = manager.prepareImageList(
        [...images].reverse(),
        config as ModuleConfig
      );

      expect(result[0].created).toBe(1000);
      expect(result[1].created).toBe(2000);
      expect(result[2].created).toBe(3000);
    });

    it('should apply descending sort', () => {
      config.sortImagesDescending = true;

      const result = manager.prepareImageList(images, config as ModuleConfig);

      expect(result[0].path).toBe('image3.jpg');
      expect(result[1].path).toBe('image2.jpg');
      expect(result[2].path).toBe('image1.jpg');
    });

    it('should return the prepared list', () => {
      const result = manager.prepareImageList(images, config as ModuleConfig);

      expect(result).toHaveLength(3);
      expect(result).toEqual(manager.getList());
    });
  });

  describe('getNextImage', () => {
    beforeEach(() => {
      const images: PhotoItem[] = [
        { path: 'image1.jpg', created: 0, modified: 0 },
        { path: 'image2.jpg', created: 0, modified: 0 },
        { path: 'image3.jpg', created: 0, modified: 0 }
      ];
      const config: Partial<ModuleConfig> = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };
      manager.prepareImageList(images, config as ModuleConfig);
    });

    it('should return first image initially', () => {
      const result = manager.getNextImage();

      expect(result?.path).toBe('image1.jpg');
    });

    it('should increment index after returning image', () => {
      manager.getNextImage();

      expect(manager.index).toBe(1);
    });

    it('should return images in sequence', () => {
      const img1 = manager.getNextImage();
      const img2 = manager.getNextImage();
      const img3 = manager.getNextImage();

      expect(img1?.path).toBe('image1.jpg');
      expect(img2?.path).toBe('image2.jpg');
      expect(img3?.path).toBe('image3.jpg');
    });

    it('should loop back to beginning when reaching end', () => {
      // Advance to end
      manager.getNextImage(); // image1
      manager.getNextImage(); // image2
      manager.getNextImage(); // image3

      const result = manager.getNextImage(); // Should loop to image1

      expect(result?.path).toBe('image1.jpg');
      expect(Log.info).toHaveBeenCalledWith(
        'Reached end of list, looping to beginning'
      );
    });

    it('should return null for empty list', () => {
      const emptyManager = new ImageListManager();
      emptyManager.prepareImageList([], {} as ModuleConfig);

      const result = emptyManager.getNextImage();

      expect(result).toBeNull();
    });

    it('should log displayed image info', () => {
      manager.getNextImage();

      expect(Log.info).toHaveBeenCalledWith(
        'Displaying image 1/3: "image1.jpg"'
      );
    });

    it('should handle single image list', () => {
      const singleManager = new ImageListManager();
      const config: Partial<ModuleConfig> = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };
      singleManager.prepareImageList(
        [{ path: 'single.jpg', created: 0, modified: 0 } as PhotoItem],
        config as ModuleConfig
      );

      const img1 = singleManager.getNextImage();
      const img2 = singleManager.getNextImage();

      expect(img1?.path).toBe('single.jpg');
      expect(img2?.path).toBe('single.jpg');
    });
  });

  describe('getPreviousImage', () => {
    beforeEach(() => {
      const images: PhotoItem[] = [
        { path: 'image1.jpg', created: 0, modified: 0 },
        { path: 'image2.jpg', created: 0, modified: 0 },
        { path: 'image3.jpg', created: 0, modified: 0 }
      ];
      const config: Partial<ModuleConfig> = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };
      manager.prepareImageList(images, config as ModuleConfig);
    });

    it('should go back to previous image', () => {
      manager.getNextImage(); // index 1, shows image1
      manager.getNextImage(); // index 2, shows image2

      const result = manager.getPreviousImage(); // should show image1

      expect(result?.path).toBe('image1.jpg');
    });

    it('should handle going back from first image', () => {
      manager.getNextImage(); // index 1, shows image1

      const result = manager.getPreviousImage(); // should stay at image1

      expect(result?.path).toBe('image1.jpg');
    });

    it('should handle going back at start', () => {
      // Don't advance at all
      const result = manager.getPreviousImage();

      expect(result?.path).toBe('image1.jpg');
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty list', () => {
      const emptyManager = new ImageListManager();
      emptyManager.prepareImageList([], {} as ModuleConfig);

      expect(emptyManager.isEmpty()).toBe(true);
    });

    it('should return false for non-empty list', () => {
      const config: Partial<ModuleConfig> = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };
      manager.prepareImageList(
        [{ path: 'image1.jpg', created: 0, modified: 0 } as PhotoItem],
        config as ModuleConfig
      );

      expect(manager.isEmpty()).toBe(false);
    });
  });

  describe('getList', () => {
    it('should return the image list', () => {
      const testList: PhotoItem[] = [
        { path: 'image1.jpg', created: 0, modified: 0 },
        { path: 'image2.jpg', created: 0, modified: 0 }
      ];
      const config: Partial<ModuleConfig> = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };
      manager.prepareImageList(testList, config as ModuleConfig);

      const result = manager.getList();

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('image1.jpg');
      expect(result[1].path).toBe('image2.jpg');
    });

    it('should return empty array when no images', () => {
      const emptyManager = new ImageListManager();

      const result = emptyManager.getList();

      expect(result).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should reset index to 0', () => {
      manager.index = 5;

      manager.reset();

      expect(manager.index).toBe(0);
    });

    it('should not affect list contents', () => {
      const images: PhotoItem[] = [
        { path: 'image1.jpg', created: 0, modified: 0 },
        { path: 'image2.jpg', created: 0, modified: 0 }
      ];
      const config: Partial<ModuleConfig> = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };
      manager.prepareImageList(images, config as ModuleConfig);
      const originalListLength = manager.getList().length;

      manager.reset();

      expect(manager.getList().length).toBe(originalListLength);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      // Reset all mocks for integration tests
      (FileSystem.readFileSync as jest.Mock).mockReset();
      (FileSystem.existsSync as jest.Mock).mockReset();
      (FileSystem.writeFileSync as jest.Mock).mockReset();
      (FileSystem.appendFileSync as jest.Mock).mockReset();
    });

    it('should handle complete workflow with tracking', () => {
      const images: PhotoItem[] = [
        {
          path: 'a.jpg',
          created: 1000,
          modified: 100
        },
        {
          path: 'b.jpg',
          created: 2000,
          modified: 200
        }
      ];
      const config: Partial<ModuleConfig> = {
        showAllImagesBeforeRestart: true,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };

      (FileSystem.readFileSync as jest.Mock).mockReturnValue('');
      (FileSystem.existsSync as jest.Mock).mockReturnValue(false);
      (FileSystem.writeFileSync as jest.Mock).mockImplementation(() => {
        // No-op for testing
      });

      // Prepare list
      manager.prepareImageList(images, config as ModuleConfig);
      expect(manager.getList().length).toBe(2);

      // Get images
      const img1 = manager.getNextImage();
      expect(img1?.path).toBe('a.jpg');

      // Track shown
      manager.addImageToShown(img1?.path || '');
      expect(FileSystem.writeFileSync).toHaveBeenCalled();

      // Get next
      const img2 = manager.getNextImage();
      expect(img2?.path).toBe('b.jpg');
    });

    it('should handle randomization and looping', () => {
      const images: PhotoItem[] = [
        { path: 'image1.jpg', created: 0, modified: 0 },
        { path: 'image2.jpg', created: 0, modified: 0 }
      ];
      const config: Partial<ModuleConfig> = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: true,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };

      manager.prepareImageList(images, config as ModuleConfig);

      // Cycle through all images
      manager.getNextImage();
      manager.getNextImage();

      // Should loop back
      const looped = manager.getNextImage();
      expect(looped).toBeDefined();
    });

    it('should handle reset after cycling', () => {
      const images: PhotoItem[] = [
        { path: 'image1.jpg', created: 0, modified: 0 },
        { path: 'image2.jpg', created: 0, modified: 0 }
      ];
      const config: Partial<ModuleConfig> = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };
      manager.prepareImageList(images, config as ModuleConfig);

      manager.getNextImage();
      manager.getNextImage();
      expect(manager.index).toBe(2);

      manager.reset();
      expect(manager.index).toBe(0);

      const img = manager.getNextImage();
      expect(img?.path).toBe('image1.jpg');
    });
  });
});
