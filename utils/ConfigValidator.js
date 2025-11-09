/**
 * ConfigValidator.js
 *
 * Handles configuration validation and normalization
 */

const Log = require('./Logger.js');

class ConfigValidator {

  /**
   * Validate and normalize module configuration
   */
  static validateConfig (config) {
    // Ensure image order is in lower case
    config.sortImagesBy = config.sortImagesBy.toLowerCase();

    // Validate imageinfo property
    const imageInfoRegex = /\bname\b|\bdate\b/giu;
    if (config.showImageInfo && !imageInfoRegex.test(config.imageInfo)) {
      Log.warn('showImageInfo is set, but imageInfo does not have a valid value.');
      config.imageInfo = ['name'];
    } else {
      // Convert to lower case and replace any spaces with , to make sure we get an array back
      config.imageInfo = config.imageInfo
        .toLowerCase()
        .replace(/\s/gu, ',')
        .split(',');
      // Filter the array to only those that have values
      config.imageInfo = config.imageInfo.filter((n) => n);
    }

    // Disable transition speed if transitions are disabled
    if (!config.transitionImages) {
      config.transitionSpeed = '0';
    }

    // Match backgroundAnimation duration to slideShowSpeed unless overridden
    if (config.backgroundAnimationDuration === '1s') {
      config.backgroundAnimationDuration = `${config.slideshowSpeed / 1000}s`;
    }

    return config;
  }

}

// Export for Node.js (if needed) or use directly in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigValidator;
}
