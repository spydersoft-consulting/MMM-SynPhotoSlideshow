/**
 * ConfigLoader.ts
 *
 * Loads configuration from environment variables or config file
 */

import path from 'node:path';
import fs from 'node:fs';
import Log from './Logger';
import type { ModuleConfig } from '../types';

class ConfigLoader {
	/**
	 * Load environment variables from .env file if it exists
	 */
	static loadEnv(): void {
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const dotenv = require('dotenv');
			const envPath = path.join(__dirname, '../..', '.env');

			Log.info(`Looking for .env file at: ${envPath}`);

			// Check if file exists
			if (fs.existsSync(envPath)) {
				Log.info('.env file found, loading...');
				const result = dotenv.config({ path: envPath });

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
			Log.error(`Error in loadEnv: ${(error as Error).message}`);
		}
	}

	/**
	 * Helper: Set string value from environment variable
	 */
	private static setStringFromEnv(merged: Partial<ModuleConfig>, envKey: string, configKey: keyof ModuleConfig): void {
		if (process.env[envKey]) {
			// @ts-expect-error - Dynamic property assignment
			merged[configKey] = process.env[envKey];
		}
	}

	/**
	 * Helper: Set integer value from environment variable
	 */
	private static setIntFromEnv(merged: Partial<ModuleConfig>, envKey: string, configKey: keyof ModuleConfig): void {
		if (process.env[envKey]) {
			// @ts-expect-error - Dynamic property assignment
			merged[configKey] = Number.parseInt(process.env[envKey], 10);
		}
	}

	/**
	 * Helper: Set float value from environment variable
	 */
	private static setFloatFromEnv(merged: Partial<ModuleConfig>, envKey: string, configKey: keyof ModuleConfig): void {
		if (process.env[envKey]) {
			// @ts-expect-error - Dynamic property assignment
			merged[configKey] = Number.parseFloat(process.env[envKey]);
		}
	}

	/**
	 * Helper: Set boolean value from environment variable
	 */
	private static setBoolFromEnv(merged: Partial<ModuleConfig>, envKey: string, configKey: keyof ModuleConfig): void {
		if (process.env[envKey] !== undefined) {
			// @ts-expect-error - Dynamic property assignment
			merged[configKey] = process.env[envKey] === 'true';
		}
	}

	/**
	 * Merge environment variables with config
	 * Environment variables take precedence over config values
	 */
	static mergeEnvWithConfig(config: Partial<ModuleConfig>): ModuleConfig {
		const merged = { ...config };

		// Synology connection settings
		this.setStringFromEnv(merged, 'SYNOLOGY_URL', 'synologyUrl');
		this.setStringFromEnv(merged, 'SYNOLOGY_ACCOUNT', 'synologyAccount');
		this.setStringFromEnv(merged, 'SYNOLOGY_PASSWORD', 'synologyPassword');
		this.setStringFromEnv(merged, 'SYNOLOGY_ALBUM_NAME', 'synologyAlbumName');
		this.setStringFromEnv(merged, 'SYNOLOGY_SHARE_TOKEN', 'synologyShareToken');

		// Tag names (comma-separated)
		if (process.env.SYNOLOGY_TAG_NAMES) {
			merged.synologyTagNames = process.env.SYNOLOGY_TAG_NAMES.split(',').map((tag) => tag.trim());
		}

		// Numeric settings
		this.setIntFromEnv(merged, 'SYNOLOGY_MAX_PHOTOS', 'synologyMaxPhotos');
		this.setIntFromEnv(merged, 'SLIDESHOW_SPEED', 'slideshowSpeed');
		this.setIntFromEnv(merged, 'REFRESH_IMAGE_LIST_INTERVAL', 'refreshImageListInterval');

		// Cache settings
		this.setBoolFromEnv(merged, 'ENABLE_IMAGE_CACHE', 'enableImageCache');
		this.setIntFromEnv(merged, 'IMAGE_CACHE_MAX_SIZE', 'imageCacheMaxSize');
		this.setIntFromEnv(merged, 'IMAGE_CACHE_PRELOAD_COUNT', 'imageCachePreloadCount');
		this.setIntFromEnv(merged, 'IMAGE_CACHE_PRELOAD_DELAY', 'imageCachePreloadDelay');

		// Memory monitoring
		this.setBoolFromEnv(merged, 'ENABLE_MEMORY_MONITOR', 'enableMemoryMonitor');
		this.setIntFromEnv(merged, 'MEMORY_MONITOR_INTERVAL', 'memoryMonitorInterval');
		this.setFloatFromEnv(merged, 'MEMORY_THRESHOLD', 'memoryThreshold');

		// Boolean settings
		this.setBoolFromEnv(merged, 'RANDOMIZE_IMAGE_ORDER', 'randomizeImageOrder');
		this.setBoolFromEnv(merged, 'SHOW_ALL_IMAGES_BEFORE_RESTART', 'showAllImagesBeforeRestart');
		this.setBoolFromEnv(merged, 'RESIZE_IMAGES', 'resizeImages');

		// Dimension settings
		this.setIntFromEnv(merged, 'MAX_WIDTH', 'maxWidth');
		this.setIntFromEnv(merged, 'MAX_HEIGHT', 'maxHeight');

		return merged as ModuleConfig;
	}

	/**
	 * Initialize and merge configuration
	 */
	static initialize(config: Partial<ModuleConfig>): ModuleConfig {
		Log.info('Initializing configuration...');
		Log.info(`Config received from config.js: ${JSON.stringify(Object.keys(config))}`);

		// Load .env file if it exists
		this.loadEnv();

		// Merge environment variables with config
		const mergedConfig = this.mergeEnvWithConfig(config);

		// Log which values are coming from environment (without exposing credentials)
		const envOverrides: string[] = [];
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
	static validateConfig(config: ModuleConfig): boolean {
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
		if (hasErrors) {
			Log.error('Configuration validation FAILED - module will not work correctly!');
		} else {
			Log.info('Configuration validated successfully');
			Log.info(`  URL: ${config.synologyUrl}`);
			Log.info(`  Auth: ${hasShareToken ? 'Share Token' : 'Account Credentials'}`);
			if (config.synologyAlbumName) {
				Log.info(`  Album: ${config.synologyAlbumName}`);
			}
			if (config.synologyTagNames && config.synologyTagNames.length > 0) {
				Log.info(`  Tags: ${config.synologyTagNames.join(', ')}`);
			}
		}

		return !hasErrors;
	}
}

export default ConfigLoader;
