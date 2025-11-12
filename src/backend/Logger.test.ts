/**
 * Logger.test.ts
 *
 * Unit tests for Logger
 */

// Mock the require function to return our mock logger
const mockMagicMirrorLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
};

// Mock the module before importing
jest.mock('../../../js/logger.js', () => mockMagicMirrorLogger, {
  virtual: true
});

import Logger from './Logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the internal logger instance to force re-initialization
    (Logger as unknown as { _log: unknown })._log = null;
    // Make sure require returns our mock
    jest.doMock('../../../js/logger.js', () => mockMagicMirrorLogger);
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(Logger).toBeDefined();
      expect(typeof Logger).toBe('object');
    });
  });

  describe('info', () => {
    it('should call MagicMirror logger info method', () => {
      Logger.info('Test message');

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledTimes(1);
    });

    it('should add module prefix to message', () => {
      Logger.info('Test message');

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Test message'
      );
    });

    it('should pass additional arguments', () => {
      Logger.info('Test message', 'arg1', 'arg2', 123);

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Test message',
        'arg1',
        'arg2',
        123
      );
    });

    it('should not add prefix if already present', () => {
      Logger.info('[MMM-SynPhotoSlideshow] Already prefixed');

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Already prefixed'
      );
    });

    it('should handle non-string messages', () => {
      Logger.info(123 as unknown as string);

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] 123'
      );
    });

    it('should handle object messages', () => {
      const obj = { key: 'value' };
      Logger.info(obj as unknown as string);

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] [object Object]'
      );
    });
  });

  describe('error', () => {
    it('should call MagicMirror logger error method', () => {
      Logger.error('Error message');

      expect(mockMagicMirrorLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should add module prefix to message', () => {
      Logger.error('Error message');

      expect(mockMagicMirrorLogger.error).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Error message'
      );
    });

    it('should pass additional arguments', () => {
      const error = new Error('Test error');
      Logger.error('Error occurred', error);

      expect(mockMagicMirrorLogger.error).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Error occurred',
        error
      );
    });

    it('should not add prefix if already present', () => {
      Logger.error('[MMM-SynPhotoSlideshow] Already prefixed error');

      expect(mockMagicMirrorLogger.error).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Already prefixed error'
      );
    });
  });

  describe('warn', () => {
    it('should call MagicMirror logger warn method', () => {
      Logger.warn('Warning message');

      expect(mockMagicMirrorLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('should add module prefix to message', () => {
      Logger.warn('Warning message');

      expect(mockMagicMirrorLogger.warn).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Warning message'
      );
    });

    it('should pass additional arguments', () => {
      Logger.warn('Warning message', 'detail1', 'detail2');

      expect(mockMagicMirrorLogger.warn).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Warning message',
        'detail1',
        'detail2'
      );
    });

    it('should not add prefix if already present', () => {
      Logger.warn('[MMM-SynPhotoSlideshow] Already prefixed warning');

      expect(mockMagicMirrorLogger.warn).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Already prefixed warning'
      );
    });
  });

  describe('debug', () => {
    it('should call MagicMirror logger debug method', () => {
      Logger.debug('Debug message');

      expect(mockMagicMirrorLogger.debug).toHaveBeenCalledTimes(1);
    });

    it('should add module prefix to message', () => {
      Logger.debug('Debug message');

      expect(mockMagicMirrorLogger.debug).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Debug message'
      );
    });

    it('should pass additional arguments', () => {
      const debugData = { foo: 'bar' };
      Logger.debug('Debug message', debugData);

      expect(mockMagicMirrorLogger.debug).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Debug message',
        debugData
      );
    });

    it('should not add prefix if already present', () => {
      Logger.debug('[MMM-SynPhotoSlideshow] Already prefixed debug');

      expect(mockMagicMirrorLogger.debug).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Already prefixed debug'
      );
    });
  });

  describe('log', () => {
    it('should call MagicMirror logger log method', () => {
      Logger.log('Log message');

      expect(mockMagicMirrorLogger.log).toHaveBeenCalledTimes(1);
    });

    it('should add module prefix to message', () => {
      Logger.log('Log message');

      expect(mockMagicMirrorLogger.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Log message'
      );
    });

    it('should pass additional arguments', () => {
      Logger.log('Log message', 1, 2, 3);

      expect(mockMagicMirrorLogger.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Log message',
        1,
        2,
        3
      );
    });

    it('should not add prefix if already present', () => {
      Logger.log('[MMM-SynPhotoSlideshow] Already prefixed log');

      expect(mockMagicMirrorLogger.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Already prefixed log'
      );
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to console if MagicMirror logger not available', () => {
      jest.resetModules();

      // Spy on console methods
      const consoleSpy = {
        info: jest.spyOn(console, 'info').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        debug: jest.spyOn(console, 'debug').mockImplementation(),
        log: jest.spyOn(console, 'log').mockImplementation()
      };

      // Mock require to throw error
      jest.mock(
        '../../../js/logger.js',
        () => {
          throw new Error('Logger not found');
        },
        { virtual: true }
      );

      // Should use console instead
      Logger.info('Test');
      expect(consoleSpy.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Test'
      );

      Logger.error('Error');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Error'
      );

      // Restore console
      Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple log levels in sequence', () => {
      Logger.info('Info message');
      Logger.warn('Warning message');
      Logger.error('Error message');
      Logger.debug('Debug message');
      Logger.log('Log message');

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Info message'
      );
      expect(mockMagicMirrorLogger.warn).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Warning message'
      );
      expect(mockMagicMirrorLogger.error).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Error message'
      );
      expect(mockMagicMirrorLogger.debug).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Debug message'
      );
      expect(mockMagicMirrorLogger.log).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Log message'
      );
    });

    it('should handle empty strings', () => {
      Logger.info('');

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] '
      );
    });

    it('should handle null message', () => {
      Logger.info(null as unknown as string);

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] null'
      );
    });

    it('should handle undefined message', () => {
      Logger.info(undefined as unknown as string);

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] undefined'
      );
    });

    it('should handle message with prefix in the middle', () => {
      Logger.info('Message with [MMM-SynPhotoSlideshow] in middle');

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Message with [MMM-SynPhotoSlideshow] in middle'
      );
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      Logger.info(longMessage);

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        `[MMM-SynPhotoSlideshow] ${longMessage}`
      );
    });

    it('should handle special characters in message', () => {
      Logger.info('Message with\nnewline\tand\ttabs');

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Message with\nnewline\tand\ttabs'
      );
    });

    it('should handle unicode characters', () => {
      Logger.info('Message with émojis 🎉 and spëcial çhars');

      expect(mockMagicMirrorLogger.info).toHaveBeenCalledWith(
        '[MMM-SynPhotoSlideshow] Message with émojis 🎉 and spëcial çhars'
      );
    });
  });
});
