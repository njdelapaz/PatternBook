/**
 * Text-based Summarization Utility
 * Simple fallback when AI summarization is unavailable
 * Extracts first sentences or words intelligently
 */

const MAX_SUMMARY_LENGTH = 150; // Target length for text-based summaries
const MAX_SENTENCES = 3; // Maximum sentences to extract
const MAX_WORDS = 50; // Maximum words if sentence extraction fails

/**
 * Extract first few sentences from text
 * @param {string} text - Text to summarize
 * @returns {string} Extracted summary
 */
function extractFirstSentences(text) {
  if (!text || text.trim().length === 0) {
    return '';
  }

  // Split by sentence endings (. ! ?)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length === 0) {
    // No sentence endings found, fall back to word extraction
    return extractFirstWords(text);
  }

  // Take first few sentences up to MAX_SENTENCES
  let summary = '';
  for (let i = 0; i < Math.min(sentences.length, MAX_SENTENCES); i++) {
    const sentence = sentences[i].trim();
    const separator = summary.length > 0 ? ' ' : '';
    const candidate = summary + separator + sentence;
    
    if (candidate.length <= MAX_SUMMARY_LENGTH) {
      summary = candidate;
    } else {
      // If adding this sentence would exceed limit, stop here
      break;
    }
  }

  // If we have at least one sentence, return it (ensure within limit)
  if (summary.trim().length > 0) {
    const trimmed = summary.trim();
    if (trimmed.length <= MAX_SUMMARY_LENGTH) {
      return trimmed;
    }
    // Truncate if slightly over (shouldn't happen, but safety check)
    const truncated = trimmed.slice(0, MAX_SUMMARY_LENGTH).trim();
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
  }

  // Fallback to word extraction
  return extractFirstWords(text);
}

/**
 * Extract first N words from text
 * @param {string} text - Text to summarize
 * @returns {string} Extracted summary
 */
function extractFirstWords(text) {
  if (!text || text.trim().length === 0) {
    return '';
  }

  const words = text.trim().split(/\s+/);
  const selectedWords = words.slice(0, MAX_WORDS);
  let summary = selectedWords.join(' ');

  // Truncate if still too long
  if (summary.length > MAX_SUMMARY_LENGTH) {
    summary = summary.slice(0, MAX_SUMMARY_LENGTH).trim();
    // Remove partial word at the end
    const lastSpace = summary.lastIndexOf(' ');
    if (lastSpace > 0) {
      summary = summary.slice(0, lastSpace);
    }
    summary += '...';
  }

  return summary;
}

/**
 * Generate text-based summary (fallback when AI is unavailable)
 * @param {string} content - Content to summarize
 * @returns {string} Text-based summary
 */
export function generateTextSummary(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const trimmed = content.trim();
  
  if (trimmed.length === 0) {
    return '';
  }

  // If content is already short, return as-is
  if (trimmed.length <= MAX_SUMMARY_LENGTH) {
    return trimmed;
  }

  // Try sentence extraction first (more natural)
  const sentenceSummary = extractFirstSentences(trimmed);
  
  if (sentenceSummary.length > 0) {
    return sentenceSummary;
  }

  // Fallback to word extraction
  return extractFirstWords(trimmed);
}

