/**
 * UIBuilder.js
 *
 * Handles UI element creation (gradients, info divs, progress bars)
 */

class UIBuilder {
  constructor (config) {
    this.config = config;
  }

  /**
   * Create gradient div
   */
  createGradientDiv (direction, gradient, wrapper) {
    const div = document.createElement('div');
    div.style.backgroundImage = `linear-gradient( to ${direction}, ${gradient.join()})`;
    div.className = 'gradient';
    wrapper.appendChild(div);
  }

  /**
   * Create radial gradient div
   */
  createRadialGradientDiv (type, gradient, wrapper) {
    const div = document.createElement('div');
    div.style.backgroundImage = `radial-gradient( ${type}, ${gradient.join()})`;
    div.className = 'gradient';
    wrapper.appendChild(div);
  }

  /**
   * Create image info div
   */
  createImageInfoDiv (wrapper) {
    const div = document.createElement('div');
    div.className = `info ${this.config.imageInfoLocation}`;
    wrapper.appendChild(div);
    return div;
  }

  /**
   * Create progress bar div
   */
  createProgressbarDiv (wrapper, slideshowSpeed) {
    const div = document.createElement('div');
    div.className = 'progress';
    const inner = document.createElement('div');
    inner.className = 'progress-inner';
    inner.style.display = 'none';
    inner.style.animation = `move ${slideshowSpeed}ms linear`;
    div.appendChild(inner);
    wrapper.appendChild(div);
  }

  /**
   * Restart progress bar animation
   */
  restartProgressBar () {
    const oldDiv = document.querySelector('.progress-inner');
    if (!oldDiv) return;

    const newDiv = oldDiv.cloneNode(true);
    oldDiv.parentNode.replaceChild(newDiv, oldDiv);
    newDiv.style.display = '';
  }

  /**
   * Update image info display
   */
  updateImageInfo (imageInfoDiv, imageinfo, imageDate, translate) {
    const imageProps = [];

    this.config.imageInfo.forEach((prop) => {
      switch (prop) {
        case 'date':
          if (imageDate && imageDate !== 'Invalid date') {
            imageProps.push(imageDate);
          }
          break;

        case 'name':
          // Only display last path component as image name
          let imageName = imageinfo.path.split('/').pop();

          // Remove file extension from image name
          if (this.config.imageInfoNoFileExt) {
            const dotIndex = imageName.lastIndexOf('.');
            if (dotIndex > 0) {
              imageName = imageName.substring(0, dotIndex);
            }
          }
          imageProps.push(imageName);
          break;

        case 'imagecount':
          imageProps.push(`${imageinfo.index} of ${imageinfo.total}`);
          break;

        default:
          Log.warn(`[MMM-SynPhotoSlideshow] ${prop} is not a valid value for imageInfo. Please check your configuration`);
      }
    });

    let innerHTML = `<header class="infoDivHeader">${translate('PICTURE_INFO')}</header>`;
    imageProps.forEach((val) => {
      innerHTML += `${val}<br/>`;
    });

    imageInfoDiv.innerHTML = innerHTML;
  }
}

// Export for Node.js (if needed) or use directly in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIBuilder;
}
