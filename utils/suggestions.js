/**
 * Suggestions utility
 * This file is kept for backwards compatibility
 * Real suggestions are now generated in services/mediaSuggestionsService.js
 */

// Deprecated: Use mediaSuggestionsService.generateSuggestions() instead
export function getSuggestionsForNotes(notes) {
  console.warn('[Suggestions] getSuggestionsForNotes is deprecated. Use mediaSuggestionsService.generateSuggestions()');
  return [];
}
