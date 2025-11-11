/**
 * ImageHandler.ts
 *
 * Handles image display logic, sizing, and orientation
 */

import type { ModuleConfig } from '../types';

// Declare global EXIF library (loaded by MagicMirror)
declare const EXIF: {
	getData: (image: HTMLImageElement, callback: () => void) => void;
	getTag: (image: HTMLImageElement, tag: string) => number;
};

class ImageHandler {
	private config: ModuleConfig;

	private browserSupportsExifOrientationNatively: boolean;

	constructor(config: ModuleConfig) {
		this.config = config;
		this.browserSupportsExifOrientationNatively = CSS.supports('image-orientation: from-image');
	}

	/**
	 * Create a new image div with default styling
	 */
	createImageDiv(): HTMLDivElement {
		const div = document.createElement('div');
		div.style.backgroundSize = this.config.backgroundSize;
		div.style.backgroundPosition = this.config.backgroundPosition;
		div.className = 'image';
		return div;
	}

	/**
	 * Apply portrait or landscape mode classes based on image dimensions
	 * Returns true if fit mode was applied
	 */
	applyFitMode(imageDiv: HTMLDivElement, image: HTMLImageElement): boolean {
		if (!this.config.fitPortraitImages) {
			return false;
		}

		const isPortrait = image.height > image.width;
		const screenAspectRatio = window.innerWidth / window.innerHeight;

		// If it's a portrait image on a landscape screen, use contain to avoid cropping
		if (isPortrait && screenAspectRatio > 1) {
			imageDiv.classList.add('portrait-mode');
			console.debug(`[MMM-SynPhotoSlideshow] Portrait image detected (${image.width}x${image.height}), using contain mode`);
			return true;
		}

		// For all other cases (landscape images or portrait screen), use cover to fill screen
		return false;
	}

	/**
	 * Apply background animations if enabled
	 */
	applyAnimation(imageDiv: HTMLDivElement, image: HTMLImageElement): void {
		if (!this.config.backgroundAnimationEnabled || !this.config.animations.length) {
			return;
		}

		const randomNumber = Math.floor(Math.random() * this.config.animations.length);
		const animation = this.config.animations[randomNumber];
		imageDiv.style.animationDuration = this.config.backgroundAnimationDuration;
		imageDiv.style.animationDelay = this.config.transitionSpeed;

		if (animation === 'slide') {
			this.applySlideAnimation(imageDiv, image);
		} else {
			imageDiv.className += ` ${animation}`;
		}
	}

	/**
	 * Apply slide animation
	 */
	private applySlideAnimation(imageDiv: HTMLDivElement, image: HTMLImageElement): void {
		const { width, height } = image;
		const adjustedWidth = (width * window.innerHeight) / height;
		const adjustedHeight = (height * window.innerWidth) / width;

		imageDiv.style.backgroundPosition = '';
		imageDiv.style.animationIterationCount = this.config.backgroundAnimationLoopCount;
		imageDiv.style.backgroundSize = 'cover';

		if (adjustedWidth / window.innerWidth > adjustedHeight / window.innerHeight) {
			// Scrolling horizontally...
			const slideClass = Math.floor(Math.random() * 2) ? ' slideH' : ' slideHInv';
			imageDiv.className += slideClass;
		} else {
			// Scrolling vertically...
			const slideClass = Math.floor(Math.random() * 2) ? ' slideV' : ' slideVInv';
			imageDiv.className += slideClass;
		}
	}

	/**
	 * Get CSS transform for EXIF orientation
	 */
	getImageTransformCss(exifOrientation: number): string {
		switch (exifOrientation) {
			case 2:
				return 'scaleX(-1)';
			case 3:
				return 'scaleX(-1) scaleY(-1)';
			case 4:
				return 'scaleY(-1)';
			case 5:
				return 'scaleX(-1) rotate(90deg)';
			case 6:
				return 'rotate(90deg)';
			case 7:
				return 'scaleX(-1) rotate(-90deg)';
			case 8:
				return 'rotate(-90deg)';
			case 1: // Falls through.
			default:
				return 'rotate(0deg)';
		}
	}

	/**
	 * Apply EXIF orientation transform if browser doesn't support it natively
	 */
	applyExifOrientation(imageDiv: HTMLDivElement, image: HTMLImageElement): void {
		if (this.browserSupportsExifOrientationNatively) {
			return;
		}

		EXIF.getData(image, () => {
			const exifOrientation = EXIF.getTag(image, 'Orientation');
			imageDiv.style.transform = this.getImageTransformCss(exifOrientation);
		});
	}
}

export default ImageHandler;
