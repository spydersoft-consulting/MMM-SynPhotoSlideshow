/**
 * MemoryMonitor.test.js
 *
 * Unit tests for MemoryMonitor
 */

// Mock the Logger
jest.mock('./Logger.js');

const MemoryMonitor = require('./MemoryMonitor');
const Log = require('./Logger.js');

describe('MemoryMonitor', () => {
  let monitor;
  let mockConfig;
  let originalDateNow;
  let originalSetInterval;
  let originalClearInterval;
  let originalProcessMemoryUsage;
  let originalGlobalGc;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Date.now - start at 0 for easier time calculations
    originalDateNow = Date.now;
    Date.now = jest.fn(() => 0);

    // Mock setInterval and clearInterval
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    global.setInterval = jest.fn((callback, interval) => ({
      callback,
      interval,
      id: Math.random()
    }));
    global.clearInterval = jest.fn();

    // Mock process.memoryUsage
    originalProcessMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn(() => ({
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      rss: 150 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    }));

    // Mock global.gc
    originalGlobalGc = global.gc;
    global.gc = jest.fn();

    mockConfig = {
      memoryMonitorInterval: 60000,
      memoryThreshold: 0.85
    };

    monitor = new MemoryMonitor(mockConfig);
  });

  afterEach(() => {
    // Restore originals
    Date.now = originalDateNow;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    process.memoryUsage = originalProcessMemoryUsage;
    if (originalGlobalGc) {
      global.gc = originalGlobalGc;
    } else {
      delete global.gc;
    }
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(monitor.config).toBe(mockConfig);
    });

    it('should use default monitor interval when not provided', () => {
      const monitorWithDefaults = new MemoryMonitor({});

      expect(monitorWithDefaults.monitorInterval).toBe(60000);
    });

    it('should use custom monitor interval from config', () => {
      mockConfig.memoryMonitorInterval = 30000;
      const customMonitor = new MemoryMonitor(mockConfig);

      expect(customMonitor.monitorInterval).toBe(30000);
    });

    it('should use default memory threshold when not provided', () => {
      const monitorWithDefaults = new MemoryMonitor({});

      expect(monitorWithDefaults.memoryThreshold).toBe(0.85);
    });

    it('should use custom memory threshold from config', () => {
      mockConfig.memoryThreshold = 0.9;
      const customMonitor = new MemoryMonitor(mockConfig);

      expect(customMonitor.memoryThreshold).toBe(0.9);
    });

    it('should initialize timer as null', () => {
      expect(monitor.timer).toBeNull();
    });

    it('should initialize lastCleanup with current time', () => {
      expect(monitor.lastCleanup).toBe(0);
    });

    it('should initialize empty cleanupCallbacks array', () => {
      expect(monitor.cleanupCallbacks).toEqual([]);
    });

    it('should handle empty config object', () => {
      const emptyMonitor = new MemoryMonitor();

      expect(emptyMonitor.monitorInterval).toBe(60000);
      expect(emptyMonitor.memoryThreshold).toBe(0.85);
    });
  });

  describe('start', () => {
    it('should log start message', () => {
      monitor.start();

      expect(Log.info).toHaveBeenCalledWith('Memory monitor started');
    });

    it('should set up interval timer', () => {
      monitor.start();

      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 60000);
      expect(monitor.timer).not.toBeNull();
    });

    it('should perform initial memory check', () => {
      const checkMemorySpy = jest.spyOn(monitor, 'checkMemory');

      monitor.start();

      expect(checkMemorySpy).toHaveBeenCalled();
    });

    it('should not start if already running', () => {
      monitor.start();
      const firstTimer = monitor.timer;
      jest.clearAllMocks();

      monitor.start();

      expect(Log.info).not.toHaveBeenCalled();
      expect(monitor.timer).toBe(firstTimer);
    });

    it('should use custom interval from config', () => {
      mockConfig.memoryMonitorInterval = 30000;
      const customMonitor = new MemoryMonitor(mockConfig);

      customMonitor.start();

      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
    });
  });

  describe('stop', () => {
    it('should clear interval timer', () => {
      monitor.start();
      const timerId = monitor.timer;

      monitor.stop();

      expect(global.clearInterval).toHaveBeenCalledWith(timerId);
    });

    it('should set timer to null', () => {
      monitor.start();

      monitor.stop();

      expect(monitor.timer).toBeNull();
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
    it('should add callback to cleanupCallbacks array', () => {
      const callback = jest.fn();

      monitor.onCleanupNeeded(callback);

      expect(monitor.cleanupCallbacks).toContain(callback);
    });

    it('should add multiple callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      monitor.onCleanupNeeded(callback1);
      monitor.onCleanupNeeded(callback2);
      monitor.onCleanupNeeded(callback3);

      expect(monitor.cleanupCallbacks).toHaveLength(3);
      expect(monitor.cleanupCallbacks).toEqual([callback1, callback2, callback3]);
    });
  });

  describe('checkMemory', () => {
    it('should get memory usage from process', () => {
      monitor.checkMemory();

      expect(process.memoryUsage).toHaveBeenCalled();
    });

    it('should log memory statistics', () => {
      process.memoryUsage.mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      monitor.checkMemory();

      expect(Log.debug).toHaveBeenCalledWith('Memory: 50.00MB / 100.00MB (50.0%)');
    });

    it('should not trigger cleanup when below threshold', () => {
      process.memoryUsage.mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      const triggerCleanupSpy = jest.spyOn(monitor, 'triggerCleanup');

      monitor.checkMemory();

      expect(triggerCleanupSpy).not.toHaveBeenCalled();
    });

    it('should trigger cleanup when above threshold', () => {
      process.memoryUsage.mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      const triggerCleanupSpy = jest.spyOn(monitor, 'triggerCleanup');

      // Advance time past 60s to allow cleanup
      Date.now = jest.fn(() => 70000);

      monitor.checkMemory();

      expect(Log.warn).toHaveBeenCalledWith('High memory usage detected (90.0%), triggering cleanup');
      expect(triggerCleanupSpy).toHaveBeenCalled();
    });

    it('should update lastCleanup time when cleanup is triggered', () => {
      process.memoryUsage.mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      Date.now = jest.fn(() => 70000);

      monitor.checkMemory();

      expect(monitor.lastCleanup).toBe(70000);
    });

    it('should not trigger cleanup if cleanup happened recently', () => {
      process.memoryUsage.mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      monitor.lastCleanup = 0;
      Date.now = jest.fn(() => 50000); // 50 seconds later
      const triggerCleanupSpy = jest.spyOn(monitor, 'triggerCleanup');

      monitor.checkMemory();

      expect(triggerCleanupSpy).not.toHaveBeenCalled();
    });

    it('should trigger cleanup if cleanup was more than 60s ago', () => {
      process.memoryUsage.mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      monitor.lastCleanup = 0;
      Date.now = jest.fn(() => 70000); // More than 60 seconds later
      const triggerCleanupSpy = jest.spyOn(monitor, 'triggerCleanup');

      monitor.checkMemory();

      expect(triggerCleanupSpy).toHaveBeenCalled();
    });

    it('should handle exactly at threshold', () => {
      process.memoryUsage.mockReturnValue({
        heapUsed: 85 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      const triggerCleanupSpy = jest.spyOn(monitor, 'triggerCleanup');

      monitor.checkMemory();

      // 85% == 0.85, should not trigger (only > threshold)
      expect(triggerCleanupSpy).not.toHaveBeenCalled();
    });
  });

  describe('triggerCleanup', () => {
    it('should call all registered cleanup callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      monitor.onCleanupNeeded(callback1);
      monitor.onCleanupNeeded(callback2);
      monitor.onCleanupNeeded(callback3);

      monitor.triggerCleanup();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const error = new Error('Callback failed');
      const failingCallback = jest.fn(() => {
        throw error;
      });
      const successCallback = jest.fn();

      monitor.onCleanupNeeded(failingCallback);
      monitor.onCleanupNeeded(successCallback);

      monitor.triggerCleanup();

      expect(Log.error).toHaveBeenCalledWith('Cleanup callback error: Callback failed');
      expect(successCallback).toHaveBeenCalled();
    });

    it('should call global.gc if available', () => {
      global.gc = jest.fn();

      monitor.triggerCleanup();

      expect(Log.info).toHaveBeenCalledWith('Running garbage collection');
      expect(global.gc).toHaveBeenCalled();
    });

    it('should not fail if global.gc is not available', () => {
      delete global.gc;

      expect(() => {
        monitor.triggerCleanup();
      }).not.toThrow();
    });

    it('should work with no callbacks registered', () => {
      expect(() => {
        monitor.triggerCleanup();
      }).not.toThrow();
    });

    it('should call callbacks in order', () => {
      const callOrder = [];
      const callback1 = jest.fn(() => callOrder.push(1));
      const callback2 = jest.fn(() => callOrder.push(2));
      const callback3 = jest.fn(() => callOrder.push(3));

      monitor.onCleanupNeeded(callback1);
      monitor.onCleanupNeeded(callback2);
      monitor.onCleanupNeeded(callback3);

      monitor.triggerCleanup();

      expect(callOrder).toEqual([1, 2, 3]);
    });
  });

  describe('getStats', () => {
    it('should return memory stats in MB', () => {
      process.memoryUsage.mockReturnValue({
        heapUsed: 52428800, // 50MB
        heapTotal: 104857600, // 100MB
        rss: 157286400, // 150MB
        external: 10485760, // 10MB
        arrayBuffers: 5242880 // 5MB
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
      process.memoryUsage.mockReturnValue({
        heapUsed: 52428800 + 524288, // 50.5MB
        heapTotal: 104857600 + 524288, // 100.5MB
        rss: 157286400 + 524288, // 150.5MB
        external: 10485760 + 524288, // 10.5MB
        arrayBuffers: 5242880 + 524288 // 5.5MB
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
      process.memoryUsage.mockReturnValue({
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
      process.memoryUsage.mockReturnValue({
        heapUsed: 2147483648, // 2GB
        heapTotal: 4294967296, // 4GB
        rss: 6442450944, // 6GB
        external: 1073741824, // 1GB
        arrayBuffers: 536870912 // 512MB
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
      expect(monitor.timer).not.toBeNull();
      expect(Log.info).toHaveBeenCalledWith('Memory monitor started');

      monitor.stop();
      expect(monitor.timer).toBeNull();
      expect(Log.info).toHaveBeenCalledWith('Memory monitor stopped');
    });

    it('should trigger cleanup when memory exceeds threshold', () => {
      const cleanupCallback = jest.fn();
      monitor.onCleanupNeeded(cleanupCallback);

      // Start with normal memory
      process.memoryUsage.mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      monitor.checkMemory();
      expect(cleanupCallback).not.toHaveBeenCalled();

      // Simulate high memory and advance time
      process.memoryUsage.mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });
      Date.now = jest.fn(() => 70000); // More than 60s later

      monitor.checkMemory();
      expect(cleanupCallback).toHaveBeenCalled();
    });

    it('should prevent cleanup thrashing', () => {
      const cleanupCallback = jest.fn();
      monitor.onCleanupNeeded(cleanupCallback);

      process.memoryUsage.mockReturnValue({
        heapUsed: 90 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      // First check - should trigger (at 70s)
      Date.now = jest.fn(() => 70000);
      monitor.checkMemory();
      expect(cleanupCallback).toHaveBeenCalledTimes(1);

      // Second check 30s later (100s) - should not trigger
      Date.now = jest.fn(() => 100000);
      monitor.checkMemory();
      expect(cleanupCallback).toHaveBeenCalledTimes(1);

      // Third check 60s+ after first cleanup (140s) - should trigger
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

      monitor.triggerCleanup();

      expect(successCallback1).toHaveBeenCalled();
      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback2).toHaveBeenCalled();
      expect(Log.error).toHaveBeenCalledWith('Cleanup callback error: Cleanup error');
    });

    it('should provide accurate stats throughout lifecycle', () => {
      process.memoryUsage.mockReturnValue({
        heapUsed: 52428800,
        heapTotal: 104857600,
        rss: 157286400,
        external: 10485760,
        arrayBuffers: 5242880
      });

      const stats1 = monitor.getStats();
      expect(stats1.heapUsed).toBe(50);

      // Simulate memory increase
      process.memoryUsage.mockReturnValue({
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
