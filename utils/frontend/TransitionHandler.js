/**
 * TransitionHandler.js
 *
 * Handles image transitions and animations
 */

class TransitionHandler {
  constructor (config) {
    this.config = config;
  }

  /**
   * Create transition div with animation
   */
  createTransitionDiv () {
    const transitionDiv = document.createElement('div');
    transitionDiv.className = 'transition';

    if (this.config.transitionImages && this.config.transitions.length > 0) {
      const randomNumber = Math.floor(Math.random() * this.config.transitions.length);
      transitionDiv.style.animationDuration = this.config.transitionSpeed;
      transitionDiv.style.transition = `opacity ${this.config.transitionSpeed} ease-in-out`;
      transitionDiv.style.animationName = this.config.transitions[randomNumber];
      transitionDiv.style.animationTimingFunction = this.config.transitionTimingFunction;
    }

    return transitionDiv;
  }

  /**
   * Clean up old images from DOM (optimized to prevent memory leaks)
   */
  cleanupOldImages (imagesDiv) {
    // Keep maximum 2 transition divs to prevent memory leaks
    while (imagesDiv.childNodes.length > 2) {
      const [oldNode] = imagesDiv.childNodes;

      // Clear background image to release memory
      if (oldNode.firstChild?.style) {
        oldNode.firstChild.style.backgroundImage = '';
      }

      // Remove the node
      oldNode.remove();
    }

    // Fade out current image if present
    if (imagesDiv.childNodes.length > 0) {
      const [currentNode] = imagesDiv.childNodes;
      currentNode.style.opacity = '0';

      // Schedule cleanup of the faded-out image
      setTimeout(() => {
        if (currentNode.parentNode === imagesDiv && imagesDiv.childNodes.length > 1) {
          // Clear background image before removal
          if (currentNode.firstChild?.style) {
            currentNode.firstChild.style.backgroundImage = '';
          }
          currentNode.remove();
        }
      }, Number.parseFloat(this.config.transitionSpeed) * 1000);
    }
  }
}

// Export for Node.js (if needed) or use directly in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TransitionHandler;
}
