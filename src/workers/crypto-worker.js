/**
 * Crypto Worker - Offloads encryption/decryption to prevent UI blocking
 */

import { Encryptor } from '../crypto/encryptor.js';
import { Decryptor } from '../crypto/decryptor.js';

self.onmessage = async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'encrypt-chunk':
        await handleEncryptChunk(data);
        break;
      
      case 'decrypt-chunk':
        await handleDecryptChunk(data);
        break;
      
      case 'parse-file':
        await handleParseFile(data);
        break;
      
      default:
        self.postMessage({ type: 'error', error: `Unknown task type: ${type}` });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error.message,
      taskId: data.taskId 
    });
  }
};

/**
 * Handle chunk encryption
 */
async function handleEncryptChunk(data) {
  const { chunkData, key, iv, chunkIndex, taskId } = data;
  
  const encrypted = await Encryptor.encryptChunk(chunkData, key, iv);
  
  self.postMessage({
    type: 'chunk-encrypted',
    taskId,
    chunkIndex,
    encryptedData: encrypted
  }, [encrypted]);
}

/**
 * Handle chunk decryption
 */
async function handleDecryptChunk(data) {
  const { encryptedData, key, iv, chunkIndex, taskId } = data;
  
  const decrypted = await Decryptor.decryptChunk(encryptedData, key, iv);
  
  self.postMessage({
    type: 'chunk-decrypted',
    taskId,
    chunkIndex,
    decryptedData: decrypted
  }, [decrypted]);
}

/**
 * Handle encrypted file parsing
 */
async function handleParseFile(data) {
  const { fileData, taskId } = data;
  
  const parsed = await Decryptor.parseEncryptedFile(fileData);
  
  // Convert typed arrays to regular arrays for transfer
  self.postMessage({
    type: 'file-parsed',
    taskId,
    salt: Array.from(parsed.salt),
    iv: Array.from(parsed.iv),
    encryptedData: parsed.encryptedData,
    metadata: parsed.metadata
  }, [parsed.encryptedData]);
}
