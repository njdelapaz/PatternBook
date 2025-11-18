/**
 * Context Builder
 * Builds LLM prompts with retrieved note context and chat history
 * Manages token limits intelligently
 */

import { estimateTokens, estimateMessagesTokens, truncateToTokens, truncateMessages, TOKEN_BUDGETS } from './tokenEstimator';
import { getChunkPreview } from './noteChunking';

/**
 * Build system prompt for chat with retrieval context
 * @param {Array} retrievedChunks - Array of retrieved note chunks
 * @param {boolean} isGlobalChat - Whether this is global chat or note-specific
 * @param {string} currentNoteTitle - Title of current note (for note-specific chat)
 * @returns {string} System prompt
 */
function buildSystemPrompt(retrievedChunks, isGlobalChat, currentNoteTitle = null) {
  let prompt = '';

  // Core role and guidelines
  if (isGlobalChat) {
    prompt = `You are a practical companion supporting the user in their growth and progress. You have access to their notes to help them find clarity, connections, and actionable next steps.

RESPONSE GUIDELINES:

Communication Style:
- Use casual, natural language—simple and calm
- Be direct; skip unnecessary validation or emotional mirroring
- Keep responses brief unless depth is explicitly requested
- Use markdown for clarity when helpful

Core Principles:
- Stay grounded, practical, and focused on what tangibly helps
- Approach with curiosity—identify assumptions, gaps, or blind spots
- Ask at most one question per response; avoid "why" questions; prefer exploratory or clarifying ones
- Remain neutral in conflicts; consider all perspectives fairly
- Match emotional intensity to real significance

Behavioral Rules:
- When user vents, allow space first, then gently explore underlying hopes, fears, or needs
- Emphasize healthy fundamentals when relevant (sleep, exercise, diet, reflection, communication)
- Help identify what kind of assistance they actually want (information, emotional space, problem-solving, action steps)

Guiding Beliefs:
- Taking action generates clarity and information
- Attention shapes experience and outcomes
- Emotions contain meaningful signals worth acknowledging
- Curiosity is more productive than simple validation
- Questions can be more powerful than direct answers`;
  } else {
    prompt = `You are a practical companion helping the user reflect on their note titled "${currentNoteTitle}". You have access to their related notes for context.

Apply the same guidelines: stay grounded, curious, and focused on forward movement. Be brief, direct, and helpful rather than validating or verbose.`;
  }

  // Add retrieved context if available
  if (retrievedChunks && retrievedChunks.length > 0) {
    prompt += `\n\nRelevant notes for context:\n\n`;

    for (const chunk of retrievedChunks) {
      prompt += `[Note: "${chunk.noteTitle}"]\n${chunk.text}\n\n`;
    }

    prompt += `Use these notes to provide practical insights and connections.`;
  }

  return prompt;
}

/**
 * Format retrieved chunks for display in UI
 * @param {Array} retrievedChunks - Array of retrieved note chunks
 * @returns {Array} Array of note references for UI
 */
export function formatRetrievedNotesForUI(retrievedChunks) {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return [];
  }
  
  // Group chunks by note
  const noteMap = new Map();
  
  for (const chunk of retrievedChunks) {
    if (!noteMap.has(chunk.noteId)) {
      noteMap.set(chunk.noteId, {
        noteId: chunk.noteId,
        noteTitle: chunk.noteTitle,
        chunks: [],
      });
    }
    
    noteMap.get(chunk.noteId).chunks.push({
      text: chunk.text,
      preview: getChunkPreview(chunk.text, 80),
      score: chunk.score,
    });
  }
  
  return Array.from(noteMap.values());
}

/**
 * Build complete message array for LLM with RAG context
 * @param {Object} options - Build options
 * @param {string} options.userMessage - Current user message
 * @param {Array} options.retrievedChunks - Retrieved note chunks
 * @param {Array} options.chatHistory - Previous chat messages
 * @param {boolean} options.isGlobalChat - Whether this is global chat
 * @param {string} options.currentNoteTitle - Current note title (for note chat)
 * @param {string} options.currentNoteContent - Current note content (for note chat)
 * @returns {Object} Result with messages array and metadata
 */
