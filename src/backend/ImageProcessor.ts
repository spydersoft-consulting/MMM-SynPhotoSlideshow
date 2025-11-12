/**
 * ImageProcessor.ts
 *
 * Handles image reading, resizing, and processing
 */

import sharp from 'sharp';
import fsPromises from 'node:fs/promises';
import Log from './Logger';
import type { ModuleConfig } from '../types';
import type ImageCache from './ImageCache';

interface SynologyClient {
  downloadPhoto: (url: string) => Promise<Buffer | null>;
}

class ImageProcessor {
  private readonly config: Partial<ModuleConfig>;

  private readonly imageCache: ImageCache | null;

  constructor(
    config: Partial<ModuleConfig>,
    imageCache: ImageCache | null = null
  ) {
    this.config = config;
    this.imageCache = imageCache;
  }

  /**
   * Resize image using sharp
   */
  private async resizeImage(
    inputPath: string,
    callback: (data: string | null) => void
  ): Promise<void> {
    Log.log(
      `Resizing image to max: ${this.config.maxWidth}x${this.config.maxHeight}`
    );

    try {
      const buffer = await sharp(inputPath)
        .rotate()
        .resize({
          width: Number.parseInt(String(this.config.maxWidth), 10),
          height: Number.parseInt(String(this.config.maxHeight), 10),
          fit: 'inside'
        })
        .jpeg({
          quality: 80,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();

      callback(`data:image/jpg;base64,${buffer.toString('base64')}`);
      Log.log('Resizing complete');
    } catch (err) {
      Log.error('Error resizing image:', err);
      callback(null);
    }
  }

  /**
   * Read file without resizing
   */
  private async readFileRaw(
    filepath: string,
    callback: (data: string | null) => void
  ): Promise<void> {
    const ext = filepath.split('.').pop();

    try {
      const buffer = await fsPromises.readFile(filepath);
      callback(`data:image/${ext};base64,${buffer.toString('base64')}`);
      Log.log('File read complete');
    } catch (err) {
      Log.error('Error reading file:', err);
      callback(null);
    }
  }

  /**
   * Download and process Synology image
   */
  private async downloadSynologyImage(
    imageUrl: string,
    synologyClient: SynologyClient,
    callback: (data: string | null) => void
  ): Promise<void> {
    try {
      if (this.imageCache && this.config.enableImageCache) {
        const cached = await this.imageCache.get(imageUrl);

        if (cached) {
          Log.info('Serving image from cache');
          callback(cached);
          return;
        }
      }

      Log.info('Downloading Synology image...');
      const imageBuffer = await synologyClient.downloadPhoto(imageUrl);

      if (imageBuffer) {
        const base64 = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        Log.info(`Downloaded Synology image: ${imageBuffer.length} bytes`);

        if (this.imageCache && this.config.enableImageCache) {
          await this.imageCache.set(imageUrl, dataUrl);
        }

        callback(dataUrl);
      } else {
        Log.error('Failed to download Synology image');
        callback(null);
      }
    } catch (error) {
      Log.error(
        `Error downloading Synology image: ${(error as Error).message}`
      );
      callback(null);
    }
  }

  /**
   * Read and process image file
   */
  async readFile(
    filepath: string,
    callback: (data: string | null) => void,
    imageUrl: string | null = null,
    synologyClient: SynologyClient | null = null
  ): Promise<void> {
    if (imageUrl && synologyClient) {
      await this.downloadSynologyImage(imageUrl, synologyClient, callback);
      return;
    }

    if (this.config.resizeImages) {
      await this.resizeImage(filepath, callback);
    } else {
      Log.log('Reading image without resizing');
      await this.readFileRaw(filepath, callback);
    }
  }
}

export default ImageProcessor;
