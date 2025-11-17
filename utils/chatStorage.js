/**
 * Chat Storage
 * Manages persistence of chat histories for per-note and global chats
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_HISTORY_KEY = '@patternbook_chat_history';
const GLOBAL_CHAT_ID = 'global';

/**
 * Load all chat histories from storage
 * @returns {Promise<Object>} Chat histories object
 */
export async function loadChatHistories() {
  try {
    const json = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.error('[ChatStorage] Error loading chat histories:', error);
    return {};
  }
}

/**
 * Save all chat histories to storage
 * @param {Object} histories - Chat histories object
 * @returns {Promise<void>}
 */
export async function saveChatHistories(histories) {
  try {
    await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(histories));
  } catch (error) {
    console.error('[ChatStorage] Error saving chat histories:', error);
  }
}

/**
 * Load chat history for a specific note or global chat
 * @param {string} noteId - Note ID or 'global' for global chat
 * @returns {Promise<Array>} Array of chat messages
 */
export async function loadChatHistory(noteId) {
  const histories = await loadChatHistories();
  return histories[noteId] || [];
}

/**
 * Save chat history for a specific note or global chat
 * @param {string} noteId - Note ID or 'global' for global chat
 * @param {Array} messages - Array of chat messages
 * @returns {Promise<void>}
 */
export async function saveChatHistory(noteId, messages) {
  const histories = await loadChatHistories();
  histories[noteId] = messages;
  await saveChatHistories(histories);
}

/**
 * Append a message to a chat history
 * @param {string} noteId - Note ID or 'global' for global chat
 * @param {Object} message - Message object {role, content, timestamp, ...}
 * @returns {Promise<Array>} Updated chat history
 */
export async function appendChatMessage(noteId, message) {
  const history = await loadChatHistory(noteId);
  const updatedHistory = [...history, message];
  await saveChatHistory(noteId, updatedHistory);
  return updatedHistory;
}

/**
 * Clear chat history for a specific note or global chat
 * @param {string} noteId - Note ID or 'global' for global chat
 * @returns {Promise<void>}
 */
export async function clearChatHistory(noteId) {
  const histories = await loadChatHistories();
  delete histories[noteId];
  await saveChatHistories(histories);
}

/**
 * Delete chat history for a specific note (when note is deleted)
 * @param {string} noteId - Note ID
 * @returns {Promise<void>}
 */
export async function deleteChatHistory(noteId) {
  await clearChatHistory(noteId);
}

/**
 * Get global chat history
 * @returns {Promise<Array>} Array of chat messages
 */
export async function loadGlobalChatHistory() {
  return loadChatHistory(GLOBAL_CHAT_ID);
}

/**
 * Save global chat history
 * @param {Array} messages - Array of chat messages
 * @returns {Promise<void>}
 */
export async function saveGlobalChatHistory(messages) {
  await saveChatHistory(GLOBAL_CHAT_ID, messages);
}

/**
 * Append a message to global chat history
 * @param {Object} message - Message object
 * @returns {Promise<Array>} Updated chat history
 */
export async function appendGlobalChatMessage(message) {
  return appendChatMessage(GLOBAL_CHAT_ID, message);
}

/**
 * Clear global chat history
 * @returns {Promise<void>}
 */
export async function clearGlobalChatHistory() {
  await clearChatHistory(GLOBAL_CHAT_ID);
}

/**
 * Prune old messages from a chat history to keep it manageable
 * Keeps the most recent N messages
 * @param {string} noteId - Note ID or 'global'
 * @param {number} maxMessages - Maximum number of messages to keep
 * @returns {Promise<void>}
 */
export async function pruneOldMessages(noteId, maxMessages = 50) {
  const history = await loadChatHistory(noteId);
  
  if (history.length > maxMessages) {
    const pruned = history.slice(-maxMessages);
    await saveChatHistory(noteId, pruned);
  }
}

/**
 * Get all chat history IDs (for cleanup when notes are deleted)
 * @returns {Promise<Array>} Array of note IDs that have chat histories
 */
export async function getAllChatHistoryIds() {
  const histories = await loadChatHistories();
  return Object.keys(histories);
}

/**
 * Clear all chat histories (for settings/reset)
 * @returns {Promise<void>}
 */
export async function clearAllChatHistories() {
  try {
    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (error) {
    console.error('[ChatStorage] Error clearing all chat histories:', error);
  }
}

/**
 * Get storage statistics
 * @returns {Promise<Object>} Statistics about chat storage
 */
export async function getChatStorageStats() {
  const histories = await loadChatHistories();
  const ids = Object.keys(histories);
  
  let totalMessages = 0;
  let globalMessages = 0;
  
  for (const id of ids) {
    const count = histories[id].length;
    totalMessages += count;
    
    if (id === GLOBAL_CHAT_ID) {
      globalMessages = count;
    }
  }
  
  return {
    totalConversations: ids.length,
    totalMessages,
    globalMessages,
    noteConversations: ids.length - (histories[GLOBAL_CHAT_ID] ? 1 : 0),
  };
}

export { GLOBAL_CHAT_ID };