export function buildChatContext(options) {
  const {
    userMessage,
    retrievedChunks = [],
    chatHistory = [],
    isGlobalChat = false,
    currentNoteTitle = null,
    currentNoteContent = null,
  } = options;
  
  if (!userMessage) {
    throw new Error('userMessage is required');
  }
  
  // Build system prompt with retrieved context
  let systemPrompt = buildSystemPrompt(retrievedChunks, isGlobalChat, currentNoteTitle);
  
  // For note-specific chat, include the current note content in system prompt
  if (!isGlobalChat && currentNoteContent) {
    const contentPreview = truncateToTokens(currentNoteContent, TOKEN_BUDGETS.RETRIEVED_CONTEXT / 2);
    systemPrompt += `\n\n[Current Note Content]\n${contentPreview}`;
  }
  
  // Estimate token usage
  const systemTokens = estimateTokens(systemPrompt);
  const userMessageTokens = estimateTokens(userMessage);
  const historyTokens = estimateMessagesTokens(chatHistory);
  
  // Calculate remaining budget for chat history
  const usedTokens = systemTokens + userMessageTokens;
  const remainingForHistory = TOKEN_BUDGETS.TOTAL_INPUT - usedTokens - TOKEN_BUDGETS.RESPONSE_RESERVE;
  
  // Truncate chat history if needed
  let adjustedHistory = chatHistory;
  if (historyTokens > remainingForHistory) {
    adjustedHistory = truncateMessages(chatHistory, remainingForHistory);
  }
  
  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt },
    ...adjustedHistory,
    { role: 'user', content: userMessage },
  ];
  
  // Calculate final token estimate
  const totalTokens = estimateMessagesTokens(messages);
  
  return {
    messages,
    metadata: {
      systemTokens,
      historyTokens: estimateMessagesTokens(adjustedHistory),
      userMessageTokens,
      totalTokens,
      retrievedChunkCount: retrievedChunks.length,
      historyTruncated: adjustedHistory.length < chatHistory.length,
      retrievedNotes: formatRetrievedNotesForUI(retrievedChunks),
    },
  };
}

/**
 * Build context for note-specific chat
 * @param {Object} note - Current note object
 * @param {string} userMessage - User's message
 * @param {Array} chatHistory - Chat history
 * @param {Array} retrievedChunks - Retrieved chunks from other notes
 * @returns {Object} Context with messages and metadata
 */
export function buildNoteChatContext(note, userMessage, chatHistory, retrievedChunks) {
  return buildChatContext({
    userMessage,
    retrievedChunks,
    chatHistory,
    isGlobalChat: false,
    currentNoteTitle: note.title,
    currentNoteContent: note.content,
  });
}

/**
 * Build context for global chat
 * @param {string} userMessage - User's message
 * @param {Array} chatHistory - Chat history
 * @param {Array} retrievedChunks - Retrieved chunks from notes
 * @returns {Object} Context with messages and metadata
 */
export function buildGlobalChatContext(userMessage, chatHistory, retrievedChunks) {
  return buildChatContext({
    userMessage,
    retrievedChunks,
    chatHistory,
    isGlobalChat: true,
  });
}

/**
 * Check if context is within token budget
 * @param {Array} messages - Messages array
 * @returns {Object} Budget check result
 */
export function checkTokenBudget(messages) {
  const totalTokens = estimateMessagesTokens(messages);
  const isWithinBudget = totalTokens <= TOKEN_BUDGETS.TOTAL_INPUT;
  
  return {
    totalTokens,
    budgetLimit: TOKEN_BUDGETS.TOTAL_INPUT,
    isWithinBudget,
    percentUsed: Math.round((totalTokens / TOKEN_BUDGETS.TOTAL_INPUT) * 100),
  };
}

