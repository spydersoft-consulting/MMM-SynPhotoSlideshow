/**
 * MMM-SynPhotoSlideshow.ts
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

import './frontend/display.scss';
import type { ImageInfo, ModuleConfig } from './types';
import ConfigValidator from './frontend/ConfigValidator';
import ImageHandler from './frontend/ImageHandler';
import UIBuilder from './frontend/UIBuilder';
import TransitionHandler from './frontend/TransitionHandler';

// Declare global MagicMirror types
declare const Module: {
  register: (name: string, definition: unknown) => void;
};
declare const Log: {
  info: (message: string) => void;
  log: (message: string) => void;
  debug: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};
declare const moment: (
  date: string,
  format: string
) => { format: (format: string) => string };
declare const EXIF: {
  getData: (image: HTMLImageElement, callback: () => void) => void;
  getTag: (image: HTMLImageElement, tag: string) => string | number | null;
};

interface ModuleInstance {
  name: string;
  identifier: string;
  file: (filename: string) => string;
  translate: (key: string) => string;
  sendSocketNotification: (notification: string, payload?: unknown) => void;
  sendNotification: (notification: string, payload?: unknown) => void;
  suspend: () => void;
  config: ModuleConfig;
  imageHandler: ImageHandler | null;
  uiBuilder: UIBuilder | null;
  transitionHandler: TransitionHandler | null;
  imagesDiv: HTMLDivElement | null;
  imageInfoDiv: HTMLDivElement | null;
  imageList: string[];
  imageIndex: number;
  playingVideo: boolean;
  timer: NodeJS.Timeout | null;
  savedImages: string[] | null;
  savedIndex: number | null;
  defaults?: ModuleConfig;
  start: () => void;
  getScripts: () => string[];
  getStyles: () => string[];
  getTranslations: () => Record<string, string>;
  updateImageListWithArray: (urls: string[]) => void;
  notificationReceived: (notification: string) => void;
  socketNotificationReceived: (notification: string, payload: unknown) => void;
  getDom: () => HTMLElement;
  createGradientDiv: (
    direction: string,
    gradient: string[],
    wrapper: HTMLElement
  ) => void;
  createRadialGradientDiv: (
    type: string,
    gradient: string[],
    wrapper: HTMLElement
  ) => void;
  createImageInfoDiv: (wrapper: HTMLElement) => HTMLDivElement | null;
  createProgressbarDiv: (wrapper: HTMLElement, slideshowSpeed: number) => void;
  displayImage: (imageinfo: ImageInfo) => void;
  updateImage: (
    backToPreviousImage?: boolean,
    imageToDisplay?: string | null
  ) => void;
  updateImageInfo: (imageinfo: ImageInfo, imageDate: string) => void;
  resume: () => void;
  updateImageList: () => void;
}

const moduleDefinition: Partial<ModuleInstance> = {
  // Module dependencies
  imageHandler: null,
  uiBuilder: null,
  transitionHandler: null,
  imagesDiv: null,
  imageInfoDiv: null,
  imageList: [],
  imageIndex: 0,
  playingVideo: false,
  timer: null,
  savedImages: null,
  savedIndex: null,

  // Default module config
  defaults: {
    identifier: '',
    synologyUrl: '',
    synologyAccount: '',
    synologyPassword: '',
    synologyAlbumName: '',
    synologyTagNames: [],
    synologyShareToken: '',
    synologyMaxPhotos: 1000,
    refreshImageListInterval: 60 * 60 * 1000,
    enableImageCache: true,
    imageCacheMaxSize: 500,
    imageCachePreloadCount: 10,
    imageCachePreloadDelay: 500,
    enableMemoryMonitor: true,
    memoryMonitorInterval: 60000,
    memoryThreshold: 0.85,
    slideshowSpeed: 10 * 1000,
    randomizeImageOrder: false,
    fitPortraitImages: true,
    showAllImagesBeforeRestart: false,
    sortImagesBy: 'created',
    sortImagesDescending: false,
    showImageInfo: false,
    imageInfo: 'name, date, imagecount',
    imageInfoLocation: 'bottomRight',
    transitionSpeed: '2s',
    showProgressBar: false,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    transitionImages: false,
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
    gradientDirection: 'vertical',
    backgroundAnimationEnabled: false,
    backgroundAnimationDuration: '1s',
    backgroundAnimationLoopCount: 'infinite',
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
    imageInfoNoFileExt: false
  } as ModuleConfig,

  start(this: ModuleInstance): void {
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

  getScripts(this: ModuleInstance): string[] {
    return [`modules/${this.name}/node_modules/exif-js/exif.js`, 'moment.js'];
  },

  getStyles(): string[] {
    return ['SynPhotoSlideshow.css'];
  },

  getTranslations(): Record<string, string> {
    return {
      en: 'translations/en.json',
      fr: 'translations/fr.json',
      de: 'translations/de.json'
    };
  },

  updateImageListWithArray(this: ModuleInstance, urls: string[]): void {
    this.imageList = urls.splice(0);
    this.imageIndex = 0;
    this.updateImage();
    if (
      !this.playingVideo &&
      (this.timer || (this.savedImages && this.savedImages.length === 0))
    ) {
      // Restart timer only if timer was already running
      this.resume();
    }
  },

  notificationReceived(this: ModuleInstance, notification: string): void {
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

  socketNotificationReceived(
    this: ModuleInstance,
    notification: string,
    payload: unknown
  ): void {
    Log.log(
      '[MMM-SynPhotoSlideshow] Frontend received notification:',
      notification,
      payload
    );

    if (notification === 'BACKGROUNDSLIDESHOW_READY') {
      const typedPayload = payload as { identifier: string };
      Log.log(
        '[MMM-SynPhotoSlideshow] READY notification, identifier match:',
        typedPayload.identifier === this.identifier
      );
      if (typedPayload.identifier === this.identifier) {
        if (!this.playingVideo) {
          this.resume();
        }
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_REGISTER_CONFIG') {
      Log.log('[MMM-SynPhotoSlideshow] Registering config');
      this.updateImageList();
    } else if (notification === 'BACKGROUNDSLIDESHOW_PLAY') {
      Log.log('[MMM-SynPhotoSlideshow] PLAY notification');
      this.updateImage();
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_PLAY');
      if (!this.playingVideo) {
        this.resume();
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_DISPLAY_IMAGE') {
      const typedPayload = payload as ImageInfo;
      Log.log(
        '[MMM-SynPhotoSlideshow] DISPLAY_IMAGE notification, identifier match:',
        typedPayload.identifier === this.identifier
      );
      if (typedPayload.identifier === this.identifier) {
        this.displayImage(typedPayload);
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_FILELIST') {
      this.sendNotification('BACKGROUNDSLIDESHOW_FILELIST', payload);
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
      this.updateImage();
      if (this.timer && !this.playingVideo) {
        this.resume();
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_PREVIOUS') {
      this.updateImage(true);
      if (this.timer && !this.playingVideo) {
        this.resume();
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_PAUSE') {
      this.sendSocketNotification('BACKGROUNDSLIDESHOW_PAUSE');
    } else if (notification === 'BACKGROUNDSLIDESHOW_URL') {
      const typedPayload = payload as { url?: string; resume?: boolean };
      if (typedPayload && typedPayload.url) {
        if (typedPayload.resume) {
          if (this.timer) {
            this.resume();
          }
        } else {
          this.suspend();
        }
        this.updateImage(false, typedPayload.url);
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_URLS') {
      Log.log(
        `[MMM-SynPhotoSlideshow] Notification Received: BACKGROUNDSLIDESHOW_URLS. Payload: ${JSON.stringify(payload)}`
      );
      const typedPayload = payload as { urls?: string[] };
      if (typedPayload && typedPayload.urls && typedPayload.urls.length) {
        if (this.savedImages) {
          const temp = [...new Set([...typedPayload.urls, ...this.imageList])];
          if (temp.length !== typedPayload.urls.length) {
            this.updateImageListWithArray(typedPayload.urls);
          }
        } else {
          this.savedImages = this.imageList;
          this.savedIndex = this.imageIndex;
          this.updateImageListWithArray(typedPayload.urls);
        }
      } else if (this.savedImages) {
        this.imageList = this.savedImages;
        this.imageIndex = this.savedIndex || 0;
        this.savedImages = null;
        this.savedIndex = null;
        this.updateImage();
        if (this.timer && !this.playingVideo) {
          this.resume();
        }
      }
    }
  },

  getDom(this: ModuleInstance): HTMLElement {
    const wrapper = document.createElement('div');

    this.imagesDiv = document.createElement('div');
    this.imagesDiv.className = 'images';
    wrapper.appendChild(this.imagesDiv);

    // Add gradients INSIDE imagesDiv so they layer properly
    if (
      this.config.gradientDirection === 'vertical' ||
      this.config.gradientDirection === 'both'
    ) {
      this.createGradientDiv('bottom', this.config.gradient, this.imagesDiv);
    }

    if (
      this.config.gradientDirection === 'horizontal' ||
      this.config.gradientDirection === 'both'
    ) {
      this.createGradientDiv(
        'right',
        this.config.horizontalGradient,
        this.imagesDiv
      );
    }

    if (this.config.gradientDirection === 'radial') {
      this.createRadialGradientDiv(
        'ellipse at center',
        this.config.radialGradient,
        this.imagesDiv
      );
    }

    if (this.config.showImageInfo) {
      this.imageInfoDiv = this.createImageInfoDiv(wrapper);
    }

    if (this.config.showProgressBar) {
      this.createProgressbarDiv(wrapper, this.config.slideshowSpeed);
    }

    this.imageList = [];
    this.imageIndex = 0;
    this.updateImageList();

    return wrapper;
  },

  createGradientDiv(
    this: ModuleInstance,
    direction: string,
    gradient: string[],
    wrapper: HTMLElement
  ): void {
    this.uiBuilder?.createGradientDiv(direction, gradient, wrapper);
  },

  createRadialGradientDiv(
    this: ModuleInstance,
    type: string,
    gradient: string[],
    wrapper: HTMLElement
  ): void {
    this.uiBuilder?.createRadialGradientDiv(type, gradient, wrapper);
  },

  createImageInfoDiv(
    this: ModuleInstance,
    wrapper: HTMLElement
  ): HTMLDivElement | null {
    return this.uiBuilder?.createImageInfoDiv(wrapper) || null;
  },

  createProgressbarDiv(
    this: ModuleInstance,
    wrapper: HTMLElement,
    slideshowSpeed: number
  ): void {
    this.uiBuilder?.createProgressbarDiv(wrapper, slideshowSpeed);
  },

  displayImage(this: ModuleInstance, imageinfo: ImageInfo): void {
    Log.info(
      `[MMM-SynPhotoSlideshow] Frontend displayImage called for: ${imageinfo.path}`
    );
    Log.log('[MMM-SynPhotoSlideshow] Frontend displayImage called', imageinfo);

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

    Log.log(
      '[MMM-SynPhotoSlideshow] Creating image element, src:',
      imageinfo.data
    );
    const image = new Image();
    image.onload = () => {
      Log.log(
        '[MMM-SynPhotoSlideshow] Image loaded successfully',
        image.width,
        'x',
        image.height
      );
      // Clean up old images
      if (this.imagesDiv && this.transitionHandler) {
        this.transitionHandler.cleanupOldImages(this.imagesDiv);
      }

      // Create transition div
      const transitionDiv = this.transitionHandler?.createTransitionDiv();
      if (!transitionDiv) return;

      // Create and configure image div
      const imageDiv = this.imageHandler?.createImageDiv();
      if (!imageDiv) return;

      imageDiv.style.backgroundImage = `url("${image.src}")`;
      Log.log('[MMM-SynPhotoSlideshow] Set backgroundImage on imageDiv');
      Log.log(
        '[MMM-SynPhotoSlideshow] imageDiv classList:',
        imageDiv.classList.toString()
      );
      Log.log(
        '[MMM-SynPhotoSlideshow] imageDiv backgroundSize:',
        imageDiv.style.backgroundSize
      );

      // Apply fit mode (portrait/landscape)
      const useFitMode =
        this.imageHandler?.applyFitMode(imageDiv, image) || false;
      Log.log('[MMM-SynPhotoSlideshow] useFitMode:', useFitMode);
      Log.log(
        '[MMM-SynPhotoSlideshow] After fitMode, classList:',
        imageDiv.classList.toString()
      );

      // Restart progress bar if enabled
      if (this.config.showProgressBar) {
        this.uiBuilder?.restartProgressBar();
      }

      // Apply animations if not in fit mode
      if (!useFitMode) {
        this.imageHandler?.applyAnimation(imageDiv, image);
      }

      // Handle EXIF data asynchronously
      setTimeout(() => {
        EXIF.getData(image, () => {
          // Update image info if enabled
          if (this.config.showImageInfo && this.imageInfoDiv) {
            let dateTime = EXIF.getTag(image, 'DateTimeOriginal');
            if (dateTime !== null) {
              try {
                const dateMoment = moment(
                  String(dateTime),
                  'YYYY:MM:DD HH:mm:ss'
                );
                dateTime = dateMoment.format('dddd MMMM D, YYYY HH:mm');
              } catch {
                Log.log(
                  `[MMM-SynPhotoSlideshow] Failed to parse dateTime: ${dateTime} to format YYYY:MM:DD HH:mm:ss`
                );
                dateTime = '';
              }
            }
            this.updateImageInfo(imageinfo, String(dateTime || ''));
          }

          // Apply EXIF orientation if needed
          this.imageHandler?.applyExifOrientation(imageDiv, image);
        });
      }, 0);

      transitionDiv.appendChild(imageDiv);
      this.imagesDiv?.appendChild(transitionDiv);
      Log.log('[MMM-SynPhotoSlideshow] Image appended to DOM');
      Log.log(
        '[MMM-SynPhotoSlideshow] imagesDiv children count:',
        this.imagesDiv?.children.length
      );
      Log.log('[MMM-SynPhotoSlideshow] imagesDiv styles:', {
        position: this.imagesDiv?.style.position,
        width: this.imagesDiv?.style.width,
        height: this.imagesDiv?.style.height,
        zIndex: this.imagesDiv?.style.zIndex
      });

      // Check if there are gradient divs blocking the view
      const wrapper = this.imagesDiv?.parentElement;
      if (wrapper) {
        Log.log(
          '[MMM-SynPhotoSlideshow] Wrapper children count:',
          wrapper.children.length
        );
        Log.log(
          '[MMM-SynPhotoSlideshow] Wrapper children types:',
          Array.from(wrapper.children).map((c) => c.className)
        );
      }
    };

    image.onerror = (error) => {
      Log.error(
        '[MMM-SynPhotoSlideshow] Image failed to load:',
        imageinfo.data,
        error
      );
      Log.error(
        `[MMM-SynPhotoSlideshow] Image failed to load: ${imageinfo.data}`
      );
    };

    image.src = imageinfo.data;
    Log.log('[MMM-SynPhotoSlideshow] Image src set to:', imageinfo.data);
    this.sendSocketNotification('BACKGROUNDSLIDESHOW_IMAGE_UPDATED', {
      url: imageinfo.path
    });
  },

  updateImage(
    this: ModuleInstance,
    backToPreviousImage = false,
    imageToDisplay: string | null = null
  ): void {
    if (imageToDisplay) {
      this.displayImage({
        identifier: this.identifier,
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

      const imageUrl = this.imageList.splice(this.imageIndex, 1);
      this.displayImage({
        identifier: this.identifier,
        path: imageUrl[0],
        data: imageUrl[0],
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

  updateImageInfo(
    this: ModuleInstance,
    imageinfo: ImageInfo,
    imageDate: string
  ): void {
    if (this.imageInfoDiv && this.uiBuilder) {
      this.uiBuilder.updateImageInfo(
        this.imageInfoDiv,
        imageinfo,
        imageDate,
        this.translate.bind(this)
      );
    }
  },

  suspend(this: ModuleInstance): void {
    Log.log('[MMM-SynPhotoSlideshow] Frontend suspend called');
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  },

  resume(this: ModuleInstance): void {
    Log.log('[MMM-SynPhotoSlideshow] Frontend resume called');
    this.suspend();

    if (this.config.changeImageOnResume) {
      this.updateImage();
    }

    // Set timer for next image
    this.timer = setTimeout(() => {
      this.updateImage();
      if (!this.playingVideo) {
        this.resume();
      }
    }, this.config.slideshowSpeed);
  },

  updateImageList(this: ModuleInstance): void {
    Log.log('[MMM-SynPhotoSlideshow] Frontend updateImageList called');
    this.suspend();
    Log.debug('[MMM-SynPhotoSlideshow] Getting images');
    this.sendSocketNotification(
      'BACKGROUNDSLIDESHOW_REGISTER_CONFIG',
      this.config
    );
  }
};

Module.register('MMM-SynPhotoSlideshow', moduleDefinition);
