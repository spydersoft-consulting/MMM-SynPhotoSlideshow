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
import type { ModuleConfig } from './types';
import ModuleController from './frontend/ModuleController';

// Declare global MagicMirror types
declare const Module: {
  register: (name: string, definition: unknown) => void;
};
declare const Log: {
  info: (message: string, ...args: unknown[]) => void;
  log: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
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
  controller: ModuleController | null;
  defaults?: ModuleConfig;
  start: () => void;
  getScripts: () => string[];
  getStyles: () => string[];
  getTranslations: () => Record<string, string>;
  notificationReceived: (notification: string) => void;
  socketNotificationReceived: (notification: string, payload: unknown) => void;
  getDom: () => HTMLElement;
}

const moduleDefinition: Partial<ModuleInstance> = {
  controller: null,

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
    // Initialize controller with callbacks
    this.controller = new ModuleController(
      this.config,
      this.identifier,
      {
        sendSocketNotification: this.sendSocketNotification.bind(this),
        sendNotification: this.sendNotification.bind(this),
        translate: this.translate.bind(this)
      },
      Log,
      moment,
      EXIF
    );

    this.controller.start();
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

  notificationReceived(this: ModuleInstance, notification: string): void {
    this.controller?.notificationReceived(notification);
  },

  socketNotificationReceived(
    this: ModuleInstance,
    notification: string,
    payload: unknown
  ): void {
    this.controller?.socketNotificationReceived(notification, payload);
  },

  getDom(this: ModuleInstance): HTMLElement {
    if (!this.controller) {
      return document.createElement('div');
    }
    return this.controller.getDom();
  }
};

Module.register('MMM-SynPhotoSlideshow', moduleDefinition);
