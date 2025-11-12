/**
 * MemoryMonitor.ts
 *
 * Monitors memory usage and triggers cleanup when needed
 */

import Log from './Logger';
import type { ModuleConfig } from '../types';

class MemoryMonitor {
  private config: Partial<ModuleConfig>;

  private monitorInterval: number;

  private memoryThreshold: number;

  private timer: NodeJS.Timeout | null = null;

  private lastCleanup: number;

  private cleanupCallbacks: Array<() => void> = [];

  constructor(config: Partial<ModuleConfig> = {}) {
    this.config = config;
    this.monitorInterval = config.memoryMonitorInterval || 60000; // Default 1 minute
    this.memoryThreshold = config.memoryThreshold || 0.85; // 85% memory usage
    this.lastCleanup = Date.now();
  }

  /**
   * Start monitoring memory usage
   */
  start(): void {
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
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      Log.info('Memory monitor stopped');
    }
  }

  /**
   * Register cleanup callback
   */
  onCleanupNeeded(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Check current memory usage
   */
  checkMemory(): void {
    const usage = process.memoryUsage();
    const { heapUsed, heapTotal } = usage;
    const heapPercent = heapUsed / heapTotal;

    Log.debug(
      `Memory: ${(heapUsed / 1024 / 1024).toFixed(2)}MB / ${(heapTotal / 1024 / 1024).toFixed(2)}MB (${(heapPercent * 100).toFixed(1)}%)`
    );

    // Trigger cleanup if memory usage is high
    if (heapPercent > this.memoryThreshold) {
      const timeSinceLastCleanup = Date.now() - this.lastCleanup;

      // Only cleanup once per minute to avoid thrashing
      if (timeSinceLastCleanup > 60000) {
        Log.warn(
          `High memory usage detected (${(heapPercent * 100).toFixed(1)}%), triggering cleanup`
        );
        this.triggerCleanup();
        this.lastCleanup = Date.now();
      }
    }
  }

  /**
   * Trigger cleanup callbacks
   */
  private triggerCleanup(): void {
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        Log.error(`Cleanup callback error: ${(error as Error).message}`);
      }
    }

    // Force garbage collection if available (requires --expose-gc flag)
    if (global.gc) {
      Log.info('Running garbage collection');
      global.gc();
    }
  }

  /**
   * Get current memory stats
   */
  getStats(): {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    arrayBuffers: number;
  } {
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

export default MemoryMonitor;
