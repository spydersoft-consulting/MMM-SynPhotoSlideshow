/**
 * node_helper.ts
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

import { exec } from 'node:child_process';
import Log from './backend/Logger';
import ImageListManager from './backend/ImageListManager';
import TimerManager from './backend/TimerManager';
import ConfigLoader from './backend/ConfigLoader';
import SynologyManager from './backend/SynologyManager';
import ImageProcessor from './backend/ImageProcessor';
import ImageCache from './backend/ImageCache';
import MemoryMonitor from './backend/MemoryMonitor';
import type { ImageInfo, ModuleConfig, PhotoItem } from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeHelper = require('node_helper');

interface NodeHelperInstance {
	name: string;
	sendSocketNotification: (notification: string, payload?: unknown) => void;
}

interface HelperModule extends NodeHelperInstance {
	imageListManager: ImageListManager;
	timerManager: TimerManager;
	synologyManager: SynologyManager;
	imageCache: ImageCache | null;
	imageProcessor: ImageProcessor | null;
	memoryMonitor: MemoryMonitor | null;
	config: ModuleConfig | null;
	start: () => void;
	socketNotificationReceived: (notification: string, payload: unknown) => void;
	gatherImageList: (config: ModuleConfig, sendNotification?: boolean) => Promise<void>;
	getNextImage: () => void;
	getPrevImage: () => void;
	refreshImageList: () => Promise<void>;
}

const helperModule: Partial<HelperModule> = {
	start(): void {
		this.imageListManager = new ImageListManager();
		this.timerManager = new TimerManager();
		this.synologyManager = new SynologyManager();
		this.imageCache = null;
		this.imageProcessor = null;
		this.memoryMonitor = null;
		this.config = null;
		Log.info('Node helper started');
	},

	async gatherImageList(config: ModuleConfig, sendNotification = false): Promise<void> {
		if (!config || !config.synologyUrl) {
			this.sendSocketNotification('BACKGROUNDSLIDESHOW_REGISTER_CONFIG');
			return;
		}

		Log.info('Gathering image list...');

		const photos = await this.synologyManager.fetchPhotos(config);
		const finalImageList = this.imageListManager.prepareImageList(photos, config);

		if (this.imageCache && config.enableImageCache) {
			this.imageCache.preloadImages(finalImageList, (image, callback) => {
				this.imageProcessor?.readFile(image.path, callback, image.url, this.synologyManager.getClient());
			});
		}

		this.sendSocketNotification('BACKGROUNDSLIDESHOW_FILELIST', {
			imageList: finalImageList
		});

		if (sendNotification) {
			this.sendSocketNotification('BACKGROUNDSLIDESHOW_READY', {
				identifier: config.identifier
			});
		}
	},

	getNextImage(): void {
		Log.info('Getting next image...');

		if (!this.imageListManager || this.imageListManager.isEmpty()) {
			Log.info('Image list empty, loading images...');
			if (this.config) {
				void this.gatherImageList(this.config);
			}

			if (this.imageListManager.isEmpty()) {
				Log.warn('No images available, retrying in 10 minutes');
				setTimeout(() => {
					this.getNextImage();
				}, 600000);
				return;
			}
		}

		const image = this.imageListManager.getNextImage();
		if (!image) {
			Log.error('Failed to get next image');
			return;
		}

		if (this.imageListManager.index === 0 && this.config?.showAllImagesBeforeRestart) {
			this.imageListManager.resetShownImagesTracker();
		}

		const imageUrl = image.url || null;
		const synologyClient = this.synologyManager.getClient();

		this.imageProcessor?.readFile(image.path, (data) => {
			const returnPayload: ImageInfo = {
				identifier: this.config?.identifier || '',
				path: image.path,
				data: data || '',
				index: this.imageListManager.index,
				total: this.imageListManager.getList().length
			};
			Log.info(`Sending DISPLAY_IMAGE notification for "${image.path}"`);
			this.sendSocketNotification('BACKGROUNDSLIDESHOW_DISPLAY_IMAGE', returnPayload);
		}, imageUrl, synologyClient);

		const slideshowSpeed = this.config?.slideshowSpeed || 10000;
		this.timerManager.startSlideshowTimer(() => {
			this.getNextImage();
		}, slideshowSpeed);

		if (this.config?.showAllImagesBeforeRestart) {
			this.imageListManager.addImageToShown(image.path);
		}
	},

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

		const refreshInterval = this.config?.refreshImageListInterval || 60 * 60 * 1000;
		this.timerManager?.startRefreshTimer(() => {
			void this.refreshImageList();
		}, refreshInterval);
	},

	getPrevImage(): void {
		if (this.imageListManager) {
			this.imageListManager.getPreviousImage();
		}
		this.getNextImage();
	},

	socketNotificationReceived(notification: string, payload: unknown): void {
		if (notification === 'BACKGROUNDSLIDESHOW_REGISTER_CONFIG') {
			const config = ConfigLoader.initialize(payload as Partial<ModuleConfig>);
			this.config = config;

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

			if (config.enableImageCache) {
				this.imageCache = new ImageCache(config);
				void this.imageCache.initialize();
			}

			this.imageProcessor = new ImageProcessor(config, this.imageCache);

			setTimeout(() => {
				void this.gatherImageList(config, true);
				this.getNextImage();

				const refreshInterval = config?.refreshImageListInterval || 60 * 60 * 1000;
				this.timerManager.startRefreshTimer(() => {
					void this.refreshImageList();
				}, refreshInterval);
			}, 200);
		} else if (notification === 'BACKGROUNDSLIDESHOW_PLAY_VIDEO') {
			Log.info('Playing video');
			const videoPayload = payload as string[];
			exec(`omxplayer --win 0,0,1920,1080 --alpha 180 ${videoPayload[0]}`, () => {
				this.sendSocketNotification('BACKGROUNDSLIDESHOW_PLAY', null);
				Log.info('Video playback complete');
			});
		} else if (notification === 'BACKGROUNDSLIDESHOW_NEXT_IMAGE') {
			Log.debug('BACKGROUNDSLIDESHOW_NEXT_IMAGE');
			this.getNextImage();
		} else if (notification === 'BACKGROUNDSLIDESHOW_PREV_IMAGE') {
			Log.debug('BACKGROUNDSLIDESHOW_PREV_IMAGE');
			this.getPrevImage();
		} else if (notification === 'BACKGROUNDSLIDESHOW_PAUSE') {
			this.timerManager?.stopAllTimers();
		} else if (notification === 'BACKGROUNDSLIDESHOW_PLAY') {
			const slideshowSpeed = this.config?.slideshowSpeed || 10000;
			this.timerManager?.startSlideshowTimer(() => {
				this.getNextImage();
			}, slideshowSpeed);

			const refreshInterval = this.config?.refreshImageListInterval || 60 * 60 * 1000;
			this.timerManager?.startRefreshTimer(() => {
				void this.refreshImageList();
			}, refreshInterval);
		}
	}
};

module.exports = NodeHelper.create(helperModule);
