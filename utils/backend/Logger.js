/**
 * Logger.js
 *
 * Abstraction layer for MagicMirror logger
 * Provides consistent logging with module prefix
 */

const LOG_PREFIX = '[MMM-SynPhotoSlideshow]';

class Logger {
  // Lazily load the MagicMirror logger when first needed
  _log = null;

  /**
   * Get the MagicMirror logger instance
   * @private
   */
  _getLogger () {
    if (!this._log) {
      try {
        this._log = require('../../../js/logger.js');
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
  _formatMessage (message) {
    // If message already has the prefix, don't add it again
    if (typeof message === 'string' && message.startsWith(LOG_PREFIX)) {
      return message;
    }
    return `${LOG_PREFIX} ${message}`;
  }

  /**
   * Log info message
   */
  info (message, ...args) {
    this._getLogger().info(this._formatMessage(message), ...args);
  }

  /**
   * Log error message
   */
  error (message, ...args) {
    this._getLogger().error(this._formatMessage(message), ...args);
  }

  /**
   * Log warning message
   */
  warn (message, ...args) {
    this._getLogger().warn(this._formatMessage(message), ...args);
  }

  /**
   * Log debug message
   */
  debug (message, ...args) {
    this._getLogger().debug(this._formatMessage(message), ...args);
  }

  /**
   * Log general message
   */
  log (message, ...args) {
    this._getLogger().log(this._formatMessage(message), ...args);
  }
}

// Export singleton instance
module.exports = new Logger();
