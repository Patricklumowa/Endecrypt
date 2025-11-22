/**
 * Encryptor - Handles file encryption with AES-GCM
 */

import { KeyManager } from './key-manager.js';

export class Encryptor {
  /**
   * Encrypt a data chunk using AES-GCM
   * @param {ArrayBuffer} data - Chunk data to encrypt
   * @param {CryptoKey} key - AES-GCM key
   * @param {Uint8Array} iv - Initialization vector
   * @returns {Promise<ArrayBuffer>} Encrypted data
   */
  static async encryptChunk(data, key, iv) {
    return await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );
  }

  /**
   * Prepare encryption key based on password
   * @param {string|null} password - Optional password
   * @param {Uint8Array} salt - Salt for key derivation
   * @returns {Promise<{key: CryptoKey, keyData: Uint8Array|null}>}
   */
  static async prepareKey(password, salt) {
    if (password) {
      // Derive key from password
      const key = await KeyManager.deriveKey(password, salt);
      return { key, keyData: null };
    } else {
      // Generate random key for password-less encryption
      const key = await KeyManager.generateRandomKey();
      const keyData = await KeyManager.exportKey(key);
      return { key, keyData };
    }
  }

  /**
   * Create encrypted file metadata
   * @param {string} filename - Original filename
   * @param {string} mimeType - File MIME type
   * @param {boolean} hasPassword - Whether file is password-protected
   * @param {number} chunksCount - Number of encrypted chunks
   * @param {Uint8Array|null} keyData - Raw key data (only for password-less)
   * @returns {object} Metadata object
   */
  static createMetadata(filename, mimeType, hasPassword, chunksCount, keyData) {
    return {
      version: '1.0',
      filename: filename,
      mimeType: mimeType,
      hasPassword: hasPassword,
      chunksCount: chunksCount,
      timestamp: Date.now(),
      // Include key only if no password (will be stored in encrypted format)
      key: keyData ? Array.from(keyData) : null
    };
  }

  /**
   * Serialize metadata to bytes
   * @param {object} metadata - Metadata object
   * @returns {Uint8Array} Serialized metadata with length appended
   */
  static serializeMetadata(metadata) {
    const json = JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const metadataBytes = encoder.encode(json);
    
    // Append length as 4-byte integer at the end
    const buffer = new ArrayBuffer(metadataBytes.length + 4);
    const result = new Uint8Array(buffer);
    const view = new DataView(buffer);
    
    // Copy metadata first
    result.set(metadataBytes, 0);
    
    // Append length at the end
    view.setUint32(metadataBytes.length, metadataBytes.length, true);
    
    return result;
  }

  /**
   * Build final encrypted file structure
   * [16 bytes: salt][12 bytes: IV][encrypted chunks...][metadata length (4 bytes)][metadata]
   * @param {Uint8Array} salt - Salt used for key derivation
   * @param {Uint8Array} iv - Initialization vector
   * @param {Uint8Array[]} encryptedChunks - Array of encrypted chunk data
   * @param {Uint8Array} metadata - Serialized metadata
   * @returns {Blob} Final encrypted file blob
   */
  static buildEncryptedFile(salt, iv, encryptedChunks, metadata) {
    const parts = [
      salt,
      iv,
      ...encryptedChunks,
      metadata
    ];
    
    return new Blob(parts, { type: 'application/octet-stream' });
  }
}
