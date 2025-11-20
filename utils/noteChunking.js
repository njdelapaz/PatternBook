/**
 * Note Chunking Utilities
 * Functions to split notes into manageable chunks for retrieval
 */

/**
 * Configuration for chunking
 */
export const CHUNK_CONFIG = {
  CHUNK_SIZE: 500, // characters per chunk
  OVERLAP: 100, // character overlap between chunks
  MIN_CHUNK_SIZE: 50, // minimum size for a valid chunk
};

/**
 * Split text into overlapping chunks
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Size of each chunk in characters
 * @param {number} overlap - Overlap between chunks in characters
 * @returns {Array} Array of chunk objects with text and position
 */
export function chunkText(text, chunkSize = CHUNK_CONFIG.CHUNK_SIZE, overlap = CHUNK_CONFIG.OVERLAP) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const chunks = [];
  const step = chunkSize - overlap;
  
  for (let i = 0; i < text.length; i += step) {
    const chunkText = text.slice(i, i + chunkSize);
    
    // Only include chunks that meet minimum size
    if (chunkText.length >= CHUNK_CONFIG.MIN_CHUNK_SIZE) {
      chunks.push({
        text: chunkText,
        startPos: i,
        endPos: i + chunkText.length,
      });
    }
  }
  
  // Ensure we have at least one chunk even for very short text
  if (chunks.length === 0 && text.length > 0) {
    chunks.push({
      text: text,
      startPos: 0,
      endPos: text.length,
    });
  }
  
  return chunks;
}

/**
 * Create chunks for a note with metadata
 * @param {Object} note - Note object with id, title, content
 * @returns {Array} Array of chunk objects with full metadata
 */
export function chunkNote(note) {
  if (!note || !note.id) {
    return [];
  }
  
  const content = note.content || '';
  const textChunks = chunkText(content);
  
  return textChunks.map((chunk, index) => {
    const noteTitle = note.title || 'Untitled';
    const textWithTitle = `${noteTitle} ${chunk.text}`.trim();
    
    return {
      id: `${note.id}-chunk-${index}`,
      noteId: note.id,
      noteTitle,
      chunkIndex: index,
      text: textWithTitle,
      startPos: chunk.startPos,
      endPos: chunk.endPos,
      noteCreatedAt: note.createdAt,
      noteUpdatedAt: note.updatedAt,
    };
  });
}

/**
 * Create chunks for multiple notes
 * @param {Array} notes - Array of note objects
 * @returns {Array} Array of all chunks from all notes
 */
export function chunkNotes(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }
  
  const allChunks = [];
  
  for (const note of notes) {
    const noteChunks = chunkNote(note);
    allChunks.push(...noteChunks);
  }
  
  return allChunks;
}

/**
 * Get a preview of a chunk (first N characters)
 * @param {string} text - Chunk text
 * @param {number} maxLength - Maximum length of preview
 * @returns {string} Preview text
 */
export function getChunkPreview(text, maxLength = 100) {
  if (!text) {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - 3) + '...';
}

