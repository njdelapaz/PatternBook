/**
 * Token Estimator
 * Provides functions to estimate token counts for text
 * Uses the approximation: ~4 characters = 1 token (conservative for English text)
 */

/**
 * Estimate token count for a string
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
export function estimateTokens(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  
  // Conservative estimate: ~4 characters per token
  // This accounts for typical English text with whitespace
  return Math.ceil(text.length / 4);
}

/**
 * Estimate token count for an array of messages
 * @param {Array} messages - Array of message objects with content
 * @returns {number} Estimated total token count
 */
export function estimateMessagesTokens(messages) {
  if (!Array.isArray(messages)) {
    return 0;
  }
  
  let total = 0;
  for (const message of messages) {
    // Count content tokens
    if (message.content) {
      total += estimateTokens(message.content);
    }
    // Add overhead for role and structure (~4 tokens per message)
    total += 4;
  }
  
  return total;
}

/**
 * Truncate text to fit within a token budget
 * @param {string} text - Text to truncate
 * @param {number} maxTokens - Maximum token budget
 * @returns {string} Truncated text
 */
export function truncateToTokens(text, maxTokens) {
  if (!text || maxTokens <= 0) {
    return '';
  }
  
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  // Calculate character budget (tokens * 4)
  const charBudget = maxTokens * 4;
  
  // Truncate and add ellipsis
  if (charBudget > 3) {
    return text.slice(0, charBudget - 3) + '...';
  }
  
  return text.slice(0, charBudget);
}

/**
 * Truncate messages to fit within a token budget
 * Keeps the first message (system) and most recent messages
 * @param {Array} messages - Array of message objects
 * @param {number} maxTokens - Maximum token budget
 * @returns {Array} Truncated messages array
 */
export function truncateMessages(messages, maxTokens) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }
  
  const totalTokens = estimateMessagesTokens(messages);
  
  if (totalTokens <= maxTokens) {
    return messages;
  }
  
  // Always keep the first message (usually system prompt)
  const result = [messages[0]];
  let currentTokens = estimateMessagesTokens([messages[0]]);
  
  // Add messages from the end (most recent) until we hit the budget
  for (let i = messages.length - 1; i > 0; i--) {
    const messageTokens = estimateTokens(messages[i].content) + 4;
    
    if (currentTokens + messageTokens <= maxTokens) {
      result.splice(1, 0, messages[i]); // Insert after first message
      currentTokens += messageTokens;
    } else {
      break;
    }
  }
  
  return result;
}

/**
 * Token budget configuration for different contexts
 */
export const TOKEN_BUDGETS = {
  SYSTEM_PROMPT: 200,
  RETRIEVED_CONTEXT: 1500,
  CHAT_HISTORY: 1000,
  USER_MESSAGE: 100,
  RESPONSE_RESERVE: 500,
  TOTAL_INPUT: 2800, // Conservative limit for gpt-4o-mini
};

