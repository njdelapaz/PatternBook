/**
 * Summary Orchestration Utility
 * Centralizes summary generation logic for all entry points
 */

import { buildSecurePrompt, sanitizeInput, MAX_INPUT_LENGTHS } from './llmGuardrails';
import { generateTextSummary } from './textSummarization';
import { callLLM } from '../services/llmService';
import { saveNotes } from './storage';

// Summary prompt template
const SUMMARY_TEMPLATE = `You are a helpful assistant that creates concise, clear summaries. Keep summaries under 50 words and capture the main point.

Please summarize this note in 1-2 sentences:

{{content}}`;

/**
 * Generate AI summary for note content
 * Applies security guardrails: sanitization, PII detection, length validation
 * Uses text-based fallback when AI API fails (after retries with exponential backoff)
 * @param {string} content - Note content to summarize
 * @returns {Promise<string>} Generated summary
 */
async function generateSummary(content) {
  try {
    // Sanitize content with guardrails
    const contentSanitized = sanitizeInput(content || '', {
      maxLength: MAX_INPUT_LENGTHS.summary,
      sanitizePII: true,
      sanitizeInjection: true,
      truncate: true, // Truncate if too long
    });

    if (!contentSanitized.isValid) {
      // If validation fails, use text-based fallback
      return generateTextSummary(content);
    }

    // Build secure prompt using template
    const promptResult = buildSecurePrompt(SUMMARY_TEMPLATE, {
      content: contentSanitized.sanitized,
    }, {
      maxLength: MAX_INPUT_LENGTHS.summary,
      sanitizePII: true,
      sanitizeInjection: true,
    });

    if (!promptResult.isValid) {
      // Fallback if prompt building fails
      return generateTextSummary(contentSanitized.sanitized);
    }

    // Use callLLM service (includes retry logic with exponential backoff)
    const result = await callLLM({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, clear summaries. Keep summaries under 50 words and capture the main point.',
        },
        {
          role: 'user',
          content: `Please summarize this note in 1-2 sentences:\n\n${promptResult.prompt}`,
        },
      ],
      temperature: 0.7,
      maxTokens: 100,
    });

    // If API call succeeded, return AI-generated summary
    if (result.success && result.data && result.data.content) {
      const aiSummary = result.data.content.trim();
      if (aiSummary.length > 0) {
        return aiSummary;
      }
    }

    // API failed after retries - use text-based fallback
    // This handles: rate limits, network errors, API errors, quota exceeded, etc.
    return generateTextSummary(contentSanitized.sanitized);
  } catch (error) {
    // Unexpected error - use text-based fallback
    // Silently handle error (no user-facing messages as per requirements)
    return generateTextSummary(content);
  }
}

/**
 * Create or update a note with summary generation
 * Centralized function for all note creation/update entry points
 * @param {Object} noteData - Note data (id, title, content, etc.)
 * @param {Array} notes - Current notes array
 * @param {Function} setNotes - State setter for notes
 * @param {Object} options - Options { skipSummary: boolean, immediateSummary: boolean }
 * @returns {Promise<Object>} Updated note with summary
 */
export async function createOrUpdateNoteWithSummary(noteData, notes, setNotes, options = {}) {
  const { skipSummary = false, immediateSummary = false } = options;
  
  // Create note object with initial summary placeholder if needed
  const newNote = {
    ...noteData,
    summary: immediateSummary ? 'Generating summary...' : undefined,
    aiSummary: undefined,
  };

  // Add/update note immediately
  const noteExists = notes.find(n => n.id === noteData.id);
  const updatedNotes = noteExists
    ? notes.map(n => (n.id === noteData.id ? { ...n, ...newNote } : n))
    : [newNote, ...notes];
  
  setNotes(updatedNotes);
  await saveNotes(updatedNotes);

  // Generate summary asynchronously if not skipped
  if (!skipSummary) {
    try {
      const summary = await generateSummary(noteData.content);
      const noteWithSummary = { ...newNote, summary, aiSummary: summary };
      const notesWithSummary = updatedNotes.map(note =>
        note.id === noteData.id ? noteWithSummary : (note.id === newNote.id ? noteWithSummary : note)
      );
      setNotes(notesWithSummary);
      await saveNotes(notesWithSummary);
      return noteWithSummary;
    } catch (error) {
      // Silently handle error - use text-based fallback
      const fallbackSummary = generateTextSummary(noteData.content);
      const noteWithError = { ...newNote, summary: fallbackSummary, aiSummary: fallbackSummary };
      const notesWithError = updatedNotes.map(note =>
        note.id === noteData.id ? noteWithError : (note.id === newNote.id ? noteWithError : note)
      );
      setNotes(notesWithError);
      await saveNotes(notesWithError);
      return noteWithError;
    }
  }

  return newNote;
}

/**
 * Update note summary when content changes
 * @param {string} noteId - Note ID
 * @param {string} content - New content
 * @param {Array} notes - Current notes array
 * @param {Function} setNotes - State setter for notes
 * @returns {Promise<void>}
 */
export async function updateNoteSummary(noteId, content, notes, setNotes) {
  const currentNote = notes.find(note => note.id === noteId);
  if (!currentNote) return;

  const contentChanged = currentNote.content !== content;
  
  if (!contentChanged) {
    return; // No need to regenerate summary
  }

  // Show "Updating summary..." placeholder
  const updatedNotes = notes.map((note) =>
    note.id === noteId
      ? { ...note, content, summary: 'Updating summary...', updatedAt: Date.now() }
      : note
  );
  setNotes(updatedNotes);
  await saveNotes(updatedNotes);

  try {
    const newSummary = await generateSummary(content);
    const finalNotes = notes.map((note) =>
      note.id === noteId
        ? { ...note, content, summary: newSummary, aiSummary: newSummary, updatedAt: Date.now() }
        : note
    );
    setNotes(finalNotes);
    await saveNotes(finalNotes);
  } catch (error) {
    console.error('Error updating summary:', error);
    // Fallback to truncated content
    const fallbackSummary = content.slice(0, 100) + (content.length > 100 ? '...' : '');
    const notesWithFallback = notes.map((note) =>
      note.id === noteId
        ? { ...note, content, summary: fallbackSummary, aiSummary: fallbackSummary, updatedAt: Date.now() }
        : note
    );
    setNotes(notesWithFallback);
    await saveNotes(notesWithFallback);
  }
}


