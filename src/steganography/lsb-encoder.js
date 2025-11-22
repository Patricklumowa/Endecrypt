/**
 * LSB Steganography Encoder/Decoder
 * Hides data in the Least Significant Bits of image RGB channels.
 */

export class LSBEncoder {
  /**
   * Check if the cover image has enough capacity for the secret data
   * @param {HTMLImageElement} image - Loaded image element
   * @param {number} dataSizeInBytes - Size of data to hide
   * @returns {boolean}
   */
  static hasCapacity(image, dataSizeInBytes) {
    const totalPixels = image.width * image.height;
    // 3 bits per pixel (R, G, B), minus 32 bits for header (approx 11 pixels)
    const maxBytes = Math.floor(((totalPixels * 3) - 32) / 8);
    return dataSizeInBytes <= maxBytes;
  }

  /**
   * Get max capacity in bytes
   * @param {HTMLImageElement} image 
   * @returns {number}
   */
  static getMaxCapacity(image) {
    const totalPixels = image.width * image.height;
    return Math.floor(((totalPixels * 3) - 32) / 8);
  }

  /**
   * Hide data inside an image
   * @param {File} coverImageFile - The original image file
   * @param {Uint8Array} secretData - The encrypted data to hide
   * @returns {Promise<Blob>} - The resulting PNG blob
   */
  static async hide(coverImageFile, secretData) {
    const image = await this.loadImage(coverImageFile);
    
    if (!this.hasCapacity(image, secretData.length)) {
      throw new Error('File is too large for this cover image.');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = image.width;
    canvas.height = image.height;
    
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Prepare data: 4 bytes length header + secret data
    const lengthHeader = new Uint8Array(4);
    new DataView(lengthHeader.buffer).setUint32(0, secretData.length);
    
    const fullData = new Uint8Array(lengthHeader.length + secretData.length);
    fullData.set(lengthHeader);
    fullData.set(secretData, 4);

    let dataIndex = 0;
    let bitIndex = 0;

    // Iterate pixels (R, G, B, A)
    for (let i = 0; i < pixels.length; i += 4) {
      if (dataIndex >= fullData.length) break;

      // Process R, G, B channels
      for (let j = 0; j < 3; j++) {
        if (dataIndex >= fullData.length) break;

        const byte = fullData[dataIndex];
        const bit = (byte >> (7 - bitIndex)) & 1;

        // Clear LSB and set new bit
        pixels[i + j] = (pixels[i + j] & ~1) | bit;

        bitIndex++;
        if (bitIndex === 8) {
          bitIndex = 0;
          dataIndex++;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }

  /**
   * Reveal data from a stego image
   * @param {File} stegoImageFile 
   * @returns {Promise<Uint8Array>}
   */
  static async reveal(stegoImageFile) {
    const image = await this.loadImage(stegoImageFile);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = image.width;
    canvas.height = image.height;
    
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // 1. Read Header (32 bits = 4 bytes)
    let headerBytes = new Uint8Array(4);
    let byteIndex = 0;
    let bitIndex = 0;
    let currentByte = 0;

    let pixelIndex = 0;

    // Read 32 bits for length
    while (byteIndex < 4 && pixelIndex < pixels.length) {
      for (let j = 0; j < 3; j++) { // R, G, B
        if (byteIndex >= 4) break;
        
        const bit = pixels[pixelIndex + j] & 1;
        currentByte = (currentByte << 1) | bit;
        bitIndex++;

        if (bitIndex === 8) {
          headerBytes[byteIndex] = currentByte;
          byteIndex++;
          bitIndex = 0;
          currentByte = 0;
        }
      }
      pixelIndex += 4; // Next pixel
    }

    const dataLength = new DataView(headerBytes.buffer).getUint32(0);
    
    // Sanity check
    if (dataLength <= 0 || dataLength > pixels.length * 3 / 8) {
      throw new Error('No valid hidden data found or file corrupted.');
    }

    // 2. Read Data
    const data = new Uint8Array(dataLength);
    byteIndex = 0;
    bitIndex = 0;
    currentByte = 0;

    // Continue from where we left off (pixelIndex is already advanced)
    // Note: We might be in the middle of a pixel (e.g. read R, G for header, B is next)
    // But for simplicity in the loop above, we advanced pixelIndex by 4. 
    // Let's restart the loop logic cleanly to avoid off-by-one errors with channels.
    
    // Reset and do a single pass state machine
    byteIndex = 0;
    bitIndex = 0;
    currentByte = 0;
    let readingHeader = true;
    let headerBuffer = 0; // to build 32-bit int
    let headerBitsRead = 0;
    
    let outputBuffer = new Uint8Array(dataLength);
    let outputIndex = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      for (let j = 0; j < 3; j++) { // R, G, B
        const bit = pixels[i + j] & 1;

        if (readingHeader) {
          headerBuffer = (headerBuffer << 1) | bit;
          headerBitsRead++;
          if (headerBitsRead === 32) {
            readingHeader = false;
            // We already parsed length above to allocate buffer, 
            // but we need to skip these bits in this pass.
            // Alternatively, we could have just continued, but channel alignment is tricky.
            // Let's just verify length matches.
             if (headerBuffer !== dataLength) {
                 // Should not happen if logic is consistent
             }
          }
        } else {
          if (outputIndex >= dataLength) break;

          currentByte = (currentByte << 1) | bit;
          bitIndex++;

          if (bitIndex === 8) {
            outputBuffer[outputIndex] = currentByte;
            outputIndex++;
            bitIndex = 0;
            currentByte = 0;
          }
        }
      }
      if (!readingHeader && outputIndex >= dataLength) break;
    }

    return outputBuffer;
  }

  static loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}
