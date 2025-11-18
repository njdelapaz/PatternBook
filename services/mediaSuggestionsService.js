/**
 * Media Suggestions Service
 * Analyzes notes and generates relevant art and quote suggestions
 */

import { callLLM } from './llmService';
import { findArtworkForTheme } from './artService';
import { getCachedImage } from './imageCache';

/**
 * Generate media suggestions based on recent notes
 * @param {Array} notes - Array of note objects
 * @returns {Promise<Array>} Array of suggestion objects
 */
export async function generateSuggestions(notes) {
  if (!notes || notes.length === 0) {
    console.log('[MediaSuggestions] No notes to analyze');
    return [];
  }

  try {
    // Get recent notes (up to 5 most recent)
    const recentNotes = notes
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);

    console.log(`[MediaSuggestions] Analyzing ${recentNotes.length} recent notes`);

    // Analyze notes with LLM
    const themes = await analyzeNotesForThemes(recentNotes);
    
    if (!themes || themes.length === 0) {
      console.log('[MediaSuggestions] No themes extracted');
      return [];
    }

    console.log(`[MediaSuggestions] Found ${themes.length} themes`);

    // Generate suggestions for each theme
    const suggestions = [];
    
    for (const theme of themes) {
      if (theme.type === 'art') {
        const artSuggestion = await createArtSuggestion(theme);
        if (artSuggestion) {
          suggestions.push(artSuggestion);
        }
      } else if (theme.type === 'quote') {
        const quoteSuggestion = createQuoteSuggestion(theme);
        if (quoteSuggestion) {
          suggestions.push(quoteSuggestion);
        }
      }
    }

    console.log(`[MediaSuggestions] Generated ${suggestions.length} suggestions`);
    return suggestions;
  } catch (error) {
    console.error('[MediaSuggestions] Error generating suggestions:', error);
    return [];
  }
}

/**
 * Analyze notes with LLM to extract themes
 * @param {Array} recentNotes - Recent note objects
 * @returns {Promise<Array>} Array of theme objects
 */
async function analyzeNotesForThemes(recentNotes) {
  try {
    // Prepare note contents for analysis
    const noteContents = recentNotes
      .map((note, idx) => `Note ${idx + 1}: ${note.content}`)
      .join('\n\n');

    const prompt = `Analyze these recent journal entries and identify 2-3 core themes or emotions.
For each theme, suggest:
1. A relevant artwork search query (artist name or art movement)
2. A meaningful quote from literature/philosophy that relates to the theme

Recent notes:
${noteContents}

Return ONLY valid JSON with this structure (no markdown, no explanation):
{
  "suggestions": [
    {
      "type": "art",
      "theme": "theme name",
      "searchQuery": "artist or art movement to search",
      "context": "brief explanation of why this relates"
    },
    {
      "type": "quote", 
      "theme": "theme name",
      "quote": "the full quote text",
      "author": "author name",
      "context": "brief explanation of why this relates"
    }
  ]
}`;

    const result = await callLLM({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a thoughtful literary and art curator who finds meaningful connections between personal reflections and cultural works. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    if (!result.success || !result.data) {
      console.error('[MediaSuggestions] LLM call failed:', result.error);
      return [];
    }

    // Parse JSON response
    let responseText = result.data.content.trim();
    
    // Remove markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(responseText);
    
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      console.error('[MediaSuggestions] Invalid response format');
      return [];
    }

    return parsed.suggestions;
  } catch (error) {
    console.error('[MediaSuggestions] Error analyzing notes:', error);
    return [];
  }
}

/**
 * Create an art suggestion with cached image
 * @param {Object} theme - Theme object from LLM
 * @returns {Promise<Object|null>} Art suggestion or null
 */
async function createArtSuggestion(theme) {
  try {
    console.log('[MediaSuggestions] Finding artwork for:', theme.searchQuery);
    
    // Find artwork from Met Museum
    const artwork = await findArtworkForTheme(theme.searchQuery);
    
    if (!artwork || !artwork.imageUrl) {
      console.log('[MediaSuggestions] No artwork found for theme:', theme.theme);
      return null;
    }

    // Cache the image
    const cachedImageUri = await getCachedImage(artwork.imageUrl);
    
    if (!cachedImageUri) {
      console.log('[MediaSuggestions] Failed to cache image for artwork:', artwork.title);
      return null;
    }

    return {
      type: 'art',
      title: artwork.title,
      subtitle: artwork.date,
      artist: artwork.artist,
      museum: artwork.museum,
      badge: 'Picked for you',
      description: theme.context,
      image: { uri: cachedImageUri },
      imageUrl: artwork.imageUrl, // Keep original URL for reference
      theme: theme.theme,
    };
  } catch (error) {
    console.error('[MediaSuggestions] Error creating art suggestion:', error);
    return null;
  }
}

/**
 * Create a quote suggestion
 * @param {Object} theme - Theme object from LLM
 * @returns {Object|null} Quote suggestion or null
 */
function createQuoteSuggestion(theme) {
  try {
    if (!theme.quote || !theme.author) {
      return null;
    }

    return {
      type: 'quote',
      title: theme.quote,
      author: theme.author,
      badge: 'Picked for you',
      description: theme.context,
      theme: theme.theme,
    };
  } catch (error) {
    console.error('[MediaSuggestions] Error creating quote suggestion:', error);
    return null;
  }
}

/**
 * Refresh suggestions (clears old cache and generates new ones)
 * @param {Array} notes - Array of note objects
 * @returns {Promise<Array>} Array of suggestion objects
 */
export async function refreshSuggestions(notes) {
  console.log('[MediaSuggestions] Refreshing suggestions');
  
  // Clear old cache before generating new suggestions
  const { clearOldCache } = require('./imageCache');
  await clearOldCache();
  
  return generateSuggestions(notes);
}

