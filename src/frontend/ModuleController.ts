/**
 * ModuleController.ts
 *
 * Main controller for the MMM-SynPhotoSlideshow frontend module.
 * Handles module lifecycle, notifications, and UI updates.
 */

import type { ImageInfo, ModuleConfig } from '../types';
import ConfigValidator from './ConfigValidator';
import ImageHandler from './ImageHandler';
import UIBuilder from './UIBuilder';
import TransitionHandler from './TransitionHandler';

interface LoggerInterface {
  info: (message: string, ...args: unknown[]) => void;
  log: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

interface MomentInterface {
  (date: string, format: string): { format: (format: string) => string };
}

interface EXIFInterface {
  getData: (image: HTMLImageElement, callback: () => void) => void;
  getTag: (image: HTMLImageElement, tag: string) => string | number | null;
}

interface NotificationCallbacks {
  sendSocketNotification: (notification: string, payload?: unknown) => void;
  sendNotification: (notification: string, payload?: unknown) => void;
  translate: (key: string) => string;
}

/**
 * ModuleController - Main controller for the frontend module
 */
export default class ModuleController {
  private config: ModuleConfig;

  private identifier: string;

  private imageHandler: ImageHandler | null = null;

  private uiBuilder: UIBuilder | null = null;

  private transitionHandler: TransitionHandler | null = null;

  private imagesDiv: HTMLDivElement | null = null;

  private imageInfoDiv: HTMLDivElement | null = null;

  private imageList: string[] = [];

  private imageIndex = 0;

  private playingVideo = false;

  private timer: NodeJS.Timeout | null = null;

  private savedImages: string[] | null = null;

  private savedIndex: number | null = null;

  private callbacks: NotificationCallbacks;

  private Log: LoggerInterface;

  private moment: MomentInterface;

  private EXIF: EXIFInterface;

  constructor(
    config: ModuleConfig,
    identifier: string,
    callbacks: NotificationCallbacks,
    Log: LoggerInterface,
    moment: MomentInterface,
    EXIF: EXIFInterface
  ) {
    this.config = { ...config, identifier };
    this.identifier = identifier;
    this.callbacks = callbacks;
    this.Log = Log;
    this.moment = moment;
    this.EXIF = EXIF;
  }

  /**
   * Initialize the module
   */
  start(): void {
    // Validate and normalize configuration
    this.config = ConfigValidator.validateConfig(this.config);

    // Initialize helper modules
    this.imageHandler = new ImageHandler(this.config);
    this.uiBuilder = new UIBuilder(this.config);
    this.transitionHandler = new TransitionHandler(this.config);

    this.playingVideo = false;
  }

  /**
   * Get the DOM wrapper for the module
   */
  getDom(): HTMLElement {
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
  }

  /**
   * Handle notifications received from other modules
   */
  notificationReceived(notification: string): void {
    if (notification === 'BACKGROUNDSLIDESHOW_NEXT') {
      this.callbacks.sendSocketNotification('BACKGROUNDSLIDESHOW_NEXT_IMAGE');
    } else if (notification === 'BACKGROUNDSLIDESHOW_PREV') {
      this.callbacks.sendSocketNotification('BACKGROUNDSLIDESHOW_PREV_IMAGE');
    } else if (notification === 'BACKGROUNDSLIDESHOW_PAUSE') {
      this.callbacks.sendSocketNotification('BACKGROUNDSLIDESHOW_PAUSE');
    } else if (notification === 'BACKGROUNDSLIDESHOW_PLAY') {
      this.callbacks.sendSocketNotification('BACKGROUNDSLIDESHOW_PLAY');
    }
  }

