/**
 * Chat Storage
 * Manages persistence of chat histories for per-note and global chats
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_HISTORY_KEY = '@patternbook_chat_history';
const GLOBAL_CHAT_ID = 'global';

/**
 * Get the storage key for a user's chat histories
 * @param {string} userId - User ID (if null, uses global key for backwards compatibility)
 * @returns {string} Storage key
 */
function getUserChatKey(userId) {
  return userId ? `${CHAT_HISTORY_KEY}_${userId}` : CHAT_HISTORY_KEY;
}

/**
 * Load all chat histories from storage
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Object>} Chat histories object
 */
export async function loadChatHistories(userId = null) {
  try {
    const storageKey = getUserChatKey(userId);
    const json = await AsyncStorage.getItem(storageKey);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.error('[ChatStorage] Error loading chat histories:', error);
    return {};
  }
}

/**
 * Save all chat histories to storage
 * @param {Object} histories - Chat histories object
 * @param {string} userId - User ID (optional)
 * @returns {Promise<void>}
 */
export async function saveChatHistories(histories, userId = null) {
  try {
    const storageKey = getUserChatKey(userId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(histories));
  } catch (error) {
    console.error('[ChatStorage] Error saving chat histories:', error);
  }
}

/**
 * Load chat history for a specific note or global chat
 * @param {string} noteId - Note ID or 'global' for global chat
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Array>} Array of chat messages
 */
export async function loadChatHistory(noteId, userId = null) {
  const histories = await loadChatHistories(userId);
  return histories[noteId] || [];
}

/**
 * Save chat history for a specific note or global chat
 * @param {string} noteId - Note ID or 'global' for global chat
 * @param {Array} messages - Array of chat messages
 * @param {string} userId - User ID (optional)
 * @returns {Promise<void>}
 */
export async function saveChatHistory(noteId, messages, userId = null) {
  const histories = await loadChatHistories(userId);
  histories[noteId] = messages;
  await saveChatHistories(histories, userId);
}

/**
 * Append a message to a chat history
 * @param {string} noteId - Note ID or 'global' for global chat
 * @param {Object} message - Message object {role, content, timestamp, ...}
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Array>} Updated chat history
 */
export async function appendChatMessage(noteId, message, userId = null) {
  const history = await loadChatHistory(noteId, userId);
  const updatedHistory = [...history, message];
  await saveChatHistory(noteId, updatedHistory, userId);
  return updatedHistory;
}

/**
 * Clear chat history for a specific note or global chat
 * @param {string} noteId - Note ID or 'global' for global chat
 * @param {string} userId - User ID (optional)
 * @returns {Promise<void>}
 */
export async function clearChatHistory(noteId, userId = null) {
  const histories = await loadChatHistories(userId);
  delete histories[noteId];
  await saveChatHistories(histories, userId);
}

/**
 * Delete chat history for a specific note (when note is deleted)
 * @param {string} noteId - Note ID
 * @param {string} userId - User ID (optional)
 * @returns {Promise<void>}
 */
export async function deleteChatHistory(noteId, userId = null) {
  await clearChatHistory(noteId, userId);
}

/**
 * Get global chat history
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Array>} Array of chat messages
 */
export async function loadGlobalChatHistory(userId = null) {
  return loadChatHistory(GLOBAL_CHAT_ID, userId);
}

/**
 * Save global chat history
 * @param {Array} messages - Array of chat messages
 * @param {string} userId - User ID (optional)
 * @returns {Promise<void>}
 */
export async function saveGlobalChatHistory(messages, userId = null) {
  await saveChatHistory(GLOBAL_CHAT_ID, messages, userId);
}

/**
 * Append a message to global chat history
 * @param {Object} message - Message object
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Array>} Updated chat history
 */
export async function appendGlobalChatMessage(message, userId = null) {
  return appendChatMessage(GLOBAL_CHAT_ID, message, userId);
}

/**
 * Clear global chat history
 * @param {string} userId - User ID (optional)
 * @returns {Promise<void>}
 */
export async function clearGlobalChatHistory(userId = null) {
  await clearChatHistory(GLOBAL_CHAT_ID, userId);
}

/**
 * Prune old messages from a chat history to keep it manageable
 * Keeps the most recent N messages
 * @param {string} noteId - Note ID or 'global'
 * @param {number} maxMessages - Maximum number of messages to keep
 * @param {string} userId - User ID (optional)
 * @returns {Promise<void>}
 */
export async function pruneOldMessages(noteId, maxMessages = 50, userId = null) {
  const history = await loadChatHistory(noteId, userId);
  
  if (history.length > maxMessages) {
    const pruned = history.slice(-maxMessages);
    await saveChatHistory(noteId, pruned, userId);
  }
}

/**
 * Get all chat history IDs (for cleanup when notes are deleted)
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Array>} Array of note IDs that have chat histories
 */
export async function getAllChatHistoryIds(userId = null) {
  const histories = await loadChatHistories(userId);
  return Object.keys(histories);
}

/**
 * Clear all chat histories (for settings/reset)
 * @param {string} userId - User ID (optional)
 * @returns {Promise<void>}
 */
export async function clearAllChatHistories(userId = null) {
  try {
    const storageKey = getUserChatKey(userId);
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.error('[ChatStorage] Error clearing all chat histories:', error);
  }
}

/**
 * Get storage statistics
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Object>} Statistics about chat storage
 */
export async function getChatStorageStats(userId = null) {
  const histories = await loadChatHistories(userId);
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

