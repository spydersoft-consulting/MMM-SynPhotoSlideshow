/**
 * MemoryMonitor.js
 *
 * Monitors memory usage and triggers cleanup when needed
 */

const Log = require('./Logger.js');

class MemoryMonitor {
  constructor (config = {}) {
    this.config = config;
    this.monitorInterval = config.memoryMonitorInterval || 60000; // Default 1 minute
    this.memoryThreshold = config.memoryThreshold || 0.85; // 85% memory usage
    this.timer = null;
    this.lastCleanup = Date.now();
    this.cleanupCallbacks = [];
  }

  /**
   * Start monitoring memory usage
   */
  start () {
    if (this.timer) {
      return;
    }

    Log.info('Memory monitor started');

    this.timer = setInterval(() => {
      this.checkMemory();
    }, this.monitorInterval);

    // Initial check
    this.checkMemory();
  }

  /**
   * Stop monitoring
   */
  stop () {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      Log.info('Memory monitor stopped');
    }
  }

  /**
   * Register cleanup callback
   */
  onCleanupNeeded (callback) {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Check current memory usage
   */
  checkMemory () {
    const usage = process.memoryUsage();
    const {heapUsed} = usage;
    const {heapTotal} = usage;
    const heapPercent = heapUsed / heapTotal;

    Log.debug(`Memory: ${(heapUsed / 1024 / 1024).toFixed(2)}MB / ${(heapTotal / 1024 / 1024).toFixed(2)}MB (${(heapPercent * 100).toFixed(1)}%)`);

    // Trigger cleanup if memory usage is high
    if (heapPercent > this.memoryThreshold) {
      const timeSinceLastCleanup = Date.now() - this.lastCleanup;

      // Only cleanup once per minute to avoid thrashing
      if (timeSinceLastCleanup > 60000) {
        Log.warn(`High memory usage detected (${(heapPercent * 100).toFixed(1)}%), triggering cleanup`);
        this.triggerCleanup();
        this.lastCleanup = Date.now();
      }
    }
  }

  /**
   * Trigger cleanup callbacks
   */
  triggerCleanup () {
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        Log.error(`Cleanup callback error: ${error.message}`);
      }
    }

    // Force garbage collection if available (requires --expose-gc flag)
    if (globalThis.gc) {
      Log.info('Running garbage collection');
      globalThis.gc();
    }
  }

  /**
   * Get current memory stats
   */
  getStats () {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
    };
  }
}

module.exports = MemoryMonitor;
