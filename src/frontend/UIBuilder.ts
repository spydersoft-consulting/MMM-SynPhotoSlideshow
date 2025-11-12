/**
 * UIBuilder.ts
 *
 * Handles UI element creation (gradients, info divs, progress bars)
 */

import type { ImageInfo, ModuleConfig } from '../types';

// Declare global Log for MagicMirror
declare const Log: {
  warn: (message: string) => void;
};

class UIBuilder {
  private readonly config: ModuleConfig;

  constructor(config: ModuleConfig) {
    this.config = config;
  }

  /**
   * Create gradient div
   */
  createGradientDiv(
    direction: string,
    gradient: string[],
    wrapper: HTMLElement
  ): void {
    const div = document.createElement('div');
    div.style.backgroundImage = `linear-gradient( to ${direction}, ${gradient.join()})`;
    div.className = 'gradient';
    wrapper.appendChild(div);
  }

  /**
   * Create radial gradient div
   */
  createRadialGradientDiv(
    type: string,
    gradient: string[],
    wrapper: HTMLElement
  ): void {
    const div = document.createElement('div');
    div.style.backgroundImage = `radial-gradient( ${type}, ${gradient.join()})`;
    div.className = 'gradient';
    wrapper.appendChild(div);
  }

  /**
   * Create image info div
   */
  createImageInfoDiv(wrapper: HTMLElement): HTMLDivElement {
    const div = document.createElement('div');
    div.className = `info ${this.config.imageInfoLocation}`;
    wrapper.appendChild(div);
    return div;
  }

  /**
   * Create progress bar div
   */
  createProgressbarDiv(wrapper: HTMLElement, slideshowSpeed: number): void {
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
  restartProgressBar(): void {
    const oldDiv = document.querySelector('.progress-inner') as HTMLElement;
    if (!oldDiv) return;

    const newDiv = oldDiv.cloneNode(true) as HTMLElement;
    oldDiv.parentNode?.replaceChild(newDiv, oldDiv);
    newDiv.style.display = '';
  }

  /**
   * Update image info display
   */
  updateImageInfo(
    imageInfoDiv: HTMLDivElement,
    imageinfo: ImageInfo,
    imageDate: string,
    translate: (key: string) => string
  ): void {
    const imageInfoArray = Array.isArray(this.config.imageInfo)
      ? this.config.imageInfo
      : [this.config.imageInfo];

    const imageProps = this.collectImageProperties(
      imageInfoArray,
      imageinfo,
      imageDate
    );
    const innerHTML = this.buildImageInfoHtml(imageProps, translate);

    imageInfoDiv.innerHTML = innerHTML;
  }

  /**
   * Collect image properties based on configuration
   */
  private collectImageProperties(
    infoArray: string[],
    imageinfo: ImageInfo,
    imageDate: string
  ): string[] {
    const props: string[] = [];

    for (const prop of infoArray) {
      const value = this.getImageProperty(prop, imageinfo, imageDate);
      if (value) {
        props.push(value);
      }
    }

    return props;
  }

  /**
   * Get a single image property value
   */
  private getImageProperty(
    prop: string,
    imageinfo: ImageInfo,
    imageDate: string
  ): string | null {
    switch (prop) {
      case 'date':
        return this.getDateProperty(imageDate);

      case 'name':
        return this.getNameProperty(imageinfo.path);

      case 'imagecount':
        return `${imageinfo.index} of ${imageinfo.total}`;

      default:
        Log.warn(
          `[MMM-SynPhotoSlideshow] ${prop} is not a valid value for imageInfo. Please check your configuration`
        );
        return null;
    }
  }

  /**
   * Get formatted date property
   */
  private getDateProperty(imageDate: string): string | null {
    if (imageDate && imageDate !== 'Invalid date') {
      return imageDate;
    }
    return null;
  }

  /**
   * Get formatted name property
   */
  private getNameProperty(imagePath: string): string {
    // Only display last path component as image name
    let imageName = imagePath.split('/').pop() || '';

    // Remove file extension from image name if configured
    if (this.config.imageInfoNoFileExt) {
      const dotIndex = imageName.lastIndexOf('.');
      if (dotIndex > 0) {
        imageName = imageName.substring(0, dotIndex);
      }
    }

    return imageName;
  }

  /**
   * Build HTML string for image info display
   */
  private buildImageInfoHtml(
    imageProps: string[],
    translate: (key: string) => string
  ): string {
    let html = `<header class="infoDivHeader">${translate('PICTURE_INFO')}</header>`;

    for (const val of imageProps) {
      html += `${val}<br/>`;
    }

    return html;
  }
}

export default UIBuilder;
