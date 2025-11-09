/**
 * SynologyManager.js
 *
 * Manages Synology Photos integration
 */

const Log = require('./Logger.js');
const SynologyPhotosClient = require('./SynologyPhotosClient.js');

class SynologyManager {
  constructor () {
    this.client = null;
    this.photos = [];
  }

  /**
   * Fetch photos from Synology Photos
   */
  async fetchPhotos (config) {
    try {
      Log.info('Initializing Synology Photos client...');

      this.client = new SynologyPhotosClient(config);

      // Authenticate (if not using shared album)
      const authenticated = await this.client.authenticate();
      if (!authenticated && !config.synologyShareToken) {
        Log.error('Failed to authenticate with Synology');
        return [];
      }

      // Find tags if specified
      if (config.synologyTagNames && config.synologyTagNames.length > 0) {
        const tagsFound = await this.client.findTags();
        if (!tagsFound) {
          Log.error('Failed to find Synology tags');
          return [];
        }
      }

      // Find album if specified (only for personal accounts without tags)
      if (config.synologyAlbumName &&
        !config.synologyShareToken &&
        (!config.synologyTagNames || config.synologyTagNames.length === 0)) {
        const albumFound = await this.client.findAlbum();
        if (!albumFound) {
          Log.error('Failed to find Synology album');
          return [];
        }
      }

      // Fetch photos
      const photos = await this.client.fetchPhotos();

      if (photos && photos.length > 0) {
        Log.info(`Retrieved ${photos.length} photos from Synology`);
        this.photos = photos;
        return photos;
      }
      Log.warn('No photos found in Synology');
      return [];
    } catch (error) {
      Log.error(`Error fetching Synology photos: ${error.message}`);
      return [];
    }
  }

  /**
   * Get the Synology client instance
   */
  getClient () {
    return this.client;
  }

  /**
   * Get cached photos
   */
  getPhotos () {
    return this.photos;
  }

  /**
   * Check if using Synology
   */
  isInitialized () {
    return this.client !== null;
  }
}

module.exports = SynologyManager;
