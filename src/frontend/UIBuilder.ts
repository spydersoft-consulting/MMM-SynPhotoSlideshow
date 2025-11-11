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
	private config: ModuleConfig;

	constructor(config: ModuleConfig) {
		this.config = config;
	}

	/**
	 * Create gradient div
	 */
	createGradientDiv(direction: string, gradient: string[], wrapper: HTMLElement): void {
		const div = document.createElement('div');
		div.style.backgroundImage = `linear-gradient( to ${direction}, ${gradient.join()})`;
		div.className = 'gradient';
		wrapper.appendChild(div);
	}

	/**
	 * Create radial gradient div
	 */
	createRadialGradientDiv(type: string, gradient: string[], wrapper: HTMLElement): void {
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
		const imageProps: string[] = [];

		const imageInfoArray = Array.isArray(this.config.imageInfo) ? this.config.imageInfo : [this.config.imageInfo];

		for (const prop of imageInfoArray) {
			switch (prop) {
				case 'date':
					if (imageDate && imageDate !== 'Invalid date') {
						imageProps.push(imageDate);
					}
					break;

				case 'name': {
					// Only display last path component as image name
					let imageName = imageinfo.path.split('/').pop() || '';

					// Remove file extension from image name
					if (this.config.imageInfoNoFileExt) {
						const dotIndex = imageName.lastIndexOf('.');
						if (dotIndex > 0) {
							imageName = imageName.substring(0, dotIndex);
						}
					}
					imageProps.push(imageName);
					break;
				}

				case 'imagecount':
					imageProps.push(`${imageinfo.index} of ${imageinfo.total}`);
					break;

				default:
					Log.warn(`[MMM-SynPhotoSlideshow] ${prop} is not a valid value for imageInfo. Please check your configuration`);
			}
		}

		let innerHTML = `<header class="infoDivHeader">${translate('PICTURE_INFO')}</header>`;
		for (const val of imageProps) {
			innerHTML += `${val}<br/>`;
		}

		imageInfoDiv.innerHTML = innerHTML;
	}
}

export default UIBuilder;
