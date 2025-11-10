/**
 * ConfigLoader.js
 *
 * Loads configuration from environment variables or config file
 */

const path = require('node:path');
const Log = require('./Logger.js');

class ConfigLoader {
  /**
   * Load environment variables from .env file if it exists
   */
  static loadEnv () {
    try {
      const dotenv = require('dotenv');
      const envPath = path.join(__dirname, '../..', '.env');
      const fs = require('node:fs');

      Log.info(`Looking for .env file at: ${envPath}`);

      // Check if file exists
      if (fs.existsSync(envPath)) {
        Log.info('.env file found, loading...');
        const result = dotenv.config({path: envPath});

        if (result.error) {
          Log.error(`Error loading .env file: ${result.error.message}`);
        } else {
          Log.info('Successfully loaded configuration from .env file');
          // Log which variables were loaded (without exposing values)
          const loadedVars = Object.keys(result.parsed || {}).join(', ');
          if (loadedVars) {
            Log.info(`Loaded variables: ${loadedVars}`);
          }
        }
      } else {
        Log.info('.env file not found, using config.js values only');
      }
    } catch (error) {
      Log.error(`Error in loadEnv: ${error.message}`);
    }
  }

  /**
   * Merge environment variables with config
   * Environment variables take precedence over config values
   */
  static mergeEnvWithConfig (config) {
    const merged = {...config};

    // Synology connection settings
    if (process.env.SYNOLOGY_URL) {
      merged.synologyUrl = process.env.SYNOLOGY_URL;
    }

    if (process.env.SYNOLOGY_ACCOUNT) {
      merged.synologyAccount = process.env.SYNOLOGY_ACCOUNT;
    }

    if (process.env.SYNOLOGY_PASSWORD) {
      merged.synologyPassword = process.env.SYNOLOGY_PASSWORD;
    }

    if (process.env.SYNOLOGY_ALBUM_NAME) {
      merged.synologyAlbumName = process.env.SYNOLOGY_ALBUM_NAME;
    }

    if (process.env.SYNOLOGY_SHARE_TOKEN) {
      merged.synologyShareToken = process.env.SYNOLOGY_SHARE_TOKEN;
    }

    // Tag names (comma-separated)
    if (process.env.SYNOLOGY_TAG_NAMES) {
      merged.synologyTagNames = process.env.SYNOLOGY_TAG_NAMES.split(',').map((tag) => tag.trim());
    }

    // Numeric settings
    if (process.env.SYNOLOGY_MAX_PHOTOS) {
      merged.synologyMaxPhotos = Number.parseInt(process.env.SYNOLOGY_MAX_PHOTOS, 10);
    }

    if (process.env.SLIDESHOW_SPEED) {
      merged.slideshowSpeed = Number.parseInt(process.env.SLIDESHOW_SPEED, 10);
    }

    if (process.env.REFRESH_IMAGE_LIST_INTERVAL) {
      merged.refreshImageListInterval = Number.parseInt(process.env.REFRESH_IMAGE_LIST_INTERVAL, 10);
    }

    // Cache settings
    if (typeof process.env.ENABLE_IMAGE_CACHE !== 'undefined') {
      merged.enableImageCache = process.env.ENABLE_IMAGE_CACHE === 'true';
    }

    if (process.env.IMAGE_CACHE_MAX_SIZE) {
      merged.imageCacheMaxSize = Number.parseInt(process.env.IMAGE_CACHE_MAX_SIZE, 10);
    }

    if (process.env.IMAGE_CACHE_PRELOAD_COUNT) {
      merged.imageCachePreloadCount = Number.parseInt(process.env.IMAGE_CACHE_PRELOAD_COUNT, 10);
    }

    if (process.env.IMAGE_CACHE_PRELOAD_DELAY) {
      merged.imageCachePreloadDelay = Number.parseInt(process.env.IMAGE_CACHE_PRELOAD_DELAY, 10);
    }

    // Memory monitoring
    if (typeof process.env.ENABLE_MEMORY_MONITOR !== 'undefined') {
      merged.enableMemoryMonitor = process.env.ENABLE_MEMORY_MONITOR === 'true';
    }

    if (process.env.MEMORY_MONITOR_INTERVAL) {
      merged.memoryMonitorInterval = Number.parseInt(process.env.MEMORY_MONITOR_INTERVAL, 10);
    }

    if (process.env.MEMORY_THRESHOLD) {
      merged.memoryThreshold = parseFloat(process.env.MEMORY_THRESHOLD);
    }

    // Boolean settings
    if (typeof process.env.RANDOMIZE_IMAGE_ORDER !== 'undefined') {
      merged.randomizeImageOrder = process.env.RANDOMIZE_IMAGE_ORDER === 'true';
    }

    if (typeof process.env.SHOW_ALL_IMAGES_BEFORE_RESTART !== 'undefined') {
      merged.showAllImagesBeforeRestart = process.env.SHOW_ALL_IMAGES_BEFORE_RESTART === 'true';
    }

    if (typeof process.env.RESIZE_IMAGES !== 'undefined') {
      merged.resizeImages = process.env.RESIZE_IMAGES === 'true';
    }

    if (process.env.MAX_WIDTH) {
      merged.maxWidth = Number.parseInt(process.env.MAX_WIDTH, 10);
    }

    if (process.env.MAX_HEIGHT) {
      merged.maxHeight = Number.parseInt(process.env.MAX_HEIGHT, 10);
    }

    return merged;
  }

