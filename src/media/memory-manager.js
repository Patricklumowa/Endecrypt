/**
 * Memory Manager - Manages blob URLs and memory cleanup
 */

export class MemoryManager {
  constructor() {
    this.activeBlobUrls = new Set();
  }

  /**
   * Create and track a blob URL
   * @param {Blob} blob - Blob to create URL for
   * @returns {string} Blob URL
   */
  createBlobUrl(blob) {
    const url = URL.createObjectURL(blob);
    this.activeBlobUrls.add(url);
    return url;
  }

  /**
   * Revoke a specific blob URL
   * @param {string} url - Blob URL to revoke
   */
  revokeBlobUrl(url) {
    if (this.activeBlobUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeBlobUrls.delete(url);
    }
  }

  /**
   * Cleanup all active blob URLs
   */
  cleanup() {
    this.activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
    this.activeBlobUrls.clear();
  }

  /**
   * Get count of active blob URLs
   * @returns {number}
   */
  getActiveCount() {
    return this.activeBlobUrls.size;
  }
}

// Create global instance
export const memoryManager = new MemoryManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  memoryManager.cleanup();
});
