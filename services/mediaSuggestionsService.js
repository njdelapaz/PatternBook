/**
 * Media Suggestions Service
 * Analyzes notes and generates relevant art and quote suggestions
 */

import { callLLM } from './llmService';
import { findSpecificArtwork } from './artService';
import { getCachedImage } from './imageCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUGGESTIONS_TRACKER_KEY = '@patternbook_suggestions_tracker';
const SUGGESTIONS_STORAGE_KEY = '@patternbook_suggestions';
const MAX_SUGGESTIONS = 10; // Keep only 10 most recent suggestions

/**
 * Get list of note IDs that already have suggestions
 */
async function getSuggestionsTracker() {
  try {
    const tracker = await AsyncStorage.getItem(SUGGESTIONS_TRACKER_KEY);
    return tracker ? JSON.parse(tracker) : {};
  } catch (error) {
    console.error('[MediaSuggestions] Error loading tracker:', error);
    return {};
  }
}

/**
 * Save suggestions tracker
 */
async function saveSuggestionsTracker(tracker) {
  try {
    await AsyncStorage.setItem(SUGGESTIONS_TRACKER_KEY, JSON.stringify(tracker));
  } catch (error) {
    console.error('[MediaSuggestions] Error saving tracker:', error);
  }
}

/**
 * Load all persisted suggestions
 * @returns {Promise<Array>} Array of suggestion objects
 */
export async function loadPersistedSuggestions() {
  try {
    const suggestionsJson = await AsyncStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    if (suggestionsJson) {
      const suggestions = JSON.parse(suggestionsJson);
      // Return only the 10 most recent
      return suggestions.slice(0, MAX_SUGGESTIONS);
    }
    return [];
  } catch (error) {
    console.error('[MediaSuggestions] Error loading suggestions:', error);
    return [];
  }
}

/**
 * Save suggestions to AsyncStorage
 * @param {Array} suggestions - Array of suggestion objects
 */
async function saveSuggestions(suggestions) {
  try {
    // Keep only the 10 most recent suggestions
    const limited = suggestions.slice(0, MAX_SUGGESTIONS);
    await AsyncStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('[MediaSuggestions] Error saving suggestions:', error);
  }
}

/**
 * Add a new suggestion to the persisted list
 * @param {Object} suggestion - Suggestion object to add
 */
async function addSuggestionToPersisted(suggestion) {
  try {
    const existing = await loadPersistedSuggestions();
    // Add new suggestion at the beginning (most recent first)
    const updated = [suggestion, ...existing];
    await saveSuggestions(updated);
  } catch (error) {
    console.error('[MediaSuggestions] Error adding suggestion:', error);
  }
}

/**
 * Generate ONE suggestion for a specific note
 * @param {Object} note - Note object
 * @returns {Promise<Object|null>} Suggestion object or null
 */
export async function generateSuggestionForNote(note) {
  if (!note || !note.content || note.content.trim().length === 0) {
    console.log('[MediaSuggestions] Note has no content');
    return null;
  }

  try {
    // Check if note already has a suggestion
    const tracker = await getSuggestionsTracker();
    if (tracker[note.id]) {
      console.log('[MediaSuggestions] Note already has suggestion:', note.id);
      return null;
    }

    console.log('[MediaSuggestions] Generating suggestion for note:', note.title);

    // Random weighting: 100% art, 0% quote
    const preferredType = Math.random() < 1 ? 'art' : 'quote';
    console.log(`[MediaSuggestions] Preferred type (${preferredType === 'art' ? '100%' : '0%'} chance):`, preferredType);

    // Generate suggestion based on theme type
    let suggestion = null;

    if (preferredType === 'art') {
      // Try to generate art suggestion first
      const artTheme = await analyzeNoteForTheme(note, 'art');

      if (artTheme) {
        suggestion = await createArtSuggestion(artTheme);

        // If art suggestion failed (artwork not found), fall back to quote
        if (!suggestion) {
          console.log('[MediaSuggestions] Art not found, falling back to quote');
          const quoteTheme = await analyzeNoteForTheme(note, 'quote');
          if (quoteTheme) {
            suggestion = createQuoteSuggestion(quoteTheme);
          }
        }
      }
    } else {
      // Generate quote suggestion
      const quoteTheme = await analyzeNoteForTheme(note, 'quote');
      if (quoteTheme) {
        suggestion = createQuoteSuggestion(quoteTheme);
      }
    }

    if (suggestion) {
      // Mark this note as having a suggestion
      tracker[note.id] = true;
      await saveSuggestionsTracker(tracker);

      // Add noteId and timestamp to suggestion for tracking
      suggestion.noteId = note.id;
      suggestion.createdAt = Date.now();

      // Persist the suggestion
      await addSuggestionToPersisted(suggestion);

      console.log('[MediaSuggestions] Generated and persisted suggestion for note');
    } else {
      console.log('[MediaSuggestions] Failed to generate any suggestion');
    }

    return suggestion;
  } catch (error) {
    console.error('[MediaSuggestions] Error generating suggestion:', error);
    return null;
  }
}

