/**
 * AI Suggestion Service
 * Generates personalized suggestions based on user's notes
 */

import { callLLM } from './llmService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findArtworkImage } from './artworkImageService';

const SUGGESTIONS_CACHE_KEY = '@suggestions_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate AI-powered suggestions based on notes
 * @param {Array} notes - User's notes
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Result with suggestions array
 */
export async function generateSuggestions(notes, options = {}) {
  const {
    maxSuggestions = 3,
    forceRefresh = false,
  } = options;

  // Return empty if no notes
  if (!notes || notes.length === 0) {
    return {
      success: true,
      suggestions: [],
      cached: false,
    };
  }

  try {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = await getCachedSuggestions();
      if (cached && cached.suggestions && cached.suggestions.length > 0) {
        console.log('[SuggestionService] Using cached suggestions');
        return {
          success: true,
          suggestions: cached.suggestions,
          cached: true,
        };
      }
    }

    // Prepare notes summary for LLM
    const notesSummary = prepareNotesSummary(notes);

    // Build prompt
    const systemPrompt = buildSuggestionPrompt();
    const userPrompt = `Here are the user's recent journal entries:\n\n${notesSummary}\n\nBased on these entries, suggest ${maxSuggestions} personalized recommendations. Each should be either an artwork, a quote, or a reflective insight that resonates with their themes and emotions.`;

    // Call LLM
    const result = await callLLM({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8, // Higher temperature for creative suggestions
      maxTokens: 1500,
    });

    if (!result.success) {
      console.error('[SuggestionService] LLM call failed:', result.error);
      return {
        success: false,
        error: result.error,
        suggestions: [],
      };
    }

    // Parse suggestions from LLM response
    let suggestions = parseSuggestions(result.data.content);

    // Fetch images for artwork suggestions
    suggestions = await enrichSuggestionsWithImages(suggestions);

    // Cache suggestions
    await cacheSuggestions(suggestions);

    return {
      success: true,
      suggestions,
      cached: false,
      metrics: result.metrics,
    };

  } catch (error) {
    console.error('[SuggestionService] Error generating suggestions:', error);
    return {
      success: false,
      error: {
        type: 'GENERATION_ERROR',
        message: error.message,
      },
      suggestions: [],
    };
  }
}

/**
 * Build system prompt for suggestion generation
 */
function buildSuggestionPrompt() {
  return `You are a thoughtful AI curator who helps journal writers discover meaningful connections through art, literature, and reflection.

Your role is to analyze journal entries and suggest:
1. **Artworks** - paintings, sculptures, or visual art that resonate with their themes (MUST be real, famous artworks)
2. **Quotes** - meaningful quotes from literature, philosophy, or notable figures
3. **Insights** - Gentle reflective prompts or observations about patterns in their thinking

IMPORTANT: Return suggestions in JSON format. Each suggestion should have this exact structure:

{
  "type": "art" | "quote" | "insight",
  "title": "Title of artwork/quote/insight",
  "subtitle": "Year or brief context (optional)",
  "author": "Artist/author name",
  "badge": "Picked for you",
  "description": "2-3 sentences explaining why this resonates with their journal entries. Be specific about which themes or emotions you're connecting to."
}

For artworks, you MUST suggest REAL, FAMOUS paintings that exist (e.g., "Starry Night" by Van Gogh, "The Scream" by Munch, "Wanderer above the Sea of Fog" by Friedrich). Include the exact title and artist name.
For quotes, include the full quote as the title and the author.
For insights, create an original reflective observation or question.

Be thoughtful, specific, and avoid generic suggestions. Reference actual themes, emotions, or ideas from their entries.

Return ONLY valid JSON array with 1-3 suggestions. No additional text.`;
}

/**
 * Prepare a summary of recent notes for the LLM
 */
function prepareNotesSummary(notes) {
  // Get most recent 10 notes, sorted by timestamp
  const recentNotes = [...notes]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 10);

  // Format notes with preview (first 300 chars each)
  return recentNotes.map((note, idx) => {
    const content = note.content || '';
    const preview = content.length > 300 ? content.substring(0, 300) + '...' : content;
    const title = note.title || `Note ${idx + 1}`;
    return `[${title}]\n${preview}`;
  }).join('\n\n---\n\n');
}

/**
 * Parse suggestions from LLM response
 */
function parseSuggestions(responseContent) {
  try {
    // Try to extract JSON from response
    let jsonStr = responseContent.trim();
    
    // Handle markdown code blocks
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    // Parse JSON
    const parsed = JSON.parse(jsonStr);
    
    // Handle both array and single object
    const suggestions = Array.isArray(parsed) ? parsed : [parsed];

    // Validate and clean suggestions
    return suggestions
      .filter(s => s.type && s.title && s.description)
      .map(s => ({
        type: s.type,
        title: s.title,
        subtitle: s.subtitle || null,
        author: s.author || null,
        badge: s.badge || 'Picked for you',
        description: s.description,
      }));

  } catch (error) {
    console.error('[SuggestionService] Failed to parse suggestions:', error);
    console.error('[SuggestionService] Raw response:', responseContent);
    
    // Return empty array if parsing fails
    return [];
  }
}

/**
 * Fetch images for artwork suggestions
 */
async function enrichSuggestionsWithImages(suggestions) {
  const enriched = await Promise.all(
    suggestions.map(async (suggestion) => {
      // Only fetch images for artwork suggestions
      if (suggestion.type !== 'art') {
        return suggestion;
      }

      try {
        console.log(`[SuggestionService] Fetching image for: ${suggestion.title}`);
        const imageResult = await findArtworkImage(suggestion.title, suggestion.author || '');

        if (imageResult.success) {
          return {
            ...suggestion,
            imageUri: imageResult.imageUrl,
            imageSource: imageResult.source || 'unsplash',
            imageAttribution: imageResult.photographer || imageResult.source,
          };
        } else {
          console.log(`[SuggestionService] No image found for ${suggestion.title}, keeping text-only`);
          return suggestion;
        }
      } catch (error) {
        console.error(`[SuggestionService] Error fetching image for ${suggestion.title}:`, error);
        return suggestion; // Return without image if fetch fails
      }
    })
  );

  return enriched;
}

/**
 * Cache suggestions
 */
async function cacheSuggestions(suggestions) {
  try {
    const cacheData = {
      suggestions,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(SUGGESTIONS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('[SuggestionService] Failed to cache suggestions:', error);
  }
}

/**
 * Get cached suggestions if still valid
 */
async function getCachedSuggestions() {
  try {
    const cached = await AsyncStorage.getItem(SUGGESTIONS_CACHE_KEY);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;

    // Return if cache is still valid
    if (age < CACHE_DURATION) {
      return cacheData;
    }

    // Clear expired cache
    await AsyncStorage.removeItem(SUGGESTIONS_CACHE_KEY);
    return null;

  } catch (error) {
    console.error('[SuggestionService] Failed to get cached suggestions:', error);
    return null;
  }
}

/**
 * Clear suggestions cache (useful for testing or manual refresh)
 */
export async function clearSuggestionsCache() {
  try {
    await AsyncStorage.removeItem(SUGGESTIONS_CACHE_KEY);
    console.log('[SuggestionService] Cache cleared');
  } catch (error) {
    console.error('[SuggestionService] Failed to clear cache:', error);
  }
}

/**
 * Check if cached suggestions exist
 */
export async function hasCachedSuggestions() {
  try {
    const cached = await getCachedSuggestions();
    return cached !== null;
  } catch (error) {
    return false;
  }
}

export default {
  generateSuggestions,
  clearSuggestionsCache,
  hasCachedSuggestions,
};

