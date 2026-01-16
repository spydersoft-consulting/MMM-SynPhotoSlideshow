/**
 * Logger.ts
 *
 * Abstraction layer for MagicMirror logger
 * Provides consistent logging with module prefix
 */

const LOG_PREFIX = '[MMM-SynPhotoSlideshow]';

interface LoggerInterface {
  info(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  log(message: string, ...args: unknown[]): void;
}

class Logger {
  // Lazily load the MagicMirror logger when first needed
  private _log: LoggerInterface | null = null;

  /**
   * Get the MagicMirror logger instance
   * @private
   */
  private _getLogger(): LoggerInterface {
    if (!this._log) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this._log = require('logger') as LoggerInterface;
      } catch {
        // Fallback to console if logger not available (e.g., in tests)
        this._log = console;
      }
    }
    return this._log;
  }

  /**
   * Format message with module prefix
   * @private
   */
  private _formatMessage(message: string): string {
    // If message already has the prefix, don't add it again
    if (typeof message === 'string' && message.startsWith(LOG_PREFIX)) {
      return message;
    }
    return `${LOG_PREFIX} ${message}`;
  }

  /**
   * Check if a log method is enabled (not replaced by setLogLevel with empty function)
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private _isMethodEnabled(method: Function): boolean {
    // When setLogLevel disables a method, it replaces it with: function () {}
    // We can detect this by checking the function's string representation
    const funcStr = method.toString();
    // Empty stub functions are very short and contain only "function () {}"
    return funcStr.length > 25 || funcStr.includes('native code');
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    this._getLogger().info(this._formatMessage(message), ...args);
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    this._getLogger().error(this._formatMessage(message), ...args);
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this._getLogger().warn(this._formatMessage(message), ...args);
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: unknown[]): void {
    const logger = this._getLogger();
    // Only log if the debug method hasn't been disabled by setLogLevel
    if (this._isMethodEnabled(logger.debug)) {
      logger.debug(this._formatMessage(message), ...args);
    }
  }

  /**
   * Log general message (LOG level)
   */
  log(message: string, ...args: unknown[]): void {
    const logger = this._getLogger();
    // Only log if the log method hasn't been disabled by setLogLevel
    if (this._isMethodEnabled(logger.log)) {
      logger.log(this._formatMessage(message), ...args);
    }
  }
}

// Export singleton instance
export default new Logger();
