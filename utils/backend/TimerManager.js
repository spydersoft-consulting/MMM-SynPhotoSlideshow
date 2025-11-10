/**
 * TimerManager.js
 *
 * Manages slideshow and refresh timers
 */

const Log = require('./Logger.js');

class TimerManager {
  slideshowTimer = null;

  refreshTimer = null;

  /**
   * Stop slideshow timer
   */
  stopSlideshowTimer () {
    if (this.slideshowTimer) {
      const now = new Date().toISOString();
      Log.info(`Stopping slideshow timer at ${now}`);
      clearTimeout(this.slideshowTimer);
      this.slideshowTimer = null;
    }
  }

  /**
   * Start or restart slideshow timer
   */
  startSlideshowTimer (callback, interval) {
    this.stopSlideshowTimer();

    const now = new Date().toISOString();
    const seconds = (interval / 1000).toFixed(1);
    Log.info(`Starting slideshow timer at ${now} with interval: ${interval}ms (${seconds}s)`);

    this.slideshowTimer = setTimeout(() => {
      const triggerTime = new Date().toISOString();
      Log.info(`Slideshow timer triggered at ${triggerTime}`);
      callback();
    }, interval);
  }

  /**
   * Stop refresh timer
   */
  stopRefreshTimer () {
    if (this.refreshTimer) {
      const now = new Date().toISOString();
      Log.info(`Stopping refresh timer at ${now}`);
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Start refresh timer
   */
  startRefreshTimer (callback, interval) {
    this.stopRefreshTimer();

    if (interval <= 0) {
      Log.info('Refresh timer disabled (interval <= 0)');
      return;
    }

    const now = new Date().toISOString();
    const minutes = Math.round(interval / 60000);
    Log.info(`Starting refresh timer at ${now} with interval: ${interval}ms (${minutes} minutes)`);

    this.refreshTimer = setTimeout(() => {
      const triggerTime = new Date().toISOString();
      Log.info(`Refresh timer triggered at ${triggerTime}`);
      callback();
    }, interval);
  }

  /**
   * Stop all timers
   */
  stopAllTimers () {
    this.stopSlideshowTimer();
    this.stopRefreshTimer();
  }

  /**
   * Check if slideshow timer is running
   */
  isSlideshowTimerRunning () {
    return this.slideshowTimer !== null;
  }

  /**
   * Check if refresh timer is running
   */
  isRefreshTimerRunning () {
    return this.refreshTimer !== null;
  }
}

module.exports = TimerManager;
