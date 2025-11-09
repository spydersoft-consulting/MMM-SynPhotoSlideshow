/**
 * ImageListManager.js
 *
 * Manages the image list, sorting, shuffling, and tracking shown images
 */

const FileSystem = require('node:fs');
const Log = require('./Logger.js');

class ImageListManager {
  constructor () {
    this.imageList = [];
    this.alreadyShownSet = new Set();
    this.index = 0;
    this.trackerFilePath = 'modules/MMM-SynPhotoSlideshow/filesShownTracker.txt';
  }

  /**
   * Shuffle array randomly
   */
  shuffleArray (array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Sort by filename
   */
  sortByFilename (a, b) {
    const aL = a.path.toLowerCase();
    const bL = b.path.toLowerCase();
    if (aL > bL) return 1;
    return -1;
  }

  /**
   * Sort by created date
   */
  sortByCreated (a, b) {
    return a.created - b.created;
  }

  /**
   * Sort by modified date
   */
  sortByModified (a, b) {
    return a.modified - b.modified;
  }

  /**
   * Sort image list based on configuration
   */
  sortImageList (imageList, sortBy, sortDescending) {
    let sortedList;

    switch (sortBy) {
      case 'created':
        Log.debug('Sorting by created date...');
        sortedList = imageList.sort(this.sortByCreated);
        break;
      case 'modified':
        Log.debug('Sorting by modified date...');
        sortedList = imageList.sort(this.sortByModified);
        break;
      default:
        Log.debug('Sorting by name...');
        sortedList = imageList.sort(this.sortByFilename);
    }

    if (sortDescending === true) {
      Log.debug('Reversing sort order...');
      sortedList = sortedList.reverse();
    }

    return sortedList;
  }

  /**
   * Read the shown images tracker file
   */
  readShownImagesTracker () {
    try {
      const filesShown = FileSystem.readFileSync(this.trackerFilePath, 'utf8');
      const listOfShownFiles = filesShown.split(/\r?\n/u).filter((line) => line.trim() !== '');
      Log.info(`Found ${listOfShownFiles.length} files in tracker`);
      return new Set(listOfShownFiles);
    } catch {
      Log.info('No tracker file found, starting fresh');
      return new Set();
    }
  }

  /**
   * Add an image to the shown tracker
   */
  addImageToShown (imgPath) {
    this.alreadyShownSet.add(imgPath);

    if (FileSystem.existsSync(this.trackerFilePath)) {
      FileSystem.appendFileSync(this.trackerFilePath, `${imgPath}\n`);
    } else {
      FileSystem.writeFileSync(this.trackerFilePath, `${imgPath}\n`, {flag: 'wx'});
    }
  }

  /**
   * Reset the shown images tracker
   */
  resetShownImagesTracker () {
    try {
      FileSystem.writeFileSync(this.trackerFilePath, '', 'utf8');
      this.alreadyShownSet.clear();
      Log.info('Reset shown images tracker');
    } catch (err) {
      Log.error('Error resetting tracker:', err);
    }
  }

  /**
   * Prepare final image list based on configuration
   */
  prepareImageList (images, config) {
    this.imageList = images;

    // Load shown images tracker if needed
    if (config.showAllImagesBeforeRestart) {
      this.alreadyShownSet = this.readShownImagesTracker();
    }

    // Filter out already shown images
    const imageListToUse = config.showAllImagesBeforeRestart
      ? this.imageList.filter((image) => !this.alreadyShownSet.has(image.path))
      : this.imageList;

    Log.info(`Skipped ${this.imageList.length - imageListToUse.length} already shown files`);

    // Randomize or sort
    let finalImageList;
    if (config.randomizeImageOrder) {
      finalImageList = this.shuffleArray(imageListToUse);
    } else {
      finalImageList = this.sortImageList(
        imageListToUse,
        config.sortImagesBy,
        config.sortImagesDescending
      );
    }

    this.imageList = finalImageList;
    this.index = 0;

    Log.info(`Final image list contains ${this.imageList.length} files`);
    return this.imageList;
  }

  /**
   * Get next image from the list
   */
  getNextImage () {
    if (!this.imageList.length) {
      return null;
    }

    // Loop back to beginning if reached the end
    if (this.index >= this.imageList.length) {
      Log.info('Reached end of list, looping to beginning');
      this.index = 0;
    }

    const image = this.imageList[this.index++];
    Log.info(`Displaying image ${this.index}/${this.imageList.length}: "${image.path}"`);

    return image;
  }

  /**
   * Get previous image from the list
   */
  getPreviousImage () {
    // imageIndex is incremented after displaying, so -2 gets previous
    this.index -= 2;

    // Handle wrap-around to end of list
    if (this.index < 0) {
      this.index = 0;
    }

    return this.getNextImage();
  }

  /**
   * Check if list is empty
   */
  isEmpty () {
    return this.imageList.length === 0;
  }

  /**
   * Get current list
   */
  getList () {
    return this.imageList;
  }

  /**
   * Reset to beginning
   */
  reset () {
    this.index = 0;
  }
}

module.exports = ImageListManager;