  /**
   * Handle socket notifications from the backend
   */
  socketNotificationReceived(notification: string, payload: unknown): void {
    this.Log.log(
      '[MMM-SynPhotoSlideshow] Frontend received notification:',
      notification,
      payload
    );

    if (notification === 'BACKGROUNDSLIDESHOW_READY') {
      const typedPayload = payload as { identifier: string };
      this.Log.log(
        '[MMM-SynPhotoSlideshow] READY notification, identifier match:',
        typedPayload.identifier === this.identifier
      );
      if (typedPayload.identifier === this.identifier) {
        if (!this.playingVideo) {
          this.resume();
        }
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_REGISTER_CONFIG') {
      this.Log.log('[MMM-SynPhotoSlideshow] Registering config');
      this.updateImageList();
    } else if (notification === 'BACKGROUNDSLIDESHOW_PLAY') {
      this.Log.log('[MMM-SynPhotoSlideshow] PLAY notification');
      this.updateImage();
      this.callbacks.sendSocketNotification('BACKGROUNDSLIDESHOW_PLAY');
      if (!this.playingVideo) {
        this.resume();
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_DISPLAY_IMAGE') {
      const typedPayload = payload as ImageInfo;
      this.Log.log(
        '[MMM-SynPhotoSlideshow] DISPLAY_IMAGE notification, identifier match:',
        typedPayload.identifier === this.identifier
      );
      if (typedPayload.identifier === this.identifier) {
        this.displayImage(typedPayload);
      }
    } else if (notification === 'BACKGROUNDSLIDESHOW_FILELIST') {
      this.callbacks.sendNotification('BACKGROUNDSLIDESHOW_FILELIST', payload);
    } else if (notification === 'BACKGROUNDSLIDESHOW_UPDATE_IMAGE_LIST') {
      this.imageIndex = -1;
      this.updateImageList();
      this.updateImage();
    } else if (notification === 'BACKGROUNDSLIDESHOW_IMAGE_UPDATE') {
      this.Log.log('[MMM-SynPhotoSlideshow] Changing Background');
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
      this.callbacks.sendSocketNotification('BACKGROUNDSLIDESHOW_PAUSE');
    } else if (notification === 'BACKGROUNDSLIDESHOW_URL') {
      const typedPayload = payload as { url?: string; resume?: boolean };
      if (typedPayload?.url) {
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
      this.Log.log(
        `[MMM-SynPhotoSlideshow] Notification Received: BACKGROUNDSLIDESHOW_URLS. Payload: ${JSON.stringify(payload)}`
      );
      const typedPayload = payload as { urls?: string[] };
      if (typedPayload?.urls?.length) {
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
  }

  /**
   * Display an image
   */
  displayImage(imageinfo: ImageInfo): void {
    this.Log.info(
      `[MMM-SynPhotoSlideshow] Frontend displayImage called for: ${imageinfo.path}`
    );
    this.Log.log(
      '[MMM-SynPhotoSlideshow] Frontend displayImage called',
      imageinfo
    );

    const mwLc = imageinfo.path.toLowerCase();
    if (mwLc.endsWith('.mp4') || mwLc.endsWith('.m4v')) {
      const payload = [imageinfo.path, 'PLAY'];
      imageinfo.data = 'modules/MMM-SynPhotoSlideshow/transparent1080p.png';
      this.callbacks.sendSocketNotification(
        'BACKGROUNDSLIDESHOW_PLAY_VIDEO',
        payload
      );
      this.playingVideo = true;
      this.suspend();
    } else {
      this.playingVideo = false;
    }

    this.Log.log(
      '[MMM-SynPhotoSlideshow] Creating image element, src:',
      imageinfo.data
    );
    const image = new Image();
    image.onload = () => {
      this.handleImageLoad(image, imageinfo);
    };

    image.onerror = (error) => {
      this.Log.error(
        '[MMM-SynPhotoSlideshow] Image failed to load:',
        imageinfo.data,
        error
      );
      this.Log.error(
        `[MMM-SynPhotoSlideshow] Image failed to load: ${imageinfo.data}`
      );
    };

    image.src = imageinfo.data;
    this.Log.log('[MMM-SynPhotoSlideshow] Image src set to:', imageinfo.data);
    this.callbacks.sendSocketNotification('BACKGROUNDSLIDESHOW_IMAGE_UPDATED', {
      url: imageinfo.path
    });
  }

  /**
   * Handle image load event
   */
  private handleImageLoad(image: HTMLImageElement, imageinfo: ImageInfo): void {
    this.Log.log(
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
    this.Log.log('[MMM-SynPhotoSlideshow] Set backgroundImage on imageDiv');
    this.Log.log(
      '[MMM-SynPhotoSlideshow] imageDiv classList:',
      imageDiv.classList.toString()
    );
    this.Log.log(
      '[MMM-SynPhotoSlideshow] imageDiv backgroundSize:',
      imageDiv.style.backgroundSize
    );

    // Apply fit mode (portrait/landscape)
    const useFitMode =
      this.imageHandler?.applyFitMode(imageDiv, image) || false;
    this.Log.log('[MMM-SynPhotoSlideshow] useFitMode:', useFitMode);
    this.Log.log(
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
      this.handleEXIFData(image, imageinfo);
      this.imageHandler?.applyExifOrientation(imageDiv, image);
    }, 0);

    transitionDiv.appendChild(imageDiv);
    this.imagesDiv?.appendChild(transitionDiv);
    this.Log.log('[MMM-SynPhotoSlideshow] Image appended to DOM');
    this.Log.log(
      '[MMM-SynPhotoSlideshow] imagesDiv children count:',
      this.imagesDiv?.children.length
    );
    this.Log.log('[MMM-SynPhotoSlideshow] imagesDiv styles:', {
      position: this.imagesDiv?.style.position,
      width: this.imagesDiv?.style.width,
      height: this.imagesDiv?.style.height,
      zIndex: this.imagesDiv?.style.zIndex
    });

    // Check if there are gradient divs blocking the view
    const wrapper = this.imagesDiv?.parentElement;
    if (wrapper) {
      this.Log.log(
        '[MMM-SynPhotoSlideshow] Wrapper children count:',
        wrapper.children.length
      );
      this.Log.log(
        '[MMM-SynPhotoSlideshow] Wrapper children types:',
        Array.from(wrapper.children).map((c) => c.className)
      );
    }
  }

  /**
   * Handle EXIF data extraction and image info update
   */
  private handleEXIFData(image: HTMLImageElement, imageinfo: ImageInfo): void {
    this.EXIF.getData(image, () => {
      // Update image info if enabled
      if (this.config.showImageInfo && this.imageInfoDiv) {
        let dateTime = this.EXIF.getTag(image, 'DateTimeOriginal');
        if (dateTime !== null) {
          try {
            const dateMoment = this.moment(
              String(dateTime),
              'YYYY:MM:DD HH:mm:ss'
            );
            dateTime = dateMoment.format('dddd MMMM D, YYYY HH:mm');
          } catch {
            this.Log.log(
              `[MMM-SynPhotoSlideshow] Failed to parse dateTime: ${dateTime} to format YYYY:MM:DD HH:mm:ss`
            );
            dateTime = '';
          }
        }
        this.updateImageInfo(imageinfo, String(dateTime || ''));
      }
    });
  }

  /**
   * Update to next/previous image
   */
  updateImage(
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
      this.callbacks.sendSocketNotification('BACKGROUNDSLIDESHOW_PREV_IMAGE');
    } else {
      this.callbacks.sendSocketNotification('BACKGROUNDSLIDESHOW_NEXT_IMAGE');
    }
  }

  /**
   * Update image list with array of URLs
   */
  updateImageListWithArray(urls: string[]): void {
    this.imageList = urls.splice(0);
    this.imageIndex = 0;
    this.updateImage();
    if (!this.playingVideo && (this.timer || this.savedImages?.length === 0)) {
      // Restart timer only if timer was already running
      this.resume();
    }
  }

  /**
   * Update image info display
   */
  private updateImageInfo(imageinfo: ImageInfo, imageDate: string): void {
    if (this.imageInfoDiv && this.uiBuilder) {
      this.uiBuilder.updateImageInfo(
        this.imageInfoDiv,
        imageinfo,
        imageDate,
        this.callbacks.translate
      );
    }
  }

  /**
   * Suspend the slideshow timer
   */
  suspend(): void {
    this.Log.log('[MMM-SynPhotoSlideshow] Frontend suspend called');
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Resume the slideshow timer
   */
  resume(): void {
    this.Log.log('[MMM-SynPhotoSlideshow] Frontend resume called');
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
  }

  /**
   * Request image list update from backend
   */
  updateImageList(): void {
    this.Log.log('[MMM-SynPhotoSlideshow] Frontend updateImageList called');
    this.suspend();
    this.Log.debug('[MMM-SynPhotoSlideshow] Getting images');
    this.callbacks.sendSocketNotification(
      'BACKGROUNDSLIDESHOW_REGISTER_CONFIG',
      this.config
    );
  }

  /**
   * Create gradient div
   */
  private createGradientDiv(
    direction: string,
    gradient: string[],
    wrapper: HTMLElement
  ): void {
    this.uiBuilder?.createGradientDiv(direction, gradient, wrapper);
  }

  /**
   * Create radial gradient div
   */
  private createRadialGradientDiv(
    type: string,
    gradient: string[],
    wrapper: HTMLElement
  ): void {
    this.uiBuilder?.createRadialGradientDiv(type, gradient, wrapper);
  }

  /**
   * Create image info div
   */
  private createImageInfoDiv(wrapper: HTMLElement): HTMLDivElement | null {
    return this.uiBuilder?.createImageInfoDiv(wrapper) || null;
  }

  /**
   * Create progress bar div
   */
  private createProgressbarDiv(
    wrapper: HTMLElement,
    slideshowSpeed: number
  ): void {
    this.uiBuilder?.createProgressbarDiv(wrapper, slideshowSpeed);
  }
}
