/**
 * TimerManager.ts
 *
 * Manages slideshow and refresh timers
 */

import Log from './Logger';

class TimerManager {
  private slideshowTimer: NodeJS.Timeout | null = null;

  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Stop slideshow timer
   */
  stopSlideshowTimer(): void {
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
  startSlideshowTimer(callback: () => void, interval: number): void {
    this.stopSlideshowTimer();

    const now = new Date().toISOString();
    const seconds = (interval / 1000).toFixed(1);
    Log.info(
      `Starting slideshow timer at ${now} with interval: ${interval}ms (${seconds}s)`
    );

    this.slideshowTimer = setTimeout(() => {
      const triggerTime = new Date().toISOString();
      Log.info(`Slideshow timer triggered at ${triggerTime}`);
      callback();
    }, interval);
  }

  /**
   * Stop refresh timer
   */
  stopRefreshTimer(): void {
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
  startRefreshTimer(callback: () => void, interval: number): void {
    this.stopRefreshTimer();

    if (interval <= 0) {
      Log.info('Refresh timer disabled (interval <= 0)');
      return;
    }

    const now = new Date().toISOString();
    const minutes = Math.round(interval / 60000);
    Log.info(
      `Starting refresh timer at ${now} with interval: ${interval}ms (${minutes} minutes)`
    );

    this.refreshTimer = setTimeout(() => {
      const triggerTime = new Date().toISOString();
      Log.info(`Refresh timer triggered at ${triggerTime}`);
      callback();
    }, interval);
  }

  /**
   * Stop all timers
   */
  stopAllTimers(): void {
    this.stopSlideshowTimer();
    this.stopRefreshTimer();
  }

  /**
   * Check if slideshow timer is running
   */
  isSlideshowTimerRunning(): boolean {
    return this.slideshowTimer !== null;
  }

  /**
   * Check if refresh timer is running
   */
  isRefreshTimerRunning(): boolean {
    return this.refreshTimer !== null;
  }
}

export default TimerManager;
