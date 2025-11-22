/**
 * Downloader - Handles file downloads
 */

export class Downloader {
  /**
   * Download a blob as a file
   * @param {Blob} blob - Blob to download
   * @param {string} filename - Suggested filename
   */
  static download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Get encrypted filename
   * @param {string} originalFilename - Original file name
   * @returns {string} Filename with .enc extension
   */
  static getEncryptedFilename(originalFilename) {
    return `${originalFilename}.enc`;
  }

  /**
   * Get decrypted filename (remove .enc extension)
   * @param {string} encryptedFilename - Encrypted file name
   * @param {string} originalFilename - Original filename from metadata
   * @returns {string} Decrypted filename
   */
  static getDecryptedFilename(encryptedFilename, originalFilename) {
    return originalFilename || encryptedFilename.replace(/\.enc$/, '');
  }
}
