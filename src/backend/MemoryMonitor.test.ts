/**
 * MemoryMonitor.test.ts
 *
 * Unit tests for MemoryMonitor
 */

jest.mock('./Logger');

import MemoryMonitor from './MemoryMonitor';
import Log from './Logger';

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor;
  let mockConfig: { memoryMonitorInterval?: number; memoryThreshold?: number };
  let originalDateNow: typeof Date.now;
  let originalSetInterval: typeof setInterval;
  let originalClearInterval: typeof clearInterval;
  let originalProcessMemoryUsage: typeof process.memoryUsage;
  let originalGlobalGc: typeof global.gc | undefined;

  beforeEach(() => {
    jest.clearAllMocks();

    originalDateNow = Date.now;
    Date.now = jest.fn(() => 0);

    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    global.setInterval = jest.fn((callback: () => void, interval?: number) => ({
      callback,
      interval,
      id: Math.random()
    })) as unknown as typeof setInterval;
    global.clearInterval = jest.fn();

    originalProcessMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn(() => ({
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 100 * 1024 * 1024,
      rss: 150 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    })) as unknown as typeof process.memoryUsage;

    originalGlobalGc = global.gc;
    global.gc = jest.fn();

    mockConfig = {
      memoryMonitorInterval: 60000,
      memoryThreshold: 0.85
    };

    monitor = new MemoryMonitor(mockConfig);
  });

  afterEach(() => {
    Date.now = originalDateNow;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    process.memoryUsage = originalProcessMemoryUsage;
    if (originalGlobalGc) {
      global.gc = originalGlobalGc;
    } else {
      delete (global as { gc?: () => void }).gc;
    }
  });

  describe('start', () => {
    it('should log start message', () => {
      monitor.start();

      expect(Log.info).toHaveBeenCalledWith('Memory monitor started');
    });

    it('should set up interval timer', () => {
      monitor.start();

      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        60000
      );
    });

    it('should perform initial memory check', () => {
      const checkMemorySpy = jest.spyOn(monitor, 'checkMemory');

      monitor.start();

      expect(checkMemorySpy).toHaveBeenCalled();
    });

    it('should not start if already running', () => {
      monitor.start();
      jest.clearAllMocks();

      monitor.start();

      expect(Log.info).not.toHaveBeenCalled();
    });

    it('should use custom interval from config', () => {
      mockConfig.memoryMonitorInterval = 30000;
      const customMonitor = new MemoryMonitor(mockConfig);

      customMonitor.start();

      expect(global.setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        30000
      );
    });
  });

  describe('stop', () => {
    it('should clear interval timer', () => {
      monitor.start();

      monitor.stop();

      expect(global.clearInterval).toHaveBeenCalled();
    });

    it('should log stop message', () => {
      monitor.start();
      jest.clearAllMocks();

      monitor.stop();

      expect(Log.info).toHaveBeenCalledWith('Memory monitor stopped');
    });

    it('should do nothing if not running', () => {
      monitor.stop();

      expect(global.clearInterval).not.toHaveBeenCalled();
      expect(Log.info).not.toHaveBeenCalled();
    });
  });

  describe('onCleanupNeeded', () => {
    it('should register callback successfully', () => {
      const callback = jest.fn();

      expect(() => monitor.onCleanupNeeded(callback)).not.toThrow();
    });
  });

  describe('checkMemory', () => {
    it('should get memory usage from process', () => {
      monitor.checkMemory();

      expect(process.memoryUsage).toHaveBeenCalled();
    });

    it('should log memory statistics', () => {
      monitor.checkMemory();

      expect(Log.debug).toHaveBeenCalledWith(
        'Memory: 50.00MB / 100.00MB (50.0%)'
      );
    });

    it('should warn when memory usage is high', () => {
      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      Date.now = jest.fn(() => 70000);

      monitor.checkMemory();

      expect(Log.warn).toHaveBeenCalledWith(
        'High memory usage detected (90.0%), triggering cleanup'
      );
    });

    it('should not warn when memory usage is below threshold', () => {
      monitor.checkMemory();

      expect(Log.warn).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return memory stats in MB', () => {
      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 52428800,
        heapTotal: 104857600,
        rss: 157286400,
        external: 10485760,
        arrayBuffers: 5242880
      });

      const stats = monitor.getStats();

      expect(stats).toEqual({
        heapUsed: 50,
        heapTotal: 100,
        rss: 150,
        external: 10,
        arrayBuffers: 5
      });
    });

    it('should round values to nearest MB', () => {
      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 52428800 + 524288,
        heapTotal: 104857600 + 524288,
        rss: 157286400 + 524288,
        external: 10485760 + 524288,
        arrayBuffers: 5242880 + 524288
      });

      const stats = monitor.getStats();

      expect(stats).toEqual({
        heapUsed: 51,
        heapTotal: 101,
        rss: 151,
        external: 11,
        arrayBuffers: 6
      });
    });

    it('should handle zero values', () => {
      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        arrayBuffers: 0
      });

      const stats = monitor.getStats();

      expect(stats).toEqual({
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        arrayBuffers: 0
      });
    });

    it('should handle large memory values', () => {
      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 2147483648,
        heapTotal: 4294967296,
        rss: 6442450944,
        external: 1073741824,
        arrayBuffers: 536870912
      });

      const stats = monitor.getStats();

      expect(stats).toEqual({
        heapUsed: 2048,
        heapTotal: 4096,
        rss: 6144,
        external: 1024,
        arrayBuffers: 512
      });
    });
  });

  describe('integration scenarios', () => {
    it('should start, monitor, and stop correctly', () => {
      monitor.start();
      expect(Log.info).toHaveBeenCalledWith('Memory monitor started');

      monitor.stop();
      expect(Log.info).toHaveBeenCalledWith('Memory monitor stopped');
    });

    it('should trigger cleanup when memory exceeds threshold', () => {
      const cleanupCallback = jest.fn();
      monitor.onCleanupNeeded(cleanupCallback);

      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      monitor.checkMemory();
      expect(cleanupCallback).not.toHaveBeenCalled();

      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      Date.now = jest.fn(() => 70000);

      monitor.checkMemory();
      expect(cleanupCallback).toHaveBeenCalled();
    });

    it('should prevent cleanup thrashing', () => {
      const cleanupCallback = jest.fn();
      monitor.onCleanupNeeded(cleanupCallback);

      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      Date.now = jest.fn(() => 70000);
      monitor.checkMemory();
      expect(cleanupCallback).toHaveBeenCalledTimes(1);

      Date.now = jest.fn(() => 100000);
      monitor.checkMemory();
      expect(cleanupCallback).toHaveBeenCalledTimes(1);

      Date.now = jest.fn(() => 140000);
      monitor.checkMemory();
      expect(cleanupCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple cleanup callbacks with errors', () => {
      const successCallback1 = jest.fn();
      const errorCallback = jest.fn(() => {
        throw new Error('Cleanup error');
      });
      const successCallback2 = jest.fn();

      monitor.onCleanupNeeded(successCallback1);
      monitor.onCleanupNeeded(errorCallback);
      monitor.onCleanupNeeded(successCallback2);

      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      Date.now = jest.fn(() => 70000);

      monitor.checkMemory();

      expect(successCallback1).toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback2).toHaveBeenCalled();
      expect(Log.error).toHaveBeenCalledWith(
        'Cleanup callback error: Cleanup error'
      );
    });

    it('should provide accurate stats throughout lifecycle', () => {
      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 52428800,
        heapTotal: 104857600,
        rss: 157286400,
        external: 10485760,
        arrayBuffers: 5242880
      });

      const stats1 = monitor.getStats();
      expect(stats1.heapUsed).toBe(50);

      (process.memoryUsage as unknown as jest.Mock).mockReturnValue({
        heapUsed: 73400320,
        heapTotal: 104857600,
        rss: 178257920,
        external: 10485760,
        arrayBuffers: 5242880
      });

      const stats2 = monitor.getStats();
      expect(stats2.heapUsed).toBe(70);
    });
  });
});
