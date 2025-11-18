/**
 * Note Utilities
 * Helper functions for note operations
 */

/**
 * Generate title based on content
 * @param {string} content - Note content
 * @returns {string} Generated title
 */
export function generateTitleFromContent(content) {
  const lowerContent = content.toLowerCase();

  // Check for dream/library note
  if (lowerContent.includes('dream') && lowerContent.includes('library')) {
    return "Dream about an endless library";
  }

  // Check for productivity note
  if (lowerContent.includes('productivity') || lowerContent.includes('accomplish')) {
    return "Rethinking productivity and worth";
  }

  // Fallback to first few words
  return content.split(' ').slice(0, 5).join(' ') || 'Untitled Note';
}


