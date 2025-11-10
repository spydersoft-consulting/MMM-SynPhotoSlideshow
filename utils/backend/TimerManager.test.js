/**
 * TimerManager.test.js
 *
 * Unit tests for TimerManager
 */

// Mock the Logger
jest.mock('./Logger.js');

const TimerManager = require('./TimerManager');
const Log = require('./Logger.js');

describe('TimerManager', () => {
  let manager;
  let originalSetTimeout;
  let originalClearTimeout;
  let dateToISOStringSpy;
  let callCount;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock setTimeout and clearTimeout
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;

    global.setTimeout = jest.fn((callback, interval) => ({
      callback,
      interval,
      id: Math.random()
    }));

    global.clearTimeout = jest.fn();

    // Mock Date.prototype.toISOString using jest.spyOn
    callCount = 0;
    dateToISOStringSpy = jest.spyOn(Date.prototype, 'toISOString').mockImplementation(() => {
      callCount += 1;
      return `2025-11-09T10:00:${String(callCount).padStart(2, '0')}.000Z`;
    });

    manager = new TimerManager();
  });

  afterEach(() => {
    // Restore originals
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    dateToISOStringSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with null slideshowTimer', () => {
      expect(manager.slideshowTimer).toBeNull();
    });

    it('should initialize with null refreshTimer', () => {
      expect(manager.refreshTimer).toBeNull();
    });
  });

  describe('stopSlideshowTimer', () => {
    it('should do nothing if timer is not running', () => {
      manager.stopSlideshowTimer();

      expect(global.clearTimeout).not.toHaveBeenCalled();
      expect(Log.info).not.toHaveBeenCalled();
    });

    it('should clear timer if running', () => {
      const mockTimer = {
        id: 123
      };
      manager.slideshowTimer = mockTimer;

      manager.stopSlideshowTimer();

      expect(global.clearTimeout).toHaveBeenCalledWith(mockTimer);
    });

    it('should set timer to null after stopping', () => {
      manager.slideshowTimer = {
        id: 123
      };

      manager.stopSlideshowTimer();

      expect(manager.slideshowTimer).toBeNull();
    });

    it('should log stop message with timestamp', () => {
      manager.slideshowTimer = {
        id: 123
      };

      manager.stopSlideshowTimer();

      expect(Log.info).toHaveBeenCalledWith('Stopping slideshow timer at 2025-11-09T10:00:01.000Z');
    });
  });

  describe('startSlideshowTimer', () => {
    it('should stop existing timer before starting new one', () => {
      const existingTimer = {
        id: 123
      };
      manager.slideshowTimer = existingTimer;
      const callback = jest.fn();

      manager.startSlideshowTimer(callback, 5000);

      expect(global.clearTimeout).toHaveBeenCalledWith(existingTimer);
    });

    it('should create new timeout with callback and interval', () => {
      const callback = jest.fn();
      const interval = 5000;

      manager.startSlideshowTimer(callback, interval);

      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), interval);
    });

    it('should store timer reference', () => {
      const callback = jest.fn();
      const mockTimer = {
        id: 456
      };
      global.setTimeout.mockReturnValue(mockTimer);

      manager.startSlideshowTimer(callback, 5000);

      expect(manager.slideshowTimer).toBe(mockTimer);
    });

    it('should log start message with timestamp and interval', () => {
      const callback = jest.fn();

      manager.startSlideshowTimer(callback, 5000);

      expect(Log.info).toHaveBeenCalledWith('Starting slideshow timer at 2025-11-09T10:00:01.000Z with interval: 5000ms (5.0s)');
    });

    it('should format interval as seconds with one decimal', () => {
      const callback = jest.fn();

      manager.startSlideshowTimer(callback, 12345);

      expect(Log.info).toHaveBeenCalledWith(expect.stringContaining('12345ms (12.3s)'));
    });

    it('should execute callback when timer triggers', () => {
      const callback = jest.fn();
      let timerCallback;

      global.setTimeout.mockImplementation((cb, interval) => {
        timerCallback = cb;
        return {
          callback: cb,
          interval
        };
      });

      manager.startSlideshowTimer(callback, 5000);

      expect(callback).not.toHaveBeenCalled();

      timerCallback();

      expect(callback).toHaveBeenCalled();
    });

    it('should log trigger message when callback executes', () => {
      const callback = jest.fn();
      let timerCallback;

      global.setTimeout.mockImplementation((cb) => {
        timerCallback = cb;
        return {
          id: 123
        };
      });

      manager.startSlideshowTimer(callback, 5000);
      jest.clearAllMocks();

      timerCallback();

      expect(Log.info).toHaveBeenCalledWith('Slideshow timer triggered at 2025-11-09T10:00:02.000Z');
    });
  });

  describe('stopRefreshTimer', () => {
    it('should do nothing if timer is not running', () => {
      manager.stopRefreshTimer();

      expect(global.clearTimeout).not.toHaveBeenCalled();
      expect(Log.info).not.toHaveBeenCalled();
    });

    it('should clear timer if running', () => {
      const mockTimer = {
        id: 789
      };
      manager.refreshTimer = mockTimer;

      manager.stopRefreshTimer();

      expect(global.clearTimeout).toHaveBeenCalledWith(mockTimer);
    });

    it('should set timer to null after stopping', () => {
      manager.refreshTimer = {
        id: 789
      };

      manager.stopRefreshTimer();

      expect(manager.refreshTimer).toBeNull();
    });

    it('should log stop message with timestamp', () => {
      manager.refreshTimer = {
        id: 789
      };

      manager.stopRefreshTimer();

      expect(Log.info).toHaveBeenCalledWith('Stopping refresh timer at 2025-11-09T10:00:01.000Z');
    });
  });

  describe('startRefreshTimer', () => {
    it('should stop existing timer before starting new one', () => {
      const existingTimer = {
        id: 789
      };
      manager.refreshTimer = existingTimer;
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 60000);

      expect(global.clearTimeout).toHaveBeenCalledWith(existingTimer);
    });

    it('should not create timer if interval is 0', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 0);

      expect(global.setTimeout).not.toHaveBeenCalled();
      expect(manager.refreshTimer).toBeNull();
    });

    it('should not create timer if interval is negative', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, -1000);

      expect(global.setTimeout).not.toHaveBeenCalled();
      expect(manager.refreshTimer).toBeNull();
    });

    it('should log disabled message when interval <= 0', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 0);

      expect(Log.info).toHaveBeenCalledWith('Refresh timer disabled (interval <= 0)');
    });

    it('should create new timeout with callback and interval', () => {
      const callback = jest.fn();
      const interval = 60000;

      manager.startRefreshTimer(callback, interval);

      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), interval);
    });

    it('should store timer reference', () => {
      const callback = jest.fn();
      const mockTimer = {
        id: 999
      };
      global.setTimeout.mockReturnValue(mockTimer);

      manager.startRefreshTimer(callback, 60000);

      expect(manager.refreshTimer).toBe(mockTimer);
    });

    it('should log start message with timestamp and interval in minutes', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 60000);

      expect(Log.info).toHaveBeenCalledWith('Starting refresh timer at 2025-11-09T10:00:01.000Z with interval: 60000ms (1 minutes)');
    });

    it('should round interval to nearest minute', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 125000);

      expect(Log.info).toHaveBeenCalledWith(expect.stringContaining('125000ms (2 minutes)'));
    });

    it('should execute callback when timer triggers', () => {
      const callback = jest.fn();
      let timerCallback;

      global.setTimeout.mockImplementation((cb, interval) => {
        timerCallback = cb;
        return {
          callback: cb,
          interval
        };
      });

      manager.startRefreshTimer(callback, 60000);

      expect(callback).not.toHaveBeenCalled();

      timerCallback();

      expect(callback).toHaveBeenCalled();
    });

    it('should log trigger message when callback executes', () => {
      const callback = jest.fn();
      let timerCallback;

      global.setTimeout.mockImplementation((cb) => {
        timerCallback = cb;
        return {
          id: 999
        };
      });

      manager.startRefreshTimer(callback, 60000);
      jest.clearAllMocks();

      timerCallback();

      expect(Log.info).toHaveBeenCalledWith('Refresh timer triggered at 2025-11-09T10:00:02.000Z');
    });
  });

  describe('stopAllTimers', () => {
    it('should stop both timers when both are running', () => {
      manager.slideshowTimer = {
        id: 123
      };
      manager.refreshTimer = {
        id: 456
      };

      manager.stopAllTimers();

      expect(global.clearTimeout).toHaveBeenCalledTimes(2);
      expect(manager.slideshowTimer).toBeNull();
      expect(manager.refreshTimer).toBeNull();
    });

    it('should stop slideshow timer only if refresh timer not running', () => {
      manager.slideshowTimer = {
        id: 123
      };

      manager.stopAllTimers();

      expect(global.clearTimeout).toHaveBeenCalledTimes(1);
      expect(manager.slideshowTimer).toBeNull();
    });

    it('should stop refresh timer only if slideshow timer not running', () => {
      manager.refreshTimer = {
        id: 456
      };

      manager.stopAllTimers();

      expect(global.clearTimeout).toHaveBeenCalledTimes(1);
      expect(manager.refreshTimer).toBeNull();
    });

    it('should do nothing if no timers are running', () => {
      manager.stopAllTimers();

      expect(global.clearTimeout).not.toHaveBeenCalled();
    });
  });

  describe('isSlideshowTimerRunning', () => {
    it('should return false when timer is null', () => {
      expect(manager.isSlideshowTimerRunning()).toBe(false);
    });

    it('should return true when timer is set', () => {
      manager.slideshowTimer = {
        id: 123
      };

      expect(manager.isSlideshowTimerRunning()).toBe(true);
    });

    it('should return false after stopping timer', () => {
      manager.slideshowTimer = {
        id: 123
      };
      manager.stopSlideshowTimer();

      expect(manager.isSlideshowTimerRunning()).toBe(false);
    });
  });

  describe('isRefreshTimerRunning', () => {
    it('should return false when timer is null', () => {
      expect(manager.isRefreshTimerRunning()).toBe(false);
    });

    it('should return true when timer is set', () => {
      manager.refreshTimer = {
        id: 456
      };

      expect(manager.isRefreshTimerRunning()).toBe(true);
    });

    it('should return false after stopping timer', () => {
      manager.refreshTimer = {
        id: 456
      };
      manager.stopRefreshTimer();

      expect(manager.isRefreshTimerRunning()).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete slideshow timer lifecycle', () => {
      const callback = jest.fn();
      let timerCallback;

      global.setTimeout.mockImplementation((cb, interval) => {
        timerCallback = cb;
        return {
          callback: cb,
          interval,
          id: 123
        };
      });

      // Start timer
      expect(manager.isSlideshowTimerRunning()).toBe(false);
      manager.startSlideshowTimer(callback, 5000);
      expect(manager.isSlideshowTimerRunning()).toBe(true);

      // Trigger callback
      timerCallback();
      expect(callback).toHaveBeenCalled();

      // Stop timer
      manager.stopSlideshowTimer();
      expect(manager.isSlideshowTimerRunning()).toBe(false);
    });

    it('should handle complete refresh timer lifecycle', () => {
      const callback = jest.fn();
      let timerCallback;

      global.setTimeout.mockImplementation((cb, interval) => {
        timerCallback = cb;
        return {
          callback: cb,
          interval,
          id: 456
        };
      });

      // Start timer
      expect(manager.isRefreshTimerRunning()).toBe(false);
      manager.startRefreshTimer(callback, 60000);
      expect(manager.isRefreshTimerRunning()).toBe(true);

      // Trigger callback
      timerCallback();
      expect(callback).toHaveBeenCalled();

      // Stop timer
      manager.stopRefreshTimer();
      expect(manager.isRefreshTimerRunning()).toBe(false);
    });

    it('should handle restarting slideshow timer', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // Start first timer
      manager.startSlideshowTimer(callback1, 5000);
      const firstTimer = manager.slideshowTimer;

      // Start second timer (should stop first)
      manager.startSlideshowTimer(callback2, 3000);
      const secondTimer = manager.slideshowTimer;

      expect(global.clearTimeout).toHaveBeenCalledWith(firstTimer);
      expect(secondTimer).not.toBe(firstTimer);
    });

    it('should handle restarting refresh timer', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // Start first timer
      manager.startRefreshTimer(callback1, 60000);
      const firstTimer = manager.refreshTimer;

      // Start second timer (should stop first)
      manager.startRefreshTimer(callback2, 120000);
      const secondTimer = manager.refreshTimer;

      expect(global.clearTimeout).toHaveBeenCalledWith(firstTimer);
      expect(secondTimer).not.toBe(firstTimer);
    });

    it('should handle both timers running simultaneously', () => {
      const slideshowCallback = jest.fn();
      const refreshCallback = jest.fn();

      manager.startSlideshowTimer(slideshowCallback, 5000);
      manager.startRefreshTimer(refreshCallback, 60000);

      expect(manager.isSlideshowTimerRunning()).toBe(true);
      expect(manager.isRefreshTimerRunning()).toBe(true);

      manager.stopAllTimers();

      expect(manager.isSlideshowTimerRunning()).toBe(false);
      expect(manager.isRefreshTimerRunning()).toBe(false);
    });

    it('should handle multiple start/stop cycles', () => {
      const callback = jest.fn();

      // First cycle
      manager.startSlideshowTimer(callback, 5000);
      expect(manager.isSlideshowTimerRunning()).toBe(true);
      manager.stopSlideshowTimer();
      expect(manager.isSlideshowTimerRunning()).toBe(false);

      // Second cycle
      manager.startSlideshowTimer(callback, 10000);
      expect(manager.isSlideshowTimerRunning()).toBe(true);
      manager.stopSlideshowTimer();
      expect(manager.isSlideshowTimerRunning()).toBe(false);

      // Third cycle
      manager.startSlideshowTimer(callback, 15000);
      expect(manager.isSlideshowTimerRunning()).toBe(true);
      manager.stopAllTimers();
      expect(manager.isSlideshowTimerRunning()).toBe(false);
    });

    it('should handle refresh timer with zero interval', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 0);

      expect(manager.isRefreshTimerRunning()).toBe(false);
      expect(global.setTimeout).not.toHaveBeenCalled();
      expect(Log.info).toHaveBeenCalledWith('Refresh timer disabled (interval <= 0)');
    });

    it('should handle switching from disabled to enabled refresh timer', () => {
      const callback = jest.fn();

      // Start with disabled
      manager.startRefreshTimer(callback, 0);
      expect(manager.isRefreshTimerRunning()).toBe(false);

      // Enable
      manager.startRefreshTimer(callback, 60000);
      expect(manager.isRefreshTimerRunning()).toBe(true);
    });

    it('should log all operations with proper timestamps', () => {
      const callback = jest.fn();

      manager.startSlideshowTimer(callback, 5000);
      manager.startRefreshTimer(callback, 60000);
      manager.stopSlideshowTimer();
      manager.stopRefreshTimer();

      // Should have logged: start slideshow, start refresh, stop slideshow, stop refresh
      expect(Log.info).toHaveBeenCalledTimes(4);
      expect(Log.info).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Starting slideshow timer')
      );
      expect(Log.info).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Starting refresh timer')
      );
      expect(Log.info).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('Stopping slideshow timer')
      );
      expect(Log.info).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('Stopping refresh timer')
      );
    });
  });
});
