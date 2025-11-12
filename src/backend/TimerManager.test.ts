/**
 * TimerManager.test.ts
 *
 * Unit tests for TimerManager
 */

jest.mock('./Logger');

import TimerManager from './TimerManager';
import Log from './Logger';

describe('TimerManager', () => {
  let manager: TimerManager;
  let originalSetTimeout: typeof setTimeout;
  let originalClearTimeout: typeof clearTimeout;
  let dateToISOStringSpy: jest.SpyInstance;
  let callCount: number;

  beforeEach(() => {
    jest.clearAllMocks();

    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;

    global.setTimeout = jest.fn((callback: () => void, interval?: number) => ({
      callback,
      interval,
      id: Math.random()
    })) as unknown as typeof setTimeout;

    global.clearTimeout = jest.fn();

    callCount = 0;
    dateToISOStringSpy = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockImplementation(() => {
        callCount += 1;
        return `2025-11-09T10:00:${String(callCount).padStart(2, '0')}.000Z`;
      });

    manager = new TimerManager();
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    dateToISOStringSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with no running timers', () => {
      expect(manager.isSlideshowTimerRunning()).toBe(false);
      expect(manager.isRefreshTimerRunning()).toBe(false);
    });
  });

  describe('stopSlideshowTimer', () => {
    it('should do nothing if timer is not running', () => {
      manager.stopSlideshowTimer();

      expect(global.clearTimeout).not.toHaveBeenCalled();
      expect(Log.debug).not.toHaveBeenCalled();
    });

    it('should clear timer if running', () => {
      const callback = jest.fn();
      manager.startSlideshowTimer(callback, 5000);
      jest.clearAllMocks();

      manager.stopSlideshowTimer();

      expect(global.clearTimeout).toHaveBeenCalledTimes(1);
    });

    it('should mark timer as not running after stopping', () => {
      const callback = jest.fn();
      manager.startSlideshowTimer(callback, 5000);
      expect(manager.isSlideshowTimerRunning()).toBe(true);

      manager.stopSlideshowTimer();

      expect(manager.isSlideshowTimerRunning()).toBe(false);
    });

    it('should log stop message with timestamp', () => {
      const callback = jest.fn();
      manager.startSlideshowTimer(callback, 5000);
      jest.clearAllMocks();

      manager.stopSlideshowTimer();

      expect(Log.debug).toHaveBeenCalledWith(
        'Stopping slideshow timer at 2025-11-09T10:00:02.000Z'
      );
    });
  });

  describe('startSlideshowTimer', () => {
    it('should stop existing timer before starting new one', () => {
      const callback = jest.fn();
      manager.startSlideshowTimer(callback, 5000);
      jest.clearAllMocks();

      manager.startSlideshowTimer(callback, 3000);

      expect(global.clearTimeout).toHaveBeenCalledTimes(1);
    });

    it('should create new timeout with callback and interval', () => {
      const callback = jest.fn();
      const interval = 5000;

      manager.startSlideshowTimer(callback, interval);

      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        interval
      );
    });

    it('should mark timer as running', () => {
      const callback = jest.fn();
      expect(manager.isSlideshowTimerRunning()).toBe(false);

      manager.startSlideshowTimer(callback, 5000);

      expect(manager.isSlideshowTimerRunning()).toBe(true);
    });

    it('should log start message with timestamp and interval', () => {
      const callback = jest.fn();

      manager.startSlideshowTimer(callback, 5000);

      expect(Log.debug).toHaveBeenCalledWith(
        'Starting slideshow timer at 2025-11-09T10:00:01.000Z with interval: 5000ms (5.0s)'
      );
    });

    it('should format interval as seconds with one decimal', () => {
      const callback = jest.fn();

      manager.startSlideshowTimer(callback, 12345);

      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('12345ms (12.3s)')
      );
    });

    it('should execute callback when timer triggers', () => {
      const callback = jest.fn();
      let timerCallback: (() => void) | undefined;

      (global.setTimeout as unknown as jest.Mock).mockImplementation(
        (cb: () => void, interval: number) => {
          timerCallback = cb;
          return {
            callback: cb,
            interval
          };
        }
      );

      manager.startSlideshowTimer(callback, 5000);

      expect(callback).not.toHaveBeenCalled();

      timerCallback?.();

      expect(callback).toHaveBeenCalled();
    });

    it('should log trigger message when callback executes', () => {
      const callback = jest.fn();
      let timerCallback: (() => void) | undefined;

      (global.setTimeout as unknown as jest.Mock).mockImplementation(
        (cb: () => void) => {
          timerCallback = cb;
          return {
            id: 123
          };
        }
      );

      manager.startSlideshowTimer(callback, 5000);
      jest.clearAllMocks();

      timerCallback?.();

      expect(Log.debug).toHaveBeenCalledWith(
        'Slideshow timer triggered at 2025-11-09T10:00:02.000Z'
      );
    });
  });

  describe('stopRefreshTimer', () => {
    it('should do nothing if timer is not running', () => {
      manager.stopRefreshTimer();

      expect(global.clearTimeout).not.toHaveBeenCalled();
      expect(Log.debug).not.toHaveBeenCalled();
    });

    it('should clear timer if running', () => {
      const callback = jest.fn();
      manager.startRefreshTimer(callback, 60000);
      jest.clearAllMocks();

      manager.stopRefreshTimer();

      expect(global.clearTimeout).toHaveBeenCalledTimes(1);
    });

    it('should mark timer as not running after stopping', () => {
      const callback = jest.fn();
      manager.startRefreshTimer(callback, 60000);
      expect(manager.isRefreshTimerRunning()).toBe(true);

      manager.stopRefreshTimer();

      expect(manager.isRefreshTimerRunning()).toBe(false);
    });

    it('should log stop message with timestamp', () => {
      const callback = jest.fn();
      manager.startRefreshTimer(callback, 60000);
      jest.clearAllMocks();

      manager.stopRefreshTimer();

      expect(Log.debug).toHaveBeenCalledWith(
        'Stopping refresh timer at 2025-11-09T10:00:02.000Z'
      );
    });
  });

  describe('startRefreshTimer', () => {
    it('should stop existing timer before starting new one', () => {
      const callback = jest.fn();
      manager.startRefreshTimer(callback, 60000);
      jest.clearAllMocks();

      manager.startRefreshTimer(callback, 120000);

      expect(global.clearTimeout).toHaveBeenCalledTimes(1);
    });

    it('should not create timer if interval is 0', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 0);

      expect(global.setTimeout).not.toHaveBeenCalled();
      expect(manager.isRefreshTimerRunning()).toBe(false);
    });

    it('should not create timer if interval is negative', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, -1000);

      expect(global.setTimeout).not.toHaveBeenCalled();
      expect(manager.isRefreshTimerRunning()).toBe(false);
    });

    it('should log disabled message when interval <= 0', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 0);

      expect(Log.debug).toHaveBeenCalledWith(
        'Refresh timer disabled (interval <= 0)'
      );
    });

    it('should create new timeout with callback and interval', () => {
      const callback = jest.fn();
      const interval = 60000;

      manager.startRefreshTimer(callback, interval);

      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        interval
      );
    });

    it('should mark timer as running', () => {
      const callback = jest.fn();
      expect(manager.isRefreshTimerRunning()).toBe(false);

      manager.startRefreshTimer(callback, 60000);

      expect(manager.isRefreshTimerRunning()).toBe(true);
    });

    it('should log start message with timestamp and interval in minutes', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 60000);

      expect(Log.debug).toHaveBeenCalledWith(
        'Starting refresh timer at 2025-11-09T10:00:01.000Z with interval: 60000ms (1 minutes)'
      );
    });

    it('should round interval to nearest minute', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 125000);

      expect(Log.debug).toHaveBeenCalledWith(
        expect.stringContaining('125000ms (2 minutes)')
      );
    });

    it('should execute callback when timer triggers', () => {
      const callback = jest.fn();
      let timerCallback: (() => void) | undefined;

      (global.setTimeout as unknown as jest.Mock).mockImplementation(
        (cb: () => void, interval: number) => {
          timerCallback = cb;
          return {
            callback: cb,
            interval
          };
        }
      );

      manager.startRefreshTimer(callback, 60000);

      expect(callback).not.toHaveBeenCalled();

      timerCallback?.();

      expect(callback).toHaveBeenCalled();
    });

    it('should log trigger message when callback executes', () => {
      const callback = jest.fn();
      let timerCallback: (() => void) | undefined;

      (global.setTimeout as unknown as jest.Mock).mockImplementation(
        (cb: () => void) => {
          timerCallback = cb;
          return {
            id: 999
          };
        }
      );

      manager.startRefreshTimer(callback, 60000);
      jest.clearAllMocks();

      timerCallback?.();

      expect(Log.debug).toHaveBeenCalledWith(
        'Refresh timer triggered at 2025-11-09T10:00:02.000Z'
      );
    });
  });

  describe('stopAllTimers', () => {
    it('should stop both timers when both are running', () => {
      const callback = jest.fn();
      manager.startSlideshowTimer(callback, 5000);
      manager.startRefreshTimer(callback, 60000);
      jest.clearAllMocks();

      manager.stopAllTimers();

      expect(global.clearTimeout).toHaveBeenCalledTimes(2);
      expect(manager.isSlideshowTimerRunning()).toBe(false);
      expect(manager.isRefreshTimerRunning()).toBe(false);
    });

    it('should stop slideshow timer only if refresh timer not running', () => {
      const callback = jest.fn();
      manager.startSlideshowTimer(callback, 5000);
      jest.clearAllMocks();

      manager.stopAllTimers();

      expect(global.clearTimeout).toHaveBeenCalledTimes(1);
      expect(manager.isSlideshowTimerRunning()).toBe(false);
    });

    it('should stop refresh timer only if slideshow timer not running', () => {
      const callback = jest.fn();
      manager.startRefreshTimer(callback, 60000);
      jest.clearAllMocks();

      manager.stopAllTimers();

      expect(global.clearTimeout).toHaveBeenCalledTimes(1);
      expect(manager.isRefreshTimerRunning()).toBe(false);
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
      const callback = jest.fn();
      manager.startSlideshowTimer(callback, 5000);

      expect(manager.isSlideshowTimerRunning()).toBe(true);
    });

    it('should return false after stopping timer', () => {
      const callback = jest.fn();
      manager.startSlideshowTimer(callback, 5000);
      manager.stopSlideshowTimer();

      expect(manager.isSlideshowTimerRunning()).toBe(false);
    });
  });

  describe('isRefreshTimerRunning', () => {
    it('should return false when timer is null', () => {
      expect(manager.isRefreshTimerRunning()).toBe(false);
    });

    it('should return true when timer is set', () => {
      const callback = jest.fn();
      manager.startRefreshTimer(callback, 60000);

      expect(manager.isRefreshTimerRunning()).toBe(true);
    });

    it('should return false after stopping timer', () => {
      const callback = jest.fn();
      manager.startRefreshTimer(callback, 60000);
      manager.stopRefreshTimer();

      expect(manager.isRefreshTimerRunning()).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete slideshow timer lifecycle', () => {
      const callback = jest.fn();
      let timerCallback: (() => void) | undefined;

      (global.setTimeout as unknown as jest.Mock).mockImplementation(
        (cb: () => void, interval: number) => {
          timerCallback = cb;
          return {
            callback: cb,
            interval,
            id: 123
          };
        }
      );

      expect(manager.isSlideshowTimerRunning()).toBe(false);
      manager.startSlideshowTimer(callback, 5000);
      expect(manager.isSlideshowTimerRunning()).toBe(true);

      timerCallback?.();
      expect(callback).toHaveBeenCalled();

      manager.stopSlideshowTimer();
      expect(manager.isSlideshowTimerRunning()).toBe(false);
    });

    it('should handle complete refresh timer lifecycle', () => {
      const callback = jest.fn();
      let timerCallback: (() => void) | undefined;

      (global.setTimeout as unknown as jest.Mock).mockImplementation(
        (cb: () => void, interval: number) => {
          timerCallback = cb;
          return {
            callback: cb,
            interval,
            id: 456
          };
        }
      );

      expect(manager.isRefreshTimerRunning()).toBe(false);
      manager.startRefreshTimer(callback, 60000);
      expect(manager.isRefreshTimerRunning()).toBe(true);

      timerCallback?.();
      expect(callback).toHaveBeenCalled();

      manager.stopRefreshTimer();
      expect(manager.isRefreshTimerRunning()).toBe(false);
    });

    it('should handle restarting slideshow timer', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.startSlideshowTimer(callback1, 5000);
      expect(manager.isSlideshowTimerRunning()).toBe(true);

      manager.startSlideshowTimer(callback2, 3000);

      expect(global.clearTimeout).toHaveBeenCalled();
      expect(manager.isSlideshowTimerRunning()).toBe(true);
    });

    it('should handle restarting refresh timer', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.startRefreshTimer(callback1, 60000);
      expect(manager.isRefreshTimerRunning()).toBe(true);

      manager.startRefreshTimer(callback2, 120000);

      expect(global.clearTimeout).toHaveBeenCalled();
      expect(manager.isRefreshTimerRunning()).toBe(true);
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

      manager.startSlideshowTimer(callback, 5000);
      expect(manager.isSlideshowTimerRunning()).toBe(true);
      manager.stopSlideshowTimer();
      expect(manager.isSlideshowTimerRunning()).toBe(false);

      manager.startSlideshowTimer(callback, 10000);
      expect(manager.isSlideshowTimerRunning()).toBe(true);
      manager.stopSlideshowTimer();
      expect(manager.isSlideshowTimerRunning()).toBe(false);

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
      expect(Log.debug).toHaveBeenCalledWith(
        'Refresh timer disabled (interval <= 0)'
      );
    });

    it('should handle switching from disabled to enabled refresh timer', () => {
      const callback = jest.fn();

      manager.startRefreshTimer(callback, 0);
      expect(manager.isRefreshTimerRunning()).toBe(false);

      manager.startRefreshTimer(callback, 60000);
      expect(manager.isRefreshTimerRunning()).toBe(true);
    });

    it('should log all operations with proper timestamps', () => {
      const callback = jest.fn();

      manager.startSlideshowTimer(callback, 5000);
      manager.startRefreshTimer(callback, 60000);
      manager.stopSlideshowTimer();
      manager.stopRefreshTimer();

      expect(Log.debug).toHaveBeenCalledTimes(4);
      expect(Log.debug).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Starting slideshow timer')
      );
      expect(Log.debug).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Starting refresh timer')
      );
      expect(Log.debug).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('Stopping slideshow timer')
      );
      expect(Log.debug).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('Stopping refresh timer')
      );
    });
  });
});
