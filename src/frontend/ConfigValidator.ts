/**
 * ConfigValidator.ts
 *
 * Handles configuration validation and normalization
 */

import type { ModuleConfig } from '../types';

class ConfigValidator {
  /**
   * Validate and normalize module configuration
   */
  static validateConfig(config: ModuleConfig): ModuleConfig {
    // Ensure image order is in lower case
    config.sortImagesBy = config.sortImagesBy.toLowerCase();

    // Validate imageinfo property
    const imageInfoRegex = /\bname\b|\bdate\b/giu;
    if (
      config.showImageInfo &&
      !imageInfoRegex.test(config.imageInfo as string)
    ) {
      config.imageInfo = ['name'];
    } else if (typeof config.imageInfo === 'string') {
      // Convert to lower case and replace any spaces with , to make sure we get an array back
      const imageInfoArray = config.imageInfo
        .toLowerCase()
        .replaceAll(/\s/gu, ',')
        .split(',');
      // Filter the array to only those that have values
      config.imageInfo = imageInfoArray.filter(Boolean);
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

export default ConfigValidator;
