/**
 * ImageProcessor.js
 *
 * Handles image reading, resizing, and processing
 */

const FileSystem = require('node:fs');
const sharp = require('sharp');
const Log = require('../../../js/logger.js');

class ImageProcessor {
  constructor (config, imageCache = null) {
    this.config = config;
    this.imageCache = imageCache;
  }

  /**
   * Resize image using sharp
   */
  resizeImage (inputPath, callback) {
    Log.log(`[MMM-SynPhotoSlideshow] Resizing image to max: ${this.config.maxWidth}x${this.config.maxHeight}`);

    const transformer = sharp()
      .rotate()
      .resize({
        width: parseInt(this.config.maxWidth, 10),
        height: parseInt(this.config.maxHeight, 10),
        fit: 'inside',
      })
      .keepMetadata()
      .jpeg({quality: 80});

    const outputStream = [];

    FileSystem.createReadStream(inputPath)
      .pipe(transformer)
      .on('data', (chunk) => {
        outputStream.push(chunk);
      })
      .on('end', () => {
        const buffer = Buffer.concat(outputStream);
        callback(`data:image/jpg;base64,${buffer.toString('base64')}`);
        Log.log('[MMM-SynPhotoSlideshow] Resizing complete');
      })
      .on('error', (err) => {
        Log.error('[MMM-SynPhotoSlideshow] Error resizing image:', err);
        callback(null);
      });
  }

  /**
   * Read file without resizing
   */
  readFileRaw (filepath, callback) {
    const ext = filepath.split('.').pop();
    const chunks = [];

    FileSystem.createReadStream(filepath)
      .on('data', (chunk) => {
        chunks.push(chunk);
      })
      .on('end', () => {
        const buffer = Buffer.concat(chunks);
        callback(`data:image/${ext};base64,${buffer.toString('base64')}`);
      })
      .on('error', (err) => {
        Log.error('[MMM-SynPhotoSlideshow] Error reading file:', err);
        callback(null);
      })
      .on('close', () => {
        Log.log('[MMM-SynPhotoSlideshow] Stream closed');
      });
  }

  /**
   * Download and process Synology image
   */
  async downloadSynologyImage (imageUrl, synologyClient, callback) {
    try {
      // Check cache first if enabled
      if (this.imageCache && this.config.enableImageCache) {
        const cached = await this.imageCache.get(imageUrl);

        if (cached) {
          Log.info('[MMM-SynPhotoSlideshow] Serving image from cache');
          callback(cached);
          return;
        }
      }

      Log.info('[MMM-SynPhotoSlideshow] Downloading Synology image...');
      const imageBuffer = await synologyClient.downloadPhoto(imageUrl);

      if (imageBuffer) {
        const base64 = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        Log.info(`[MMM-SynPhotoSlideshow] Downloaded Synology image: ${imageBuffer.length} bytes`);

        // Cache the image if caching is enabled
        if (this.imageCache && this.config.enableImageCache) {
          await this.imageCache.set(imageUrl, dataUrl);
        }

        callback(dataUrl);
      } else {
        Log.error('[MMM-SynPhotoSlideshow] Failed to download Synology image');
        callback(null);
      }
    } catch (error) {
      Log.error(`[MMM-SynPhotoSlideshow] Error downloading Synology image: ${error.message}`);
      callback(null);
    }
  }

  /**
   * Read and process image file
   */
  async readFile (filepath, callback, imageUrl = null, synologyClient = null) {
    // Handle Synology images
    if (imageUrl && synologyClient) {
      await this.downloadSynologyImage(imageUrl, synologyClient, callback);
      return;
    }

    // Handle local files
    if (this.config.resizeImages) {
      this.resizeImage(filepath, callback);
    } else {
      Log.log('[MMM-SynPhotoSlideshow] Reading image without resizing');
      this.readFileRaw(filepath, callback);
    }
  }
}

module.exports = ImageProcessor;