/**
 * Generate media suggestions based on recent notes (legacy function for existing notes)
 * @param {Array} notes - Array of note objects
 * @returns {Promise<Array>} Array of suggestion objects (all persisted suggestions)
 */
export async function generateSuggestions(notes) {
  if (!notes || notes.length === 0) {
    console.log('[MediaSuggestions] No notes to analyze');
    return await loadPersistedSuggestions();
  }

  try {
    const tracker = await getSuggestionsTracker();

    // Get notes that don't have suggestions yet
    const notesWithoutSuggestions = notes.filter(note => !tracker[note.id]);

    if (notesWithoutSuggestions.length > 0) {
      console.log(`[MediaSuggestions] ${notesWithoutSuggestions.length} notes without suggestions`);

      // Generate one suggestion for the most recent note without one
      const mostRecentNote = notesWithoutSuggestions
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];

      await generateSuggestionForNote(mostRecentNote);
    } else {
      console.log('[MediaSuggestions] All notes already have suggestions');
    }

    // Return all persisted suggestions (limited to 10 most recent)
    return await loadPersistedSuggestions();
  } catch (error) {
    console.error('[MediaSuggestions] Error generating suggestions:', error);
    return await loadPersistedSuggestions();
  }
}

/**
 * Analyze a single note with LLM to extract ONE theme
 * @param {Object} note - Note object
 * @param {string} preferredType - Preferred suggestion type ('art' or 'quote')
 * @returns {Promise<Object|null>} Theme object or null
 */
async function analyzeNoteForTheme(note, preferredType = 'art') {
  try {
    const isArt = preferredType === 'art';

    const prompt = isArt
      ? `Analyze this journal entry and identify ONE core theme or emotion.
Based on this theme, suggest a SPECIFIC piece of artwork from art history.

Journal entry:
${note.content}

Return ONLY valid JSON with this structure (no markdown, no explanation):
{
  "type": "art",
  "theme": "theme name",
  "artworkTitle": "exact title of the artwork",
  "artistName": "full name of the artist",
  "context": "In 1-2 sentences, explain how this artwork resonates with what you wrote about. Write directly to the reader using 'you' and 'your'."
}

Important:
- Choose a REAL, well-known artwork with its exact title
- The context should be personal and direct to the reader, avoiding phrases like "aligning with the journal entry"
- Example: "This painting captures the sense of solitude you described in your reflections on quiet moments."`
      : `Analyze this journal entry and identify ONE core theme or emotion.
Based on this theme, suggest a meaningful quote from literature, philosophy, or a notable figure.

Journal entry:
${note.content}

Return ONLY valid JSON with this structure (no markdown, no explanation):
{
  "type": "quote",
  "theme": "theme name",
  "quote": "the full quote text",
  "author": "author name",
  "context": "In 1-2 sentences, explain how this quote resonates with what you wrote about. Write directly to the reader using 'you' and 'your'."
}

Important:
- The context should be personal and direct to the reader, avoiding phrases like "aligning with the journal entry"
- Example: "This quote reflects the struggle with change you mentioned in your writing."`;

    const result = await callLLM({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a thoughtful literary and art curator who finds meaningful connections between personal reflections and cultural works. Always respond with valid JSON only. Make your explanations personal and direct to the reader.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      maxTokens: 500,
    });

    if (!result.success || !result.data) {
      console.error('[MediaSuggestions] LLM call failed:', result.error);
      return null;
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

    if (!parsed.type || (parsed.type !== 'art' && parsed.type !== 'quote')) {
      console.error('[MediaSuggestions] Invalid response format');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[MediaSuggestions] Error analyzing note:', error);
    return null;
  }
}

/**
 * Create an art suggestion with cached image
 * @param {Object} theme - Theme object from LLM (with artworkTitle and artistName)
 * @returns {Promise<Object|null>} Art suggestion or null
 */
async function createArtSuggestion(theme) {
  try {
    if (!theme.artworkTitle || !theme.artistName) {
      console.error('[MediaSuggestions] Missing artworkTitle or artistName in theme');
      return null;
    }

    console.log('[MediaSuggestions] Finding specific artwork:', theme.artworkTitle, 'by', theme.artistName);

    // Find specific artwork from Met Museum by title and artist
    const artwork = await findSpecificArtwork(theme.artworkTitle, theme.artistName);

    if (!artwork || !artwork.imageUrl) {
      console.log('[MediaSuggestions] Artwork not found:', theme.artworkTitle);
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

