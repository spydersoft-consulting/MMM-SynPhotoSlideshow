/**
 * SlideshowController.ts
 *
 * Main controller for slideshow logic
 * Orchestrates all backend components
 */

import { exec } from 'node:child_process';
import Log from './Logger';
import ImageListManager from './ImageListManager';
import TimerManager from './TimerManager';
import ConfigLoader from './ConfigLoader';
import SynologyManager from './SynologyManager';
import ImageProcessor from './ImageProcessor';
import ImageCache from './ImageCache';
import MemoryMonitor from './MemoryMonitor';
import type { ImageInfo, ModuleConfig } from '../types';

export type NotificationCallback = (
  notification: string,
  payload?: unknown
) => void;
/**
 * Main slideshow controller
 * Handles all business logic for the slideshow module
 */
export default class SlideshowController {
  private readonly imageListManager: ImageListManager;

  private readonly timerManager: TimerManager;

  private readonly synologyManager: SynologyManager;

  private imageCache: ImageCache | null = null;

  private imageProcessor: ImageProcessor | null = null;

  private memoryMonitor: MemoryMonitor | null = null;

  private config: ModuleConfig | null = null;

  private isRetryingImageLoad = false;

  private readonly notificationCallback: NotificationCallback;

  constructor(notificationCallback: NotificationCallback) {
    this.notificationCallback = notificationCallback;
    this.imageListManager = new ImageListManager();
    this.timerManager = new TimerManager();
    this.synologyManager = new SynologyManager();
    Log.info('SlideshowController initialized');
  }

  /**
   * Initialize the controller with configuration
   */
  async initialize(payload: Partial<ModuleConfig>): Promise<void> {
    const config = ConfigLoader.initialize(payload);
    this.config = config;

    // Initialize memory monitor if enabled
    if (config.enableMemoryMonitor !== false) {
      this.memoryMonitor = new MemoryMonitor(config);

      this.memoryMonitor.onCleanupNeeded(() => {
        Log.info('Running memory cleanup');
        if (this.imageCache) {
          void this.imageCache.evictOldFiles();
        }
      });

      this.memoryMonitor.start();
    }

    // Initialize image cache if enabled
    if (config.enableImageCache) {
      this.imageCache = new ImageCache(config);
      await this.imageCache.initialize();
    }

    // Initialize image processor
    this.imageProcessor = new ImageProcessor(config, this.imageCache);

    // Start slideshow after a short delay
    setTimeout(() => {
      void this.gatherImageList(config, true).then(() => {
        void this.getNextImage();
      });

      const refreshInterval =
        config?.refreshImageListInterval || 60 * 60 * 1000;
      this.timerManager.startRefreshTimer(() => {
        void this.refreshImageList();
      }, refreshInterval);
    }, 200);
  }

  /**
   * Gather images from Synology and prepare the image list
   */
  async gatherImageList(
    config: ModuleConfig,
    sendNotification = false
  ): Promise<void> {
    if (!config?.synologyUrl) {
      this.notificationCallback('BACKGROUNDSLIDESHOW_REGISTER_CONFIG');
      return;
    }

    Log.info('Gathering image list...');

    const photos = await this.synologyManager.fetchPhotos(config);
    const finalImageList = this.imageListManager.prepareImageList(
      photos,
      config
    );

    if (this.imageCache && config.enableImageCache) {
      this.imageCache.preloadImages(finalImageList, (image, callback) => {
        this.imageProcessor?.readFile(
          image.path,
          callback,
          image.url,
          this.synologyManager.getClient()
        );
      });
    }

    this.notificationCallback('BACKGROUNDSLIDESHOW_FILELIST', {
      imageList: finalImageList
    });

    if (sendNotification) {
      this.notificationCallback('BACKGROUNDSLIDESHOW_READY', {
        identifier: config.identifier
      });
    }
  }

