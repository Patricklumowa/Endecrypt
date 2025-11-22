/**
 * Decryptor - Handles file decryption with AES-GCM
 */

import { KeyManager } from './key-manager.js';

export class Decryptor {
  /**
   * Parse encrypted file structure
   * @param {ArrayBuffer} fileData - Encrypted file data
   * @returns {Promise<{salt: Uint8Array, iv: Uint8Array, encryptedData: ArrayBuffer, metadata: object}>}
   */
  static async parseEncryptedFile(fileData) {
    const data = new Uint8Array(fileData);
    
    // Validate minimum file size (salt + iv + at least some data + metadata + length)
    if (data.length < 28 + 4) {
      throw new Error('File is too small to be a valid encrypted file');
    }
    
    // Extract salt (first 16 bytes)
    const salt = data.slice(0, 16);
    
    // Extract IV (next 12 bytes)
    const iv = data.slice(16, 28);
    
    // Read metadata length from the end (last 4 bytes)
    const metadataLengthView = new DataView(fileData, data.length - 4, 4);
    const metadataLength = metadataLengthView.getUint32(0, true);
    
    // Validate metadata length
    if (metadataLength <= 0 || metadataLength > data.length - 32) {
      throw new Error('Invalid metadata length in encrypted file');
    }
    
    // Extract metadata (before the length bytes)
    const metadataStart = data.length - 4 - metadataLength;
    
    // Ensure metadata start is after header
    if (metadataStart < 28) {
      throw new Error('Invalid file structure: metadata overlaps with header');
    }
    
    const metadataBytes = data.slice(metadataStart, data.length - 4);
    const decoder = new TextDecoder();
    const metadataJson = decoder.decode(metadataBytes);
    
    let metadata;
    try {
      metadata = JSON.parse(metadataJson);
    } catch (e) {
      throw new Error(`Invalid metadata JSON: ${e.message}`);
    }
    
    // Extract encrypted data (between IV and metadata)
    const encryptedData = data.slice(28, metadataStart).buffer;
    
    return { salt, iv, encryptedData, metadata };
  }

  /**
   * Decrypt a data chunk using AES-GCM
   * @param {ArrayBuffer} encryptedData - Encrypted chunk data
   * @param {CryptoKey} key - AES-GCM key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<ArrayBuffer>} Decrypted data
   */
  static async decryptChunk(encryptedData, key, iv) {
    try {
      return await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encryptedData
      );
    } catch (error) {
      throw new Error('Decryption failed. Invalid password or corrupted file.');
    }
  }

  /**
   * Prepare decryption key based on metadata and password
   * @param {object} metadata - File metadata
   * @param {string|null} password - Optional password
   * @param {Uint8Array} salt - Salt from encrypted file
   * @returns {Promise<CryptoKey>} Decryption key
   */
  static async prepareKey(metadata, password, salt) {
    if (metadata.hasPassword) {
      if (!password) {
        throw new Error('Password required for this file');
      }
      return await KeyManager.deriveKey(password, salt);
    } else {
      // Use embedded key for password-less files
      if (!metadata.key) {
        throw new Error('Invalid file format: missing key data');
      }
      const keyData = new Uint8Array(metadata.key);
      return await KeyManager.importKey(keyData);
    }
  }

  /**
   * Detect if decrypted data is a media file
   * @param {string} mimeType - File MIME type
   * @returns {{isImage: boolean, isVideo: boolean, isAudio: boolean}}
   */
  static detectMediaType(mimeType) {
    return {
      isImage: mimeType.startsWith('image/'),
      isVideo: mimeType.startsWith('video/'),
      isAudio: mimeType.startsWith('audio/')
    };
  }
}
