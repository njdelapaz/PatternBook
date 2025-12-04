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

    // Validate we got suggestions
    if (suggestions.length === 0) {
      console.warn('[SuggestionService] No valid suggestions parsed from LLM response');
      return {
        success: false,
        error: { type: 'PARSE_ERROR', message: 'No valid suggestions generated' },
        suggestions: [],
      };
    }

    // Fetch images for artwork suggestions (will convert to quotes if image fails)
    // Pass notesSummary for relevance checking and fallback quote generation
    suggestions = await enrichSuggestionsWithImages(suggestions, notesSummary);

    // Final validation: ensure we have at least one suggestion
    if (suggestions.length === 0) {
      console.warn('[SuggestionService] No suggestions after enrichment');
      return {
        success: false,
        error: { type: 'ENRICHMENT_ERROR', message: 'All suggestions filtered out' },
        suggestions: [],
      };
    }

    // Log final suggestion types
    const typeCounts = suggestions.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});
    console.log('[SuggestionService] Final suggestions:', typeCounts);

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

CRITICAL CONTENT GUIDELINES:
- NO inappropriate, offensive, or explicit content
- NO violence, hate speech, or disturbing themes
- NO controversial political or religious content
- Keep suggestions uplifting, thoughtful, and appropriate for all audiences
- Focus on universally meaningful themes: growth, reflection, connection, beauty, wisdom

ARTWORK REQUIREMENTS:
- ONLY suggest artworks that are WELL-DOCUMENTED and FAMOUS (e.g., "Starry Night" by Vincent van Gogh, "The Scream" by Edvard Munch, "The Great Wave off Kanagawa" by Hokusai)
- Include the EXACT title and FULL artist name (first and last name)
- Artworks MUST be findable on Wikipedia - if unsure, use a quote instead
- Prefer artworks from major museums or art history canon
- Avoid obscure or contemporary works that may not have documentation

IMPORTANT: Return suggestions in JSON format. Each suggestion should have this exact structure:

{
  "type": "art" | "quote" | "insight",
  "title": "Title of artwork/quote/insight",
  "subtitle": "Year or brief context (optional)",
  "author": "Artist/author name",
  "badge": "Picked for you",
  "description": "2-3 sentences explaining why this resonates with their journal entries. Be specific about which themes or emotions you're connecting to."
}

