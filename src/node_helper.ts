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

import Log from './backend/Logger';
import SlideshowController from './backend/SlideshowController';
import type { ModuleConfig } from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeHelper = require('node_helper');

interface NodeHelperInstance {
  name: string;
  sendSocketNotification: (notification: string, payload?: unknown) => void;
}

interface HelperModule extends NodeHelperInstance {
  controller: SlideshowController | null;
  start: () => void;
  socketNotificationReceived: (notification: string, payload: unknown) => void;
}

/**
 * MagicMirror² NodeHelper
 * Thin wrapper that delegates to SlideshowController
 */
const helperModule: Partial<HelperModule> = {
  controller: null,

  /**
   * Start the node helper
   * Called when the module is loaded
   */
  start(this: HelperModule): void {
    Log.info('MMM-SynPhotoSlideshow helper started');

    // Initialize controller with notification callback
    this.controller = new SlideshowController(
      (notification: string, payload?: unknown) => {
        this.sendSocketNotification(notification, payload);
      }
    );
  },

  /**
   * Handle socket notifications from the frontend
   * This is the only method that needs to interact with MagicMirror's communication layer
   */
  socketNotificationReceived(
    this: HelperModule,
    notification: string,
    payload: unknown
  ): void {
    if (!this.controller) {
      Log.error('Controller not initialized');
      return;
    }

    switch (notification) {
      case 'BACKGROUNDSLIDESHOW_REGISTER_CONFIG':
        Log.debug('Received REGISTER_CONFIG notification');
        void this.controller.initialize(payload as Partial<ModuleConfig>);
        break;

      case 'BACKGROUNDSLIDESHOW_PLAY_VIDEO':
        Log.debug('Received PLAY_VIDEO notification');
        this.controller.playVideo((payload as string[])[0]);
        break;

      case 'BACKGROUNDSLIDESHOW_NEXT_IMAGE':
        Log.debug('Received NEXT_IMAGE notification');
        void this.controller.getNextImage();
        break;

      case 'BACKGROUNDSLIDESHOW_PREV_IMAGE':
        Log.debug('Received PREV_IMAGE notification');
        this.controller.getPreviousImage();
        break;

      case 'BACKGROUNDSLIDESHOW_PAUSE':
        Log.debug('Received PAUSE notification');
        this.controller.pause();
        break;

      case 'BACKGROUNDSLIDESHOW_PLAY':
        Log.debug('Received PLAY notification');
        this.controller.play();
        break;

      case 'BACKGROUNDSLIDESHOW_IMAGE_UPDATED':
        // Frontend acknowledgment that image was displayed - no action needed
        Log.debug('Image updated acknowledgment received');
        break;

      default:
        Log.warn(`Unknown notification: ${notification}`);
    }
  }
};

module.exports = NodeHelper.create(helperModule);
