/**
 * File Validator - Validates files and inputs
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export class FileValidator {
  /**
   * Validate file size
   * @param {File} file - File to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateFileSize(file) {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB`
      };
    }
    return { valid: true, error: null };
  }

  /**
   * Validate file exists
   * @param {File|null} file - File to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateFileExists(file) {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }
    return { valid: true, error: null };
  }

  /**
   * Validate encrypted file extension
   * @param {File} file - File to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateEncryptedFile(file) {
    if (!file.name.endsWith('.enc')) {
      return {
        valid: false,
        error: 'Selected file is not an encrypted file (.enc)'
      };
    }
    return { valid: true, error: null };
  }

  /**
   * Validate all conditions for encryption
   * @param {File} file - File to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateForEncryption(file) {
    let result = this.validateFileExists(file);
    if (!result.valid) return result;
    
    result = this.validateFileSize(file);
    if (!result.valid) return result;
    
    return { valid: true, error: null };
  }

  /**
   * Validate all conditions for decryption
   * @param {File} file - File to validate
   * @returns {{valid: boolean, error: string|null}}
   */
  static validateForDecryption(file) {
    let result = this.validateFileExists(file);
    if (!result.valid) return result;
    
    result = this.validateFileSize(file);
    if (!result.valid) return result;
    
    result = this.validateEncryptedFile(file);
    if (!result.valid) return result;
    
    return { valid: true, error: null };
  }

  /**
   * Get human-readable file size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
