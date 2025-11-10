/**
 * ImageProcessor.js
 *
 * Handles image reading, resizing, and processing
 */

const sharp = require('sharp');
const Log = require('./Logger.js');

class ImageProcessor {
  constructor (config, imageCache = null) {
    this.config = config;
    this.imageCache = imageCache;
  }

  /**
   * Resize image using sharp (optimized for low memory)
   */
  async resizeImage (inputPath, callback) {
    Log.log(`Resizing image to max: ${this.config.maxWidth}x${this.config.maxHeight}`);

    try {
      // Use sharp's buffer mode which is more memory efficient
      const buffer = await sharp(inputPath)
        .rotate()
        .resize({
          width: Number.parseInt(this.config.maxWidth, 10),
          height: Number.parseInt(this.config.maxHeight, 10),
          fit: 'inside',
        })
        .jpeg({
          quality: 80,
          progressive: true, // Better for low-power devices
          mozjpeg: true // Use mozjpeg for better compression
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
   * Read file without resizing (optimized for low memory)
   */
  async readFileRaw (filepath, callback) {
    const ext = filepath.split('.').pop();

    try {
      // Use fs.promises for better memory management
      const fsPromises = require('node:fs/promises');
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
  async downloadSynologyImage (imageUrl, synologyClient, callback) {
    try {
      // Check cache first if enabled
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

        // Cache the image if caching is enabled
        if (this.imageCache && this.config.enableImageCache) {
          await this.imageCache.set(imageUrl, dataUrl);
        }

        callback(dataUrl);
      } else {
        Log.error('Failed to download Synology image');
        callback(null);
      }
    } catch (error) {
      Log.error(`Error downloading Synology image: ${error.message}`);
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

    // Handle local files (now async)
    if (this.config.resizeImages) {
      await this.resizeImage(filepath, callback);
    } else {
      Log.log('Reading image without resizing');
      await this.readFileRaw(filepath, callback);
    }
  }
}

module.exports = ImageProcessor;
