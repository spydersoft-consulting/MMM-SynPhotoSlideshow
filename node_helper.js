/*
 * node_helper.js
 *
 * MagicMirror²
 * Module: MMM-SynPhotoSlideshow
 *
 * MagicMirror² By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * Module MMM-SynPhotoSlideshow By Darick Carpenter
 * MIT Licensed.
 */

const {exec} = require('node:child_process');
const NodeHelper = require('node_helper');
const Log = require('../../js/logger.js');

// Import utility modules
const ImageListManager = require('./utils/ImageListManager.js');
const TimerManager = require('./utils/TimerManager.js');
const ImageProcessor = require('./utils/ImageProcessor.js');
const SynologyManager = require('./utils/SynologyManager.js');
const ImageCache = require('./utils/ImageCache.js');

// the main module helper create
module.exports = NodeHelper.create({

  // subclass start method, initializes helper modules
  start () {
    this.imageListManager = new ImageListManager();
    this.timerManager = new TimerManager();
    this.synologyManager = new SynologyManager();
    this.imageCache = null; // Initialized when config is received
    this.imageProcessor = null; // Initialized when config is received
    this.config = null;
    /* eslint-disable-next-line no-global-assign, no-implicit-globals */
    self = this;
  },


  /**
   * Gather image list from Synology
   */
  async gatherImageList (config, sendNotification) {
    // Invalid config - retrieve it again
    if (typeof config === 'undefined' || !config.synologyUrl) {
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_REGISTER_CONFIG');
      return;
    }

    // Fetch images from Synology Photos
    const photos = await this.synologyManager.fetchPhotos(config);

    // Prepare final image list
    const finalImageList = this.imageListManager.prepareImageList(photos, config);

    // Pre-load images into cache if enabled
    if (this.imageCache && config.enableImageCache) {
      this.imageCache.preloadImages(finalImageList, (image, callback) => {
        this.imageProcessor.readFile(image.path, callback, image.url, this.synologyManager.getClient());
      });
    }

    // Let other modules know about slideshow images
    this.sendSocketNotification('BACKGROUNDSLIDESHOW_FILELIST', {
      imageList: finalImageList
    });

    // Signal ready
    if (sendNotification) {
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_READY', {
        identifier: config.identifier
      });
    }
  },

  /**
   * Get and display next image
   */
  getNextImage () {
    const now = new Date().toISOString();
    Log.info(`[MMM-SynPhotoSlideshow] getNextImage() called at ${now}`);

    // Check if list is empty
    if (this.imageListManager.isEmpty()) {
      Log.info('[MMM-SynPhotoSlideshow] Image list empty, loading images...');
      if (this.config.showAllImagesBeforeRestart) {
        this.imageListManager.resetShownImagesTracker();
      }
      this.gatherImageList(this.config);

      // Still no images, retry after 10 mins
      if (this.imageListManager.isEmpty()) {
        Log.warn('[MMM-SynPhotoSlideshow] No images available, retrying in 10 minutes');
        setTimeout(() => {
          this.getNextImage();
        }, 600000);
        return;
      }
    }

    // Get next image
    const image = this.imageListManager.getNextImage();
    if (!image) {
      Log.error('[MMM-SynPhotoSlideshow] Failed to get next image');
      return;
    }

    // Check if we need to reset shown images tracker
    if (this.imageListManager.index === 0 && this.config.showAllImagesBeforeRestart) {
      this.imageListManager.resetShownImagesTracker();
    }

    const imageUrl = image.url || null;
    const synologyClient = this.synologyManager.getClient();

    // Read and send image
    this.imageProcessor.readFile(image.path, (data) => {
      const returnPayload = {
        identifier: self.config.identifier,
        path: image.path,
        data,
        index: self.imageListManager.index,
        total: self.imageListManager.getList().length
      };
      Log.info(`[MMM-SynPhotoSlideshow] Sending DISPLAY_IMAGE notification for "${image.path}"`);
      self.sendSocketNotification('BACKGROUNDSLIDESHOW_DISPLAY_IMAGE', returnPayload);
    }, imageUrl, synologyClient);

    // Restart slideshow timer
    const slideshowSpeed = this.config?.slideshowSpeed || 10000;
    this.timerManager.startSlideshowTimer(() => {
      self.getNextImage();
    }, slideshowSpeed);

    // Track shown image
    if (this.config.showAllImagesBeforeRestart) {
      this.imageListManager.addImageToShown(image.path);
    }
  },


  /**
   * Refresh the image list from Synology
   */
  async refreshImageList () {
    Log.info('[MMM-SynPhotoSlideshow] Refreshing image list from Synology...');

    // Store current index to maintain position if possible
    const currentIndex = this.imageListManager.index;

    // Reload images
    await this.gatherImageList(this.config, false);

    // Try to maintain similar position in the list
    const listLength = this.imageListManager.getList().length;
    if (currentIndex < listLength) {
      this.imageListManager.index = currentIndex;
      Log.info(`[MMM-SynPhotoSlideshow] Maintained position at index ${currentIndex}`);
    } else {
      this.imageListManager.reset();
      Log.info('[MMM-SynPhotoSlideshow] Reset to beginning of new image list');
    }

    // Restart the refresh timer
    const refreshInterval = this.config?.refreshImageListInterval || 60 * 60 * 1000;
    this.timerManager.startRefreshTimer(() => {
      self.refreshImageList();
    }, refreshInterval);
  },

  /**
   * Get previous image
   */
  getPrevImage () {
    const image = this.imageListManager.getPreviousImage();
    if (!image) {
      Log.error('[MMM-SynPhotoSlideshow] Failed to get previous image');
      return;
    }
    this.getNextImage();
  },

  /**
   * Handle socket notifications from module
   */
  socketNotificationReceived (notification, payload) {
    if (notification === 'BACKGROUNDSLIDESHOW_REGISTER_CONFIG') {
      const config = payload;
      this.config = config;

      // Initialize image cache if enabled
      if (config.enableImageCache) {
        this.imageCache = new ImageCache(config);
        this.imageCache.initialize();
      }

      // Initialize image processor with config and cache
      this.imageProcessor = new ImageProcessor(config, this.imageCache);

      // Get image list in a non-blocking way
      setTimeout(async () => {
        await this.gatherImageList(config, true);
        this.getNextImage();

        // Start the refresh timer
        const refreshInterval = config?.refreshImageListInterval || 60 * 60 * 1000;
        this.timerManager.startRefreshTimer(() => {
          self.refreshImageList();
        }, refreshInterval);
      }, 200);
    } else if (notification === 'BACKGROUNDSLIDESHOW_PLAY_VIDEO') {
      Log.info('[MMM-SynPhotoSlideshow] Playing video');
      Log.info(`[MMM-SynPhotoSlideshow] cmd: omxplayer --win 0,0,1920,1080 --alpha 180 ${payload[0]}`);
      exec(`omxplayer --win 0,0,1920,1080 --alpha 180 ${payload[0]}`, () => {
        this.sendSocketNotification('BACKGROUNDSLIDESHOW_PLAY', null);
        Log.info('[MMM-SynPhotoSlideshow] Video playback complete');
      });
    } else if (notification === 'BACKGROUNDSLIDESHOW_NEXT_IMAGE') {
      Log.debug('[MMM-SynPhotoSlideshow] BACKGROUNDSLIDESHOW_NEXT_IMAGE');
      this.getNextImage();
    } else if (notification === 'BACKGROUNDSLIDESHOW_PREV_IMAGE') {
      Log.debug('[MMM-SynPhotoSlideshow] BACKGROUNDSLIDESHOW_PREV_IMAGE');
      this.getPrevImage();
    } else if (notification === 'BACKGROUNDSLIDESHOW_PAUSE') {
      this.timerManager.stopAllTimers();
    } else if (notification === 'BACKGROUNDSLIDESHOW_PLAY') {
      const slideshowSpeed = this.config?.slideshowSpeed || 10000;
      this.timerManager.startSlideshowTimer(() => {
        self.getNextImage();
      }, slideshowSpeed);

      const refreshInterval = this.config?.refreshImageListInterval || 60 * 60 * 1000;
      this.timerManager.startRefreshTimer(() => {
        self.refreshImageList();
      }, refreshInterval);
    }
  }
});
