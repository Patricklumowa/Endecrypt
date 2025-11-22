/**
 * Progress Tracker - Manages progress updates and UI
 */

export class ProgressTracker {
  constructor(progressBarElement, progressTextElement) {
    this.progressBar = progressBarElement;
    this.progressText = progressTextElement;
    this.currentProgress = 0;
  }

  /**
   * Update progress
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Optional status message
   */
  update(progress, message = '') {
    this.currentProgress = Math.min(100, Math.max(0, progress));
    
    if (this.progressBar) {
      this.progressBar.style.width = `${this.currentProgress}%`;
      this.progressBar.setAttribute('aria-valuenow', this.currentProgress);
    }
    
    if (this.progressText) {
      const text = message || `${Math.round(this.currentProgress)}%`;
      this.progressText.textContent = text;
    }
  }

  /**
   * Show progress container
   */
  show() {
    if (this.progressBar) {
      const container = this.progressBar.closest('.progress-container');
      if (container) {
        if (container.classList.contains('hidden')) {
          container.classList.remove('hidden');
        } else {
          container.style.display = 'block';
        }
      }
    }
  }

  /**
   * Hide progress container
   */
  hide() {
    if (this.progressBar) {
      const container = this.progressBar.closest('.progress-container');
      if (container) {
        if (!container.classList.contains('hidden') && container.classList.length > 0) {
           // If it has classes, prefer adding 'hidden' if it was removed
           container.classList.add('hidden');
           container.style.display = ''; // Clear inline style
        } else {
           container.style.display = 'none';
        }
      }
    }
  }

  /**
   * Reset progress
   */
  reset() {
    this.update(0, '');
    this.hide();
  }

  /**
   * Set to complete
   */
  complete(message = 'Complete!') {
    this.update(100, message);
  }
}
