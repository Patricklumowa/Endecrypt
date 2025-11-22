/**
 * Image Viewer - Handles image preview
 */

export class ImageViewer {
  constructor(containerElement) {
    this.container = containerElement;
  }

  /**
   * Display an image from a blob
   * @param {Blob} blob - Image blob
   * @param {string} filename - Image filename
   * @returns {string} Blob URL
   */
  display(blob, filename) {
    this.clear();

    const blobUrl = URL.createObjectURL(blob);
    
    const img = document.createElement('img');
    img.src = blobUrl;
    img.alt = filename;
    // Tailwind classes for responsive image
    img.className = 'w-full h-full object-contain max-h-[60vh] blur-reveal';
    
    const caption = document.createElement('div');
    caption.className = 'p-2 text-center text-xs text-muted-foreground bg-muted/50';
    caption.textContent = filename;
    
    this.container.appendChild(img);
    this.container.appendChild(caption);
    
    // Show container
    this.container.classList.remove('hidden');
    
    // Trigger reveal animation
    requestAnimationFrame(() => {
      img.classList.add('revealed');
    });
    
    return blobUrl;
  }

  /**
   * Clear the viewer
   */
  clear() {
    this.container.innerHTML = '';
    this.container.classList.add('hidden');
  }
}
