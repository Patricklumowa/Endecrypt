/**
 * Key Manager - Handles cryptographic key generation and derivation
 */

export class KeyManager {
  /**
   * Generate a random salt for key derivation
   * @returns {Uint8Array} 16-byte salt
   */
  static generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Generate a random initialization vector for AES-GCM
   * @returns {Uint8Array} 12-byte IV
   */
  static generateIV() {
    return crypto.getRandomValues(new Uint8Array(12));
  }

  /**
   * Derive a cryptographic key from a password using PBKDF2
   * @param {string} password - User password
   * @param {Uint8Array} salt - Salt for key derivation
   * @returns {Promise<CryptoKey>} Derived AES-GCM key
   */
  static async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key using PBKDF2 with 100,000 iterations
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a random AES-GCM key (for password-less encryption)
   * @returns {Promise<CryptoKey>} Random AES-GCM key
   */
  static async generateRandomKey() {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export a CryptoKey to raw format
   * @param {CryptoKey} key - Key to export
   * @returns {Promise<Uint8Array>} Raw key bytes
   */
  static async exportKey(key) {
    const exported = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(exported);
  }

  /**
   * Import a raw key as AES-GCM CryptoKey
   * @param {Uint8Array} keyData - Raw key bytes
   * @returns {Promise<CryptoKey>} Imported AES-GCM key
   */
  static async importKey(keyData) {
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
}
