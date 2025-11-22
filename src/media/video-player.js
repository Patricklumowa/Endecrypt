/**
 * Video Player - Handles video preview and playback
 */

export class VideoPlayer {
  constructor(containerElement) {
    this.container = containerElement;
  }

  /**
   * Display and play a video from a blob
   * @param {Blob} blob - Video blob
   * @param {string} filename - Video filename
   * @returns {string} Blob URL
   */
  display(blob, filename) {
    this.clear();

    const blobUrl = URL.createObjectURL(blob);
    
    const video = document.createElement('video');
    video.src = blobUrl;
    video.controls = true;
    video.autoplay = false; // Autoplay might be blocked, safer to let user play
    video.preload = 'metadata';
    // Tailwind classes
    video.className = 'w-full h-full max-h-[60vh] bg-black object-contain';
    
    const caption = document.createElement('div');
    caption.className = 'p-2 text-center text-xs text-muted-foreground bg-muted/50';
    caption.textContent = filename;
    
    this.container.appendChild(video);
    this.container.appendChild(caption);
    
    // Show container
    this.container.classList.remove('hidden');
    
    return blobUrl;
  }

  /**
   * Clear the player
   */
  clear() {
    // Pause and cleanup any existing video
    const existingVideo = this.container.querySelector('video');
    if (existingVideo) {
      existingVideo.pause();
      existingVideo.src = '';
    }
    
    this.container.innerHTML = '';
    this.container.classList.add('hidden');
  }
}