  /**
   * Initialize and merge configuration
   */
  static initialize (config) {
    Log.info('Initializing configuration...');
    Log.info(`Config received from config.js: ${JSON.stringify(Object.keys(config))}`);

    // Load .env file if it exists
    this.loadEnv();

    // Merge environment variables with config
    const mergedConfig = this.mergeEnvWithConfig(config);

    // Log which values are coming from environment (without exposing credentials)
    const envOverrides = [];
    if (process.env.SYNOLOGY_URL) {
      envOverrides.push('SYNOLOGY_URL');
    }

    if (process.env.SYNOLOGY_ACCOUNT) {
      envOverrides.push('SYNOLOGY_ACCOUNT');
    }

    if (process.env.SYNOLOGY_PASSWORD) {
      envOverrides.push('SYNOLOGY_PASSWORD');
    }

    if (process.env.SYNOLOGY_SHARE_TOKEN) {
      envOverrides.push('SYNOLOGY_SHARE_TOKEN');
    }

    if (envOverrides.length > 0) {
      Log.info(`Using environment variables: ${envOverrides.join(', ')}`);
    }

    // Log final config keys (not values)
    Log.info(`Final merged config keys: ${JSON.stringify(Object.keys(mergedConfig))}`);

    // Perform comprehensive validation
    this.validateConfig(mergedConfig);

    return mergedConfig;
  }

  /**
   * Validate the final merged configuration
   */
  static validateConfig (config) {
    let hasErrors = false;

    // Check required: synologyUrl
    if (!config.synologyUrl) {
      Log.error('ERROR: synologyUrl is required!');
      Log.error('  Set it in config.js or SYNOLOGY_URL in .env');
      hasErrors = true;
    }

    // Check authentication
    const hasCredentials = config.synologyAccount && config.synologyPassword;
    const hasShareToken = config.synologyShareToken;

    if (!hasCredentials && !hasShareToken) {
      Log.error('ERROR: Authentication is required!');
      Log.error('  Option 1: Set synologyAccount + synologyPassword in config.js');
      Log.error('            OR SYNOLOGY_ACCOUNT + SYNOLOGY_PASSWORD in .env');
      Log.error('  Option 2: Set synologyShareToken in config.js');
      Log.error('            OR SYNOLOGY_SHARE_TOKEN in .env');
      hasErrors = true;
    }

    // Warn about common issues
    if (config.synologyUrl && !config.synologyUrl.startsWith('http')) {
      Log.warn('WARNING: synologyUrl should start with http:// or https://');
      Log.warn(`  Current value: ${config.synologyUrl}`);
    }

    // Log configuration summary
    if (!hasErrors) {
      Log.info('Configuration validated successfully');
      Log.info(`  URL: ${config.synologyUrl}`);
      Log.info(`  Auth: ${hasShareToken
        ? 'Share Token'
        : 'Account Credentials'}`);
      if (config.synologyAlbumName) {
        Log.info(`  Album: ${config.synologyAlbumName}`);
      }
      if (config.synologyTagNames && config.synologyTagNames.length > 0) {
        Log.info(`  Tags: ${config.synologyTagNames.join(', ')}`);
      }
    } else {
      Log.error('Configuration validation FAILED - module will not work correctly!');
    }

    return !hasErrors;
  }
}

module.exports = ConfigLoader;
