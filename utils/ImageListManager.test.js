/**
 * ImageListManager.test.js
 *
 * Unit tests for ImageListManager
 */

// Mock the Logger
jest.mock('./Logger.js');

// Mock node:fs
jest.mock('node:fs');

const FileSystem = require('node:fs');
const ImageListManager = require('./ImageListManager');
const Log = require('./Logger.js');

describe('ImageListManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ImageListManager();
    // Mock Math.random for predictable shuffle results
    jest.spyOn(Math, 'random');
  });

  afterEach(() => {
    Math.random.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with empty imageList', () => {
      expect(manager.imageList).toEqual([]);
    });

    it('should initialize with empty alreadyShownSet', () => {
      expect(manager.alreadyShownSet).toBeInstanceOf(Set);
      expect(manager.alreadyShownSet.size).toBe(0);
    });

    it('should initialize index to 0', () => {
      expect(manager.index).toBe(0);
    });

    it('should set tracker file path', () => {
      expect(manager.trackerFilePath).toBe('modules/MMM-SynPhotoSlideshow/filesShownTracker.txt');
    });
  });

  describe('shuffleArray', () => {
    it('should return array with same length', () => {
      const array = [1, 2, 3, 4, 5];

      const result = manager.shuffleArray(array);

      expect(result.length).toBe(array.length);
    });

    it('should return array with same elements', () => {
      const array = [1, 2, 3, 4, 5];

      const result = manager.shuffleArray(array);

      expect(result.sort()).toEqual(array.sort());
    });

    it('should not modify original array', () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];

      manager.shuffleArray(array);

      expect(array).toEqual(original);
    });

    it('should shuffle elements', () => {
      const array = [1, 2, 3, 4, 5];
      Math.random
        .mockReturnValueOnce(0.9) // i=4, j=4
        .mockReturnValueOnce(0.5) // i=3, j=2
        .mockReturnValueOnce(0) // i=2, j=0
        .mockReturnValueOnce(0); // i=1, j=0

      const result = manager.shuffleArray(array);

      expect(result).not.toEqual(array);
    });

    it('should handle empty array', () => {
      const result = manager.shuffleArray([]);

      expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
      const result = manager.shuffleArray([1]);

      expect(result).toEqual([1]);
    });
  });

  describe('sortByFilename', () => {
    it('should sort by path in ascending order', () => {
      const a = {path: 'image2.jpg'};
      const b = {path: 'image1.jpg'};

      const result = manager.sortByFilename(a, b);

      expect(result).toBe(1);
    });

    it('should return -1 when first path is smaller', () => {
      const a = {path: 'image1.jpg'};
      const b = {path: 'image2.jpg'};

      const result = manager.sortByFilename(a, b);

      expect(result).toBe(-1);
    });

    it('should be case-insensitive', () => {
      const a = {path: 'IMAGE2.jpg'};
      const b = {path: 'image1.jpg'};

      const result = manager.sortByFilename(a, b);

      expect(result).toBe(1);
    });

    it('should handle paths with different cases', () => {
      const a = {path: 'Apple.jpg'};
      const b = {path: 'banana.jpg'};

      const result = manager.sortByFilename(a, b);

      expect(result).toBe(-1);
    });
  });

  describe('sortByCreated', () => {
    it('should sort by created timestamp ascending', () => {
      const a = {created: 2000};
      const b = {created: 1000};

      const result = manager.sortByCreated(a, b);

      expect(result).toBe(1000);
    });

    it('should return negative for older first', () => {
      const a = {created: 1000};
      const b = {created: 2000};

      const result = manager.sortByCreated(a, b);

      expect(result).toBe(-1000);
    });

    it('should return 0 for equal timestamps', () => {
      const a = {created: 1500};
      const b = {created: 1500};

      const result = manager.sortByCreated(a, b);

      expect(result).toBe(0);
    });
  });

  describe('sortByModified', () => {
    it('should sort by modified timestamp ascending', () => {
      const a = {modified: 2000};
      const b = {modified: 1000};

      const result = manager.sortByModified(a, b);

      expect(result).toBe(1000);
    });

    it('should return negative for older first', () => {
      const a = {modified: 1000};
      const b = {modified: 2000};

      const result = manager.sortByModified(a, b);

      expect(result).toBe(-1000);
    });

    it('should return 0 for equal timestamps', () => {
      const a = {modified: 1500};
      const b = {modified: 1500};

      const result = manager.sortByModified(a, b);

      expect(result).toBe(0);
    });
  });

  describe('sortImageList', () => {
    let imageList;

    beforeEach(() => {
      imageList = [
        {
          path: 'c.jpg',
          created: 3000,
          modified: 300
        },
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
    });

    it('should sort by name by default', () => {
      const result = manager.sortImageList([...imageList], 'name', false);

      expect(result[0].path).toBe('a.jpg');
      expect(result[1].path).toBe('b.jpg');
      expect(result[2].path).toBe('c.jpg');
      expect(Log.debug).toHaveBeenCalledWith('Sorting by name...');
    });

    it('should sort by created date', () => {
      const result = manager.sortImageList([...imageList], 'created', false);

      expect(result[0].created).toBe(1000);
      expect(result[1].created).toBe(2000);
      expect(result[2].created).toBe(3000);
      expect(Log.debug).toHaveBeenCalledWith('Sorting by created date...');
    });

    it('should sort by modified date', () => {
      const result = manager.sortImageList([...imageList], 'modified', false);

      expect(result[0].modified).toBe(100);
      expect(result[1].modified).toBe(200);
      expect(result[2].modified).toBe(300);
      expect(Log.debug).toHaveBeenCalledWith('Sorting by modified date...');
    });

    it('should reverse sort when sortDescending is true', () => {
      const result = manager.sortImageList([...imageList], 'name', true);

      expect(result[0].path).toBe('c.jpg');
      expect(result[1].path).toBe('b.jpg');
      expect(result[2].path).toBe('a.jpg');
      expect(Log.debug).toHaveBeenCalledWith('Reversing sort order...');
    });

    it('should not reverse when sortDescending is false', () => {
      const result = manager.sortImageList([...imageList], 'name', false);

      expect(result[0].path).toBe('a.jpg');
      expect(Log.debug).not.toHaveBeenCalledWith('Reversing sort order...');
    });

    it('should handle empty array', () => {
      const result = manager.sortImageList([], 'name', false);

      expect(result).toEqual([]);
    });
  });

  describe('readShownImagesTracker', () => {
    it('should read tracker file and return Set of file paths', () => {
      FileSystem.readFileSync.mockReturnValue('image1.jpg\nimage2.jpg\nimage3.jpg\n');

      const result = manager.readShownImagesTracker();

      expect(FileSystem.readFileSync).toHaveBeenCalledWith(
        'modules/MMM-SynPhotoSlideshow/filesShownTracker.txt',
        'utf8'
      );
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      expect(result.has('image1.jpg')).toBe(true);
      expect(result.has('image2.jpg')).toBe(true);
      expect(result.has('image3.jpg')).toBe(true);
      expect(Log.info).toHaveBeenCalledWith('Found 3 files in tracker');
    });

    it('should filter out empty lines', () => {
      FileSystem.readFileSync.mockReturnValue('image1.jpg\n\nimage2.jpg\n\n\n');

      const result = manager.readShownImagesTracker();

      expect(result.size).toBe(2);
    });

    it('should handle Windows line endings', () => {
      FileSystem.readFileSync.mockReturnValue('image1.jpg\r\nimage2.jpg\r\n');

      const result = manager.readShownImagesTracker();

      expect(result.size).toBe(2);
      expect(result.has('image1.jpg')).toBe(true);
      expect(result.has('image2.jpg')).toBe(true);
    });

    it('should return empty Set if file does not exist', () => {
      FileSystem.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = manager.readShownImagesTracker();

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
      expect(Log.info).toHaveBeenCalledWith('No tracker file found, starting fresh');
    });

    it('should trim whitespace from file paths', () => {
      FileSystem.readFileSync.mockReturnValue('  image1.jpg  \n  image2.jpg  \n');

      const result = manager.readShownImagesTracker();

      expect(result.size).toBe(2);
    });
  });

  describe('addImageToShown', () => {
    it('should add image path to alreadyShownSet', () => {
      const imgPath = 'test-image.jpg';

      manager.addImageToShown(imgPath);

      expect(manager.alreadyShownSet.has(imgPath)).toBe(true);
    });

    it('should append to existing tracker file', () => {
      FileSystem.existsSync.mockReturnValue(true);
      const imgPath = 'test-image.jpg';

      manager.addImageToShown(imgPath);

      expect(FileSystem.existsSync).toHaveBeenCalledWith('modules/MMM-SynPhotoSlideshow/filesShownTracker.txt');
      expect(FileSystem.appendFileSync).toHaveBeenCalledWith(
        'modules/MMM-SynPhotoSlideshow/filesShownTracker.txt',
        'test-image.jpg\n'
      );
    });

    it('should create new tracker file if it does not exist', () => {
      FileSystem.existsSync.mockReturnValue(false);
      const imgPath = 'test-image.jpg';

      manager.addImageToShown(imgPath);

      expect(FileSystem.writeFileSync).toHaveBeenCalledWith(
        'modules/MMM-SynPhotoSlideshow/filesShownTracker.txt',
        'test-image.jpg\n',
        {flag: 'wx'}
      );
    });

    it('should handle multiple images', () => {
      FileSystem.existsSync.mockReturnValue(true);

      manager.addImageToShown('image1.jpg');
      manager.addImageToShown('image2.jpg');
      manager.addImageToShown('image3.jpg');

      expect(manager.alreadyShownSet.size).toBe(3);
      expect(FileSystem.appendFileSync).toHaveBeenCalledTimes(3);
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

    it('should clear the alreadyShownSet', () => {
      manager.alreadyShownSet.add('image1.jpg');
      manager.alreadyShownSet.add('image2.jpg');

      manager.resetShownImagesTracker();

      expect(manager.alreadyShownSet.size).toBe(0);
    });

    it('should log success message', () => {
      manager.resetShownImagesTracker();

      expect(Log.info).toHaveBeenCalledWith('Reset shown images tracker');
    });

    it('should handle file system errors', () => {
      const error = new Error('Permission denied');
      FileSystem.writeFileSync.mockImplementation(() => {
        throw error;
      });

      manager.resetShownImagesTracker();

      expect(Log.error).toHaveBeenCalledWith('Error resetting tracker:', error);
    });
  });

  describe('prepareImageList', () => {
    let images;
    let config;

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

    it('should store images in imageList', () => {
      manager.prepareImageList(images, config);

      expect(manager.imageList.length).toBe(3);
    });

    it('should reset index to 0', () => {
      manager.index = 5;

      manager.prepareImageList(images, config);

      expect(manager.index).toBe(0);
    });

    it('should sort images by name when randomize is false', () => {
      const result = manager.prepareImageList([...images].reverse(), config);

      expect(result[0].path).toBe('image1.jpg');
      expect(result[1].path).toBe('image2.jpg');
      expect(result[2].path).toBe('image3.jpg');
    });

    it('should shuffle images when randomizeImageOrder is true', () => {
      config.randomizeImageOrder = true;
      Math.random.mockReturnValue(0.5);

      const result = manager.prepareImageList(images, config);

      expect(result.length).toBe(3);
      // Can't test exact order due to random, but verify it happened
      expect(result).toEqual(expect.arrayContaining(images));
    });

    it('should load tracker when showAllImagesBeforeRestart is true', () => {
      config.showAllImagesBeforeRestart = true;
      FileSystem.readFileSync.mockReturnValue('image1.jpg\n');

      manager.prepareImageList(images, config);

      expect(FileSystem.readFileSync).toHaveBeenCalled();
    });

    it('should filter out already shown images', () => {
      config.showAllImagesBeforeRestart = true;
      FileSystem.readFileSync.mockReturnValue('image1.jpg\nimage2.jpg\n');

      const result = manager.prepareImageList(images, config);

      expect(result.length).toBe(1);
      expect(result[0].path).toBe('image3.jpg');
    });

    it('should log skipped files count', () => {
      config.showAllImagesBeforeRestart = true;
      FileSystem.readFileSync.mockReturnValue('image1.jpg\n');

      manager.prepareImageList(images, config);

      expect(Log.info).toHaveBeenCalledWith('Skipped 1 already shown files');
    });

    it('should log final image list count', () => {
      manager.prepareImageList(images, config);

      expect(Log.info).toHaveBeenCalledWith('Final image list contains 3 files');
    });

    it('should sort by created date', () => {
      config.sortImagesBy = 'created';

      const result = manager.prepareImageList([...images].reverse(), config);

      expect(result[0].created).toBe(1000);
      expect(result[1].created).toBe(2000);
      expect(result[2].created).toBe(3000);
    });

    it('should apply descending sort', () => {
      config.sortImagesDescending = true;

      const result = manager.prepareImageList(images, config);

      expect(result[0].path).toBe('image3.jpg');
      expect(result[1].path).toBe('image2.jpg');
      expect(result[2].path).toBe('image1.jpg');
    });

    it('should return the prepared list', () => {
      const result = manager.prepareImageList(images, config);

      expect(result).toBe(manager.imageList);
    });
  });

  describe('getNextImage', () => {
    beforeEach(() => {
      manager.imageList = [
        {path: 'image1.jpg'},
        {path: 'image2.jpg'},
        {path: 'image3.jpg'}
      ];
      manager.index = 0;
    });

    it('should return first image initially', () => {
      const result = manager.getNextImage();

      expect(result.path).toBe('image1.jpg');
    });

    it('should increment index after returning image', () => {
      manager.getNextImage();

      expect(manager.index).toBe(1);
    });

    it('should return images in sequence', () => {
      const img1 = manager.getNextImage();
      const img2 = manager.getNextImage();
      const img3 = manager.getNextImage();

      expect(img1.path).toBe('image1.jpg');
      expect(img2.path).toBe('image2.jpg');
      expect(img3.path).toBe('image3.jpg');
    });

    it('should loop back to beginning when reaching end', () => {
      manager.index = 3;

      const result = manager.getNextImage();

      expect(manager.index).toBe(1);
      expect(result.path).toBe('image1.jpg');
      expect(Log.info).toHaveBeenCalledWith('Reached end of list, looping to beginning');
    });

    it('should return null for empty list', () => {
      manager.imageList = [];

      const result = manager.getNextImage();

      expect(result).toBeNull();
    });

    it('should log displayed image info', () => {
      manager.getNextImage();

      expect(Log.info).toHaveBeenCalledWith('Displaying image 1/3: "image1.jpg"');
    });

    it('should handle single image list', () => {
      manager.imageList = [{path: 'single.jpg'}];

      const img1 = manager.getNextImage();
      const img2 = manager.getNextImage();

      expect(img1.path).toBe('single.jpg');
      expect(img2.path).toBe('single.jpg');
    });
  });

  describe('getPreviousImage', () => {
    beforeEach(() => {
      manager.imageList = [
        {path: 'image1.jpg'},
        {path: 'image2.jpg'},
        {path: 'image3.jpg'}
      ];
    });

    it('should go back to previous image', () => {
      manager.index = 2;

      const result = manager.getPreviousImage();

      expect(result.path).toBe('image1.jpg');
    });

    it('should handle going back from first image', () => {
      manager.index = 1;

      const result = manager.getPreviousImage();

      expect(result.path).toBe('image1.jpg');
    });

    it('should handle negative index', () => {
      manager.index = 0;

      const result = manager.getPreviousImage();

      expect(result.path).toBe('image1.jpg');
    });

    it('should decrement index by 2', () => {
      manager.index = 3;

      manager.getPreviousImage();

      // After getPreviousImage, getNextImage is called which increments
      expect(manager.index).toBe(2);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty list', () => {
      manager.imageList = [];

      expect(manager.isEmpty()).toBe(true);
    });

    it('should return false for non-empty list', () => {
      manager.imageList = [{path: 'image1.jpg'}];

      expect(manager.isEmpty()).toBe(false);
    });
  });

  describe('getList', () => {
    it('should return the imageList', () => {
      const testList = [
        {path: 'image1.jpg'},
        {path: 'image2.jpg'}
      ];
      manager.imageList = testList;

      const result = manager.getList();

      expect(result).toBe(testList);
    });

    it('should return empty array when no images', () => {
      const result = manager.getList();

      expect(result).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should reset index to 0', () => {
      manager.index = 5;

      manager.reset();

      expect(manager.index).toBe(0);
    });

    it('should not affect imageList', () => {
      manager.imageList = [
        {path: 'image1.jpg'},
        {path: 'image2.jpg'}
      ];
      const originalList = manager.imageList;

      manager.reset();

      expect(manager.imageList).toBe(originalList);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      // Reset all mocks for integration tests
      FileSystem.readFileSync.mockReset();
      FileSystem.existsSync.mockReset();
      FileSystem.writeFileSync.mockReset();
      FileSystem.appendFileSync.mockReset();
    });

    it('should handle complete workflow with tracking', () => {
      const images = [
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
      const config = {
        showAllImagesBeforeRestart: true,
        randomizeImageOrder: false,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };

      FileSystem.readFileSync.mockReturnValue('');
      FileSystem.existsSync.mockReturnValue(false);
      FileSystem.writeFileSync.mockImplementation(() => {
        // No-op for testing
      });

      // Prepare list
      manager.prepareImageList(images, config);
      expect(manager.imageList.length).toBe(2);

      // Get images
      const img1 = manager.getNextImage();
      expect(img1.path).toBe('a.jpg');

      // Track shown
      manager.addImageToShown(img1.path);
      expect(manager.alreadyShownSet.has('a.jpg')).toBe(true);

      // Get next
      const img2 = manager.getNextImage();
      expect(img2.path).toBe('b.jpg');
    });

    it('should handle randomization and looping', () => {
      const images = [
        {path: 'image1.jpg'},
        {path: 'image2.jpg'}
      ];
      const config = {
        showAllImagesBeforeRestart: false,
        randomizeImageOrder: true,
        sortImagesBy: 'name',
        sortImagesDescending: false
      };

      Math.random.mockReturnValue(0.5);

      manager.prepareImageList(images, config);

      // Cycle through all images
      manager.getNextImage();
      manager.getNextImage();

      // Should loop back
      const looped = manager.getNextImage();
      expect(looped).toBeDefined();
    });

    it('should handle reset after cycling', () => {
      manager.imageList = [
        {path: 'image1.jpg'},
        {path: 'image2.jpg'}
      ];

      manager.getNextImage();
      manager.getNextImage();
      expect(manager.index).toBe(2);

      manager.reset();
      expect(manager.index).toBe(0);

      const img = manager.getNextImage();
      expect(img.path).toBe('image1.jpg');
    });
  });
});