  /**
   * Get and display the next image in the slideshow
   */
  async getNextImage(): Promise<void> {
    Log.debug('Getting next image...');

    if (!this.imageListManager || this.imageListManager.isEmpty()) {
      Log.debug('Image list empty, loading images...');
      if (this.config) {
        await this.gatherImageList(this.config);
      }

      if (this.imageListManager.isEmpty()) {
        // Only schedule one retry attempt
        if (!this.isRetryingImageLoad) {
          Log.warn('No images available, retrying in 10 minutes');
          this.isRetryingImageLoad = true;
          setTimeout(() => {
            this.isRetryingImageLoad = false;
            this.getNextImage().catch((error) => {
              Log.error(
                `Error retrying image load: ${(error as Error).message}`
              );
            });
          }, 600000);
        }
        return;
      }
    }

    // Clear retry flag if we have images
    this.isRetryingImageLoad = false;

    const image = this.imageListManager.getNextImage();
    if (!image) {
      Log.error('Failed to get next image');
      return;
    }

    if (
      this.imageListManager.index === 0 &&
      this.config?.showAllImagesBeforeRestart
    ) {
      this.imageListManager.resetShownImagesTracker();
    }

    const imageUrl = image.url || null;
    const synologyClient = this.synologyManager.getClient();

    this.imageProcessor?.readFile(
      image.path,
      (data) => {
        const returnPayload: ImageInfo = {
          identifier: this.config?.identifier || '',
          path: image.path,
          data: data || '',
          index: this.imageListManager.index,
          total: this.imageListManager.getList().length
        };
        Log.debug(`Sending DISPLAY_IMAGE notification for "${image.path}"`);
        this.notificationCallback(
          'BACKGROUNDSLIDESHOW_DISPLAY_IMAGE',
          returnPayload
        );
      },
      imageUrl,
      synologyClient
    );

    const slideshowSpeed = this.config?.slideshowSpeed || 10000;
    this.timerManager.startSlideshowTimer(() => {
      void this.getNextImage();
    }, slideshowSpeed);

    if (this.config?.showAllImagesBeforeRestart) {
      this.imageListManager.addImageToShown(image.path);
    }
  }

  /**
   * Get and display the previous image
   */
  getPreviousImage(): void {
    if (this.imageListManager) {
      this.imageListManager.getPreviousImage();
    }
    void this.getNextImage();
  }

  /**
   * Refresh the image list from Synology
   */
  async refreshImageList(): Promise<void> {
    Log.info('Refreshing image list from Synology...');

    if (!this.config) {
      return;
    }

    const currentIndex = this.imageListManager?.index || 0;

    await this.gatherImageList(this.config, false);

    const listLength = this.imageListManager?.getList().length || 0;
    if (this.imageListManager) {
      if (currentIndex < listLength) {
        this.imageListManager.index = currentIndex;
        Log.info(`Maintained position at index ${currentIndex}`);
      } else {
        this.imageListManager.reset();
        Log.info('Reset to beginning of new image list');
      }
    }

    const refreshInterval =
      this.config?.refreshImageListInterval || 60 * 60 * 1000;
    this.timerManager?.startRefreshTimer(() => {
      void this.refreshImageList();
    }, refreshInterval);
  }

  /**
   * Pause the slideshow
   */
  pause(): void {
    this.timerManager?.stopAllTimers();
  }

  /**
   * Resume/start the slideshow
   */
  play(): void {
    const slideshowSpeed = this.config?.slideshowSpeed || 10000;
    this.timerManager?.startSlideshowTimer(() => {
      void this.getNextImage();
    }, slideshowSpeed);

    const refreshInterval =
      this.config?.refreshImageListInterval || 60 * 60 * 1000;
    this.timerManager?.startRefreshTimer(() => {
      void this.refreshImageList();
    }, refreshInterval);
  }

  /**
   * Play a video file
   */
  playVideo(videoPath: string): void {
    Log.info('Playing video');
    exec(`omxplayer --win 0,0,1920,1080 --alpha 180 ${videoPath}`, () => {
      this.notificationCallback('BACKGROUNDSLIDESHOW_PLAY', null);
      Log.info('Video playback complete');
    });
  }
}
