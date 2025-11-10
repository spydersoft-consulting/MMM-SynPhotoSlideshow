/*
 * MMM-SynPhotoSlideshow.js
 *
 * MagicMirror²
 * Module: MMM-SynPhotoSlideshow
 *
 * MagicMirror² By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * Module MMM-SynPhotoSlideshow By Spydersoft Consulting
 * MIT Licensed.
 */

Module.register('MMM-SynPhotoSlideshow', {
  // Module dependencies
  imageHandler: null,
  uiBuilder: null,
  transitionHandler: null,

  // Default module config.
  defaults: {
    // Synology Photos configuration (REQUIRED)
    synologyUrl: '', // e.g., 'https://your-synology-url.com:5001' or 'http://192.168.1.100:5000'
    synologyAccount: '', // Your Synology account username (not needed if using synologyShareToken)
    synologyPassword: '', // Your Synology account password (not needed if using synologyShareToken)
    synologyAlbumName: '', // Specific album name, leave empty for all photos
    synologyTagNames: [], // Array of tag names to filter photos by (e.g., ['Vacation', 'Family'])
    synologyShareToken: '', // If using a shared album link, extract the passphrase/token
    synologyMaxPhotos: 1000, // Maximum number of photos to fetch from Synology
    // how often to refresh the image list from Synology, in milliseconds (default: 1 hour)
    refreshImageListInterval: 60 * 60 * 1000, // 1 hour
    // Image caching configuration
    enableImageCache: true, // Enable local caching of downloaded images
    imageCacheMaxSize: 500, // Maximum cache size in MB (default: 500MB)
    imageCachePreloadCount: 10, // Number of images to preload in background (default: 10)
    imageCachePreloadDelay: 500, // Delay between preloads in ms (default: 500ms for low-power devices)
    // Memory monitoring configuration
    enableMemoryMonitor: true, // Enable memory usage monitoring
    memoryMonitorInterval: 60000, // How often to check memory in ms (default: 1 minute)
    memoryThreshold: 0.85, // Trigger cleanup at this memory usage % (default: 85%)
    // the speed at which to switch between images, in milliseconds
    slideshowSpeed: 10 * 1000,
    // if true randomize image order, otherwise use sortImagesBy and sortImagesDescending
    randomizeImageOrder: false,
    // automatically adjust portrait images to fit landscape screens without distortion
    fitPortraitImages: true,
    // keeps track of shown images to make sure you have seen them all before an image is shown twice.
    showAllImagesBeforeRestart: false,
    // how to sort images: name, random, created, modified
    sortImagesBy: 'created',
    // whether to sort in ascending (default) or descending order
    sortImagesDescending: false,
    // show a panel containing information about the image currently displayed.
    showImageInfo: false,
    // a comma separated list of values to display: name, date, geo (TODO)
    imageInfo: 'name, date, imagecount',
    // location of the info div
    imageInfoLocation: 'bottomRight', // Other possibilities are: bottomLeft, topLeft, topRight
    // transition speed from one image to the other, transitionImages must be true
    transitionSpeed: '2s',
    // show a progress bar indicating how long till the next image is displayed.
    showProgressBar: false,
    // the sizing of the background image
    // cover: Resize the background image to cover the entire container, even if it has to stretch the image or cut a little bit off one of the edges
    // contain: Resize the background image to make sure the image is fully visible
    backgroundSize: 'cover', // cover or contain
    // if backgroundSize contain, determine where to zoom the picture. Towards top, center or bottom
    backgroundPosition: 'center', // Most useful options: "top" or "center" or "bottom"
    // transition from one image to the other (may be a bit choppy on slower devices, or if the images are too big)
    transitionImages: false,
    // the gradient to make the text more visible
    gradient: [
      'rgba(0, 0, 0, 0.75) 0%',
      'rgba(0, 0, 0, 0) 40%',
      'rgba(0, 0, 0, 0) 80%',
      'rgba(0, 0, 0, 0.75) 100%'
    ],
    horizontalGradient: [
      'rgba(0, 0, 0, 0.75) 0%',
      'rgba(0, 0, 0, 0) 40%',
      'rgba(0, 0, 0, 0) 80%',
      'rgba(0, 0, 0, 0.75) 100%'
    ],
    radialGradient: [
      'rgba(0,0,0,0) 0%',
      'rgba(0,0,0,0) 75%',
      'rgba(0,0,0,0.25) 100%'
    ],
    // the direction the gradient goes, vertical, horizontal, both or radial
    gradientDirection: 'vertical',
    // Whether to scroll larger pictures rather than cut them off
    backgroundAnimationEnabled: false,
    // How long the scrolling animation should take - if this is more than slideshowSpeed, then images do not scroll fully.
    // If it is too fast, then the image may apear gittery. For best result, by default we match this to slideshowSpeed.
    // For now, it is not documented and will default to match slideshowSpeed.
    backgroundAnimationDuration: '1s',
    // How many times to loop the scrolling back and forth.  If the value is set to anything other than infinite, the
    // scrolling will stop at some point since we reuse the same div1.
    // For now, it is not documentd and is defaulted to infinite.
    backgroundAnimationLoopCount: 'infinite',
    // Transitions to use
    transitions: [
      'opacity',
      'slideFromRight',
      'slideFromLeft',
      'slideFromTop',
      'slideFromBottom',
      'slideFromTopLeft',
      'slideFromTopRight',
      'slideFromBottomLeft',
      'slideFromBottomRight',
      'flipX',
      'flipY'
    ],
    transitionTimingFunction: 'cubic-bezier(.17,.67,.35,.96)',
    animations: ['slide', 'zoomOut', 'zoomIn'],
    changeImageOnResume: false,
    resizeImages: false,
    maxWidth: 1920,
    maxHeight: 1080,
    // remove the file extension from image name
    imageInfoNoFileExt: false,
  },

  // load function
  start () {
    // Add identifier to the config
    this.config.identifier = this.identifier;

    // Validate and normalize configuration
    this.config = ConfigValidator.validateConfig(this.config);

    // Initialize helper modules
    this.imageHandler = new ImageHandler(this.config);
    this.uiBuilder = new UIBuilder(this.config);
    this.transitionHandler = new TransitionHandler(this.config);

    this.playingVideo = false;
  },

  getScripts () {
    return [
      `modules/${this.name}/node_modules/exif-js/exif.js`,
      'moment.js',
      this.file('utils/frontend/ConfigValidator.js'),
      this.file('utils/frontend/ImageHandler.js'),
      this.file('utils/frontend/UIBuilder.js'),
      this.file('utils/frontend/TransitionHandler.js')
    ];
  },

  getStyles () {
    // the css contains the make grayscale code
    return ['SynPhotoSlideshow.css'];
  },

  getTranslations () {
    return {
      en: 'translations/en.json',
      fr: 'translations/fr.json',
      de: 'translations/de.json',
    };
  },

  updateImageListWithArray (urls) {
    this.imageList = urls.splice(0);
    this.imageIndex = 0;
    this.updateImage();
    if (
      !this.playingVideo &&
      (this.timer || this.savedImages && this.savedImages.length === 0)
    ) {
      // Restart timer only if timer was already running
      this.resume();
    }
  },
  // Setup receiver for global notifications (other modules etc)
  // Use for example with MMM-Remote-Control API: https://github.com/Jopyth/MMM-Remote-Control/tree/master/API
  // to change image from buttons or curl:
  // curl http://[your ip address]:8080/api/notification/BACKGROUNDSLIDESHOW_PREV or NEXT
  // make sure to set address: "0.0.0.0", and secureEndpoints: false (or setup security according to readme!)
  notificationReceived (notification) {
    if (notification === 'BACKGROUNDSLIDESHOW_NEXT') {
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_NEXT_IMAGE');
    } else if (notification === 'BACKGROUNDSLIDESHOW_PREV') {
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_PREV_IMAGE');
    } else if (notification === 'BACKGROUNDSLIDESHOW_PAUSE') {
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_PAUSE');
    } else if (notification === 'BACKGROUNDSLIDESHOW_PLAY') {
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_PLAY');
    }
  },
  // the socket handler from node_helper.js
  socketNotificationReceived (notification, payload) {
    // if an update was received

    // check this is for this module based on the woeid
    if (notification === 'BACKGROUNDSLIDESHOW_READY') {
      // // Log.info('[MMM-SynPhotoSlideshow] Returning Images, payload:' + JSON.stringify(payload));
      // // set the image list
      // if (this.savedImages) {
      //   this.savedImages = payload.imageList;
      //   this.savedIndex = 0;
      // } else {
      //   this.imageList = payload.imageList;
      //   // if image list actually contains images
      //   // set loaded flag to true and update dom
      //   if (this.imageList.length > 0) {
      //     this.updateImage(); //Added to show the image at least once, but not change it within this.resume()
      //     if (!this.playingVideo) {
      //       this.resume();
      //     }
      //   }
      // }
      if (payload.identifier === this.identifier) {
        if (!this.playingVideo) {
          this.resume();
        }
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_REGISTER_CONFIG') {
      // Update config in backend
      this.updateImageList();
    } else if (notification === 'BACKGROUNDSLIDESHOW_PLAY') {
      // Change to next image and start timer.
      this.updateImage();
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_PLAY');
      if (!this.playingVideo) {
        this.resume();
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_DISPLAY_IMAGE') {
      // check this is for this module based on the woeid
      if (payload.identifier === this.identifier) {
        this.displayImage(payload);
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_FILELIST') {
      // bubble up filelist notifications
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_FILELIST', payload);
    } else if (notification === 'BACKGROUNDSLIDESHOW_UPDATE_IMAGE_LIST') {
      this.imageIndex = -1;
      this.updateImageList();
      this.updateImage();
    } else if (notification === 'BACKGROUNDSLIDESHOW_IMAGE_UPDATE') {
      Log.log('[MMM-SynPhotoSlideshow] Changing Background');
      this.suspend();
      this.updateImage();
      if (!this.playingVideo) {
        this.resume();
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_NEXT') {
      // Change to next image
      this.updateImage();
      if (this.timer && !this.playingVideo) {
        // Restart timer only if timer was already running
        this.resume();
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_PREVIOUS') {
      // Change to previous image
      this.updateImage(/* skipToPrevious= */ true);
      if (this.timer && !this.playingVideo) {
        // Restart timer only if timer was already running
        this.resume();
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_PAUSE') {
      // Stop timer.
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_PAUSE');
    } else if (notification === 'BACKGROUNDSLIDESHOW_URL') {
      if (payload && payload.url) {
        // Stop timer.
        if (payload.resume) {
          if (this.timer) {
            // Restart timer only if timer was already running
            this.resume();
          }
        } else {
          this.suspend();
        }
        this.updateImage(false, payload.url);
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_URLS') {
      Log.log(`[MMM-SynPhotoSlideshow] Notification Received: BACKGROUNDSLIDESHOW_URLS. Payload: ${JSON.stringify(payload)}`);
      if (payload && payload.urls && payload.urls.length) {
        // check if image list has been saved. If not, this is the first time the notification is received
        // save the image list and index.
        if (this.savedImages) {
          // check if there the sent urls are the same, or different.
          const temp = [...new Set([...payload.urls, ...this.imageList])];
          // if they are the same length, then they haven't changed, so don't do anything.
          if (temp.length !== payload.urls.length) {
            this.updateImageListWithArray(payload.urls);
          }
        } else {
          this.savedImages = this.imageList;
          this.savedIndex = this.imageIndex;
          this.updateImageListWithArray(payload.urls);
        }
        // no urls sent, see if there is saved data.
      } else if (this.savedImages) {
        this.imageList = this.savedImages;
        this.imageIndex = this.savedIndex;
        this.savedImages = null;
        this.savedIndex = null;
        this.updateImage();
        if (this.timer && !this.playingVideo) {
          // Restart timer only if timer was already running
          this.resume();
        }
      }
    }
  },

  // Override dom generator.
  getDom () {
    const wrapper = document.createElement('div');
    this.imagesDiv = document.createElement('div');
    this.imagesDiv.className = 'images';
    wrapper.appendChild(this.imagesDiv);

    if (
      this.config.gradientDirection === 'vertical' ||
      this.config.gradientDirection === 'both'
    ) {
      this.createGradientDiv('bottom', this.config.gradient, wrapper);
    }

    if (
      this.config.gradientDirection === 'horizontal' ||
      this.config.gradientDirection === 'both'
    ) {
      this.createGradientDiv('right', this.config.horizontalGradient, wrapper);
    }

    if (
      this.config.gradientDirection === 'radial'
    ) {
      this.createRadialGradientDiv('ellipse at center', this.config.radialGradient, wrapper);
    }

    if (this.config.showImageInfo) {
      this.imageInfoDiv = this.createImageInfoDiv(wrapper);
    }

    if (this.config.showProgressBar) {
      this.createProgressbarDiv(wrapper, this.config.slideshowSpeed);
    }

    // Create an empty image list and initialize
    // Config validation happens in backend after .env is loaded
    this.imageList = [];
    this.imageIndex = 0;
    this.updateImageList();

    return wrapper;
  },

  createGradientDiv (direction, gradient, wrapper) {
    this.uiBuilder.createGradientDiv(direction, gradient, wrapper);
  },

  createRadialGradientDiv (type, gradient, wrapper) {
    this.uiBuilder.createRadialGradientDiv(type, gradient, wrapper);
  },

  createImageInfoDiv (wrapper) {
    return this.uiBuilder.createImageInfoDiv(wrapper);
  },

  createProgressbarDiv (wrapper, slideshowSpeed) {
    this.uiBuilder.createProgressbarDiv(wrapper, slideshowSpeed);
  },
  displayImage (imageinfo) {
    const mwLc = imageinfo.path.toLowerCase();
    if (mwLc.endsWith('.mp4') || mwLc.endsWith('.m4v')) {
      const payload = [imageinfo.path, 'PLAY'];
      imageinfo.data = 'modules/MMM-SynPhotoSlideshow/transparent1080p.png';
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_PLAY_VIDEO', payload);
      this.playingVideo = true;
      this.suspend();
    } else {
      this.playingVideo = false;
    }

    const image = new Image();
    image.onload = () => {
      // Clean up old images
      this.transitionHandler.cleanupOldImages(this.imagesDiv);

      // Create transition div
      const transitionDiv = this.transitionHandler.createTransitionDiv();

      // Create and configure image div
      const imageDiv = this.imageHandler.createImageDiv();
      imageDiv.style.backgroundImage = `url("${image.src}")`;

      // Apply fit mode (portrait/landscape)
      const useFitMode = this.imageHandler.applyFitMode(imageDiv, image);

      // Restart progress bar if enabled
      if (this.config.showProgressBar) {
        this.uiBuilder.restartProgressBar();
      }

      // Apply animations if not in fit mode
      if (!useFitMode) {
        this.imageHandler.applyAnimation(imageDiv, image);
      }

      // Handle EXIF data asynchronously to avoid blocking UI
      // Defer to next tick to allow image to render first
      setTimeout(() => {
        EXIF.getData(image, () => {
          // Update image info if enabled
          if (this.config.showImageInfo) {
            let dateTime = EXIF.getTag(image, 'DateTimeOriginal');
            if (dateTime !== null) {
              try {
                dateTime = moment(dateTime, 'YYYY:MM:DD HH:mm:ss');
                dateTime = dateTime.format('dddd MMMM D, YYYY HH:mm');
              } catch {
                Log.log(`[MMM-SynPhotoSlideshow] Failed to parse dateTime: ${dateTime} to format YYYY:MM:DD HH:mm:ss`);
                dateTime = '';
              }
            }
            this.updateImageInfo(imageinfo, dateTime);
          }

          // Apply EXIF orientation if needed
          this.imageHandler.applyExifOrientation(imageDiv, image);
        });
      }, 0);

      transitionDiv.appendChild(imageDiv);
      this.imagesDiv.appendChild(transitionDiv);
    };

    image.src = imageinfo.data;
    this.sendSocketNotification('BACKGROUNDSLIDESHOW_IMAGE_UPDATED', {
      url: imageinfo.path
    });
  },

  updateImage (backToPreviousImage = false, imageToDisplay = null) {
    if (imageToDisplay) {
      this.displayImage({
        path: imageToDisplay,
        data: imageToDisplay,
        index: 1,
        total: 1
      });
      return;
    }

    if (this.imageList.length > 0) {
      this.imageIndex += 1;

      if (this.config.randomizeImageOrder) {
        this.imageIndex = Math.floor(Math.random() * this.imageList.length);
      }

      imageToDisplay = this.imageList.splice(this.imageIndex, 1);
      this.displayImage({
        path: imageToDisplay[0],
        data: imageToDisplay[0],
        index: 1,
        total: 1
      });
      return;
    }

    if (backToPreviousImage) {
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_PREV_IMAGE');
    } else {
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_NEXT_IMAGE');
    }
  },

  updateImageInfo (imageinfo, imageDate) {
    this.uiBuilder.updateImageInfo(this.imageInfoDiv, imageinfo, imageDate, this.translate.bind(this));
  },

  resume () {
    // this.updateImage(); //Removed to prevent image change whenever MMM-Carousel changes slides
    this.suspend();
    const self = this;

    if (self.config.changeImageOnResume) {
      self.updateImage();
    }
  },

  updateImageList () {
    this.suspend();
    Log.debug('[MMM-SynPhotoSlideshow] Getting images');
    // ask helper function to get the image list
    this.sendSocketNotification(
      'BACKGROUNDSLIDESHOW_REGISTER_CONFIG',
      this.config
    );
  }
});