DISTRIBUTION GUIDELINES:
- Prefer quotes and insights over artwork (they're more reliable)
- Only suggest 1 artwork maximum per set of recommendations
- If unsure whether an artwork is famous enough, use a quote instead

For artworks, use full names (e.g., "Vincent van Gogh" not "Van Gogh", "Claude Monet" not "Monet")
For quotes, include the full quote as the title and the author with their profession/context if relevant
For insights, create an original reflective observation or question

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
 * Content filter - check for inappropriate content
 */
function containsInappropriateContent(text) {
  const inappropriatePatterns = [
    /\b(explicit|nsfw|nude|naked|sexual|violence|blood|gore|death|kill|murder|weapon|gun|bomb)\b/i,
    /\b(hate|racist|sexist|offensive|disturbing|graphic|brutal)\b/i,
    /\b(drug|alcohol|addiction|abuse)\b/i,
  ];
  
  return inappropriatePatterns.some(pattern => pattern.test(text));
}

/**
 * Validate suggestion content for appropriateness
 */
function validateSuggestionContent(suggestion) {
  const textToCheck = `${suggestion.title} ${suggestion.description} ${suggestion.author || ''}`;
  
  if (containsInappropriateContent(textToCheck)) {
    console.warn('[SuggestionService] Filtered inappropriate suggestion:', suggestion.title);
    return false;
  }
  
  return true;
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
      .filter(s => validateSuggestionContent(s)) // Content filter
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
 * Generate a personalized fallback quote when artwork fails
 * Uses AI to create a quote based on user's note themes
 */
async function generateFallbackQuote(artworkSuggestion, notesSummary) {
  try {
    console.log('[SuggestionService] Generating AI fallback quote for failed artwork');
    
    const prompt = `The user's journal entries show themes around: ${artworkSuggestion.description}

Generate a single meaningful quote that resonates with these themes. The quote should be:
- From a real author, philosopher, or notable figure
- Relevant to the themes mentioned above
- Inspirational and thought-provoking
- NOT about art or creativity (focus on life, growth, reflection, emotions, etc.)

Return ONLY a JSON object with this structure:
{
  "quote": "The full quote text",
  "author": "Author name",
  "description": "2-3 sentences explaining why this quote resonates with their journal themes"
}`;

    const result = await callLLM({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a thoughtful curator who suggests meaningful quotes. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      maxTokens: 300,
    });

    if (result.success && result.data && result.data.content) {
      // Parse the AI response
      let jsonStr = result.data.content.trim();
      
      // Handle markdown code blocks
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      
      return {
        type: 'quote',
        title: parsed.quote,
        author: parsed.author,
        badge: artworkSuggestion.badge || 'Picked for you',
        description: parsed.description,
        subtitle: null,
      };
    }
    
    // If AI generation fails, use a simple fallback
    console.warn('[SuggestionService] AI quote generation failed, using simple fallback');
    return createSimpleFallbackQuote(artworkSuggestion);
    
  } catch (error) {
    console.error('[SuggestionService] Error generating fallback quote:', error);
    return createSimpleFallbackQuote(artworkSuggestion);
  }
}

/**
 * Create a simple fallback quote (last resort)
 */
function createSimpleFallbackQuote(artworkSuggestion) {
  return {
    type: 'quote',
    title: '"The unexamined life is not worth living."',
    author: 'Socrates',
    badge: artworkSuggestion.badge || 'Picked for you',
    description: 'Reflection and self-awareness are essential to a meaningful life. Your journal is a tool for that examination.',
    subtitle: null,
  };
}

/**
 * Validate image URL to ensure it's actually an image
 */
async function validateImageUrl(imageUrl) {
  try {
    // Basic check for image file extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const urlLower = imageUrl.toLowerCase();
    
    // Check if URL contains image extension or is from known image provider
    const hasImageExtension = imageExtensions.some(ext => urlLower.includes(ext));
    const isFromImageProvider = urlLower.includes('wikimedia') || urlLower.includes('wikipedia');
    
    if (!hasImageExtension && !isFromImageProvider) {
      console.warn('[SuggestionService] Image URL appears invalid:', imageUrl);
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if Wikipedia page description is relevant to user's notes
 */
function isDescriptionRelevantToNotes(description, suggestionDescription) {
  // Extract key themes from the suggestion description (what AI said resonated)
  const suggestionLower = suggestionDescription.toLowerCase();
  const descriptionLower = description.toLowerCase();
  
  // Look for thematic overlap
  const thematicWords = [
    'solitude', 'isolation', 'loneliness', 'alone', 'contemplation', 'reflection',
    'nature', 'landscape', 'peace', 'calm', 'tranquility', 'serenity',
    'emotion', 'feeling', 'mood', 'expression', 'passion', 'intensity',
    'struggle', 'conflict', 'tension', 'anxiety', 'stress', 'worry',
    'joy', 'happiness', 'celebration', 'triumph', 'success', 'victory',
    'change', 'transformation', 'growth', 'journey', 'progress', 'evolution',
    'darkness', 'light', 'shadow', 'night', 'day', 'dawn', 'dusk',
    'dream', 'imagination', 'fantasy', 'surreal', 'abstract', 'symbolism',
  ];
  
  // Count thematic matches
  const matches = thematicWords.filter(word => 
    suggestionLower.includes(word) && descriptionLower.includes(word)
  );
  
  // Consider relevant if we have at least 2 thematic matches or if description is substantial
  const hasThematicMatch = matches.length >= 2;
  const hasSubstantialDescription = description.length > 100; // Detailed pages are usually about the artwork
  
  console.log(`[SuggestionService] Relevance check: ${matches.length} thematic matches, description length: ${description.length}`);
  
  return hasThematicMatch || hasSubstantialDescription;
}

/**
 * Enrich artwork suggestions with images and relevance validation
 * Falls back to AI-generated quotes if validation fails
 */
async function enrichSuggestionsWithImages(suggestions, notesSummary) {
  const enriched = await Promise.all(
    suggestions.map(async (suggestion) => {
      // Only process artwork suggestions
      if (suggestion.type !== 'art') {
        return suggestion;
      }

      try {
        console.log(`[SuggestionService] Fetching and validating image for: ${suggestion.title}`);
        const imageResult = await findArtworkImage(suggestion.title, suggestion.author || '');

        if (imageResult.success && imageResult.imageUrl && imageResult.metadata) {
          // Validate image URL format
          const isValidImage = await validateImageUrl(imageResult.imageUrl);
          
          if (!isValidImage) {
            console.log(`[SuggestionService] Invalid image URL format, generating fallback quote`);
            return await generateFallbackQuote(suggestion, notesSummary);
          }
          
          // Check if Wikipedia page description is relevant to user's notes
          const isRelevant = isDescriptionRelevantToNotes(
            imageResult.metadata.description,
            suggestion.description
          );
          
          if (!isRelevant) {
            console.log(`[SuggestionService] Artwork not relevant to user's notes, generating fallback quote`);
            return await generateFallbackQuote(suggestion, notesSummary);
          }
          
          console.log(`[SuggestionService] ✓ Found valid and relevant image for ${suggestion.title}`);
          return {
            ...suggestion,
            imageUri: imageResult.imageUrl,
            imageSource: imageResult.source || 'wikipedia',
            imageAttribution: imageResult.source,
          };
        } else {
          console.log(`[SuggestionService] Image fetch failed, generating fallback quote`);
          return await generateFallbackQuote(suggestion, notesSummary);
        }
      } catch (error) {
        console.error(`[SuggestionService] Error processing artwork ${suggestion.title}:`, error);
        return await generateFallbackQuote(suggestion, notesSummary);
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

