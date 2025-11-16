/**
 * Chat Utility Functions
 * Helper functions for building chat messages with note context
 */

/**
 * Build messages array for OpenAI API call with note context
 * @param {string} title - Note title
 * @param {string} content - Note content
 * @param {Array} previousMessages - Previous chat messages (optional)
 * @param {string} currentUserMessage - Current user message
 * @returns {Array} Messages array formatted for OpenAI API
 */
export function buildChatMessages(title, content, previousMessages = [], currentUserMessage) {
  const systemMessage = {
    role: 'system',
    content: `You are a helpful assistant helping the user reflect on their note. Here is their note:\n\nTitle: ${title}\n\nContent:\n${content}\n\nHelp them explore their thoughts, ask thoughtful questions, and provide insights.`
  };

  const messages = [systemMessage];

  // Add previous conversation history
  if (previousMessages && previousMessages.length > 0) {
    messages.push(...previousMessages);
  }

  // Add current user message
  if (currentUserMessage) {
    messages.push({
      role: 'user',
      content: currentUserMessage
    });
  }

  return messages;
}

/**
 * Get default chat model for cost efficiency
 * @returns {string} Model name
 */
export function getDefaultChatModel() {
  return 'gpt-4o-mini';
}

/**
 * Get default max tokens for chat responses
 * @returns {number} Max tokens
 */
export function getDefaultMaxTokens() {
  return 500;
}

/**
 * Get default temperature for chat
 * @returns {number} Temperature
 */
export function getDefaultTemperature() {
  return 0.7;
}

