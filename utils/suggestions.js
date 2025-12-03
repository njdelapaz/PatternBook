/**
 * Suggestions Utility
 * Manages AI-generated suggestions for user notes
 */

import suggestionService from '../services/suggestionService';

// Fallback suggestions (used if AI generation fails)
const FALLBACK_SUGGESTIONS = [
  {
    type: 'quote',
    title: '"The unexamined life is not worth living."',
    author: 'Socrates',
    badge: 'Picked for you',
    description: 'This ancient wisdom reminds us that reflection and self-awareness are essential to a meaningful life. Your journal is a tool for that examination.',
  },
  {
    type: 'insight',
    title: 'Notice the patterns in your thoughts',
    subtitle: 'Reflection prompt',
    badge: 'Picked for you',
    description: 'As you write more, you might start to see recurring themes or emotions. What patterns are emerging in your entries? What do they tell you about what matters most?',
  },
];

/**
 * Generate AI suggestions based on notes
 * This is async and calls the AI service
 * 
 * @param {Array} notes - User's notes
 * @param {Object} options - Options for generation
 * @returns {Promise<Array>} Array of suggestions
 */
export async function generateAISuggestions(notes, options = {}) {
  if (!notes || notes.length === 0) {
    return [];
  }

  try {
    const result = await suggestionService.generateSuggestions(notes, options);
    
    if (result.success && result.suggestions.length > 0) {
      console.log('[Suggestions] Generated', result.suggestions.length, 'AI suggestions', 
                  result.cached ? '(cached)' : '(fresh)');
      return result.suggestions;
    }

    // Return fallback if AI generation failed
    console.log('[Suggestions] Using fallback suggestions');
    return FALLBACK_SUGGESTIONS;

  } catch (error) {
    console.error('[Suggestions] Error generating suggestions:', error);
    return FALLBACK_SUGGESTIONS;
  }
}

/**
 * Check if we have cached suggestions
 */
export async function hasCachedSuggestions() {
  return await suggestionService.hasCachedSuggestions();
}

/**
 * Clear cached suggestions (for manual refresh)
 */
export async function clearSuggestionsCache() {
  return await suggestionService.clearSuggestionsCache();
}

// Keep old sync function for backward compatibility (returns empty, triggers async load)
export function getSuggestionsForNotes(notes) {
  // This is deprecated - use generateAISuggestions instead
  return [];
}
