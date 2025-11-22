/**
 * Blob Builder - Reconstructs files from chunks
 */

export class BlobBuilder {
  constructor() {
    this.chunks = [];
  }

  /**
   * Add a chunk to the builder
   * @param {ArrayBuffer} chunkData - Chunk data
   * @param {number} index - Chunk index
   */
  addChunk(chunkData, index) {
    this.chunks[index] = new Uint8Array(chunkData);
  }

  /**
   * Build final blob from all chunks
   * @param {string} mimeType - MIME type for the blob
   * @returns {Blob}
   */
  build(mimeType) {
    // Filter out any undefined chunks
    const validChunks = this.chunks.filter(chunk => chunk !== undefined);
    return new Blob(validChunks, { type: mimeType });
  }

  /**
   * Get current chunk count
   * @returns {number}
   */
  getChunkCount() {
    return this.chunks.filter(chunk => chunk !== undefined).length;
  }

  /**
   * Clear all chunks
   */
  clear() {
    this.chunks = [];
  }
}
