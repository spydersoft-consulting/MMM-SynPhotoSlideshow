/**
 * SynologyManager.ts
 *
 * Manages Synology Photos integration
 */

import Log from './Logger';
import SynologyPhotosClient from './SynologyPhotosClient';
import type { ModuleConfig, PhotoItem } from '../types';

class SynologyManager {
  private client: SynologyPhotosClient | null = null;

  private photos: PhotoItem[] = [];

  /**
   * Fetch photos from Synology Photos
   */
  async fetchPhotos(config: ModuleConfig): Promise<PhotoItem[]> {
    try {
      Log.info('Initializing Synology Photos client...');

      this.client = new SynologyPhotosClient(config);

      const authenticated = await this.client.authenticate();
      if (!authenticated && !config.synologyShareToken) {
        Log.error('Failed to authenticate with Synology');
        return [];
      }

      if (config.synologyTagNames && config.synologyTagNames.length > 0) {
        const tagsFound = await this.client.findTags();
        if (!tagsFound) {
          Log.error('Failed to find Synology tags');
          return [];
        }
      }

      if (
        config.synologyAlbumName &&
        !config.synologyShareToken &&
        (!config.synologyTagNames || config.synologyTagNames.length === 0)
      ) {
        const albumFound = await this.client.findAlbum();
        if (!albumFound) {
          Log.error('Failed to find Synology album');
          return [];
        }
      }

      const photos = await this.client.fetchPhotos();

      if (photos && photos.length > 0) {
        Log.info(`Retrieved ${photos.length} photos from Synology`);
        this.photos = photos;
        return photos;
      }
      Log.warn('No photos found in Synology');
      return [];
    } catch (error) {
      Log.error(`Error fetching Synology photos: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get the Synology client instance
   */
  getClient(): SynologyPhotosClient | null {
    return this.client;
  }

  /**
   * Get cached photos
   */
  getPhotos(): PhotoItem[] {
    return this.photos;
  }

  /**
   * Check if using Synology
   */
  isInitialized(): boolean {
    return this.client !== null;
  }
}

export default SynologyManager;
