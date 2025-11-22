/**
 * Chunked File Reader - Reads files in 10MB chunks
 */

export const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

export class ChunkedFileReader {
  constructor(file) {
    this.file = file;
    this.totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  }

  /**
   * Get total number of chunks
   * @returns {number}
   */
  getTotalChunks() {
    return this.totalChunks;
  }

  /**
   * Read file in chunks using async generator
   * @yields {{data: ArrayBuffer, index: number, progress: number}}
   */
  async *readChunks() {
    let offset = 0;
    let chunkIndex = 0;

    while (offset < this.file.size) {
      const end = Math.min(offset + CHUNK_SIZE, this.file.size);
      const chunk = this.file.slice(offset, end);
      const arrayBuffer = await chunk.arrayBuffer();

      const progress = Math.round((offset / this.file.size) * 100);

      yield {
        data: arrayBuffer,
        index: chunkIndex,
        progress: progress
      };

      offset = end;
      chunkIndex++;
    }
  }

  /**
   * Read entire file at once (for small files)
   * @returns {Promise<ArrayBuffer>}
   */
  async readAll() {
    return await this.file.arrayBuffer();
  }

  /**
   * Check if file should be chunked
   * @returns {boolean}
   */
  shouldChunk() {
    return this.file.size > CHUNK_SIZE;
  }
}
