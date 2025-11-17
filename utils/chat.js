/**
 * Chat Utility Functions
 * Helper functions for building chat messages with note context
 * Includes security guardrails: prompt templates, sanitization, PII detection
 */

import { buildSecurePrompt, sanitizeInput, MAX_INPUT_LENGTHS } from './llmGuardrails';

// Chat prompt template
const CHAT_SYSTEM_TEMPLATE = `You are a helpful assistant helping the user reflect on their note. Here is their note:

Title: {{title}}

Content:
{{content}}

Help them explore their thoughts, ask thoughtful questions, and provide insights.`;

/**
 * Build messages array for OpenAI API call with note context
 * Applies security guardrails: sanitization, PII detection, length validation
 * @param {string} title - Note title
 * @param {string} content - Note content
 * @param {Array} previousMessages - Previous chat messages (optional)
 * @param {string} currentUserMessage - Current user message
 * @returns {Object} Result with messages array and sanitization metadata
 */
export function buildChatMessages(title, content, previousMessages = [], currentUserMessage) {
  // Sanitize note content and title
  const titleSanitized = sanitizeInput(title || '', {
    maxLength: 200,
    sanitizePII: true,
    sanitizeInjection: true,
  });
  
  const contentSanitized = sanitizeInput(content || '', {
    maxLength: MAX_INPUT_LENGTHS.chat,
    sanitizePII: true,
    sanitizeInjection: true,
    truncate: true, // Truncate if too long
  });

  // Build system message using secure prompt template
  let systemPromptResult = buildSecurePrompt(CHAT_SYSTEM_TEMPLATE, {
    title: titleSanitized.sanitized,
    content: contentSanitized.sanitized,
  }, {
    maxLength: MAX_INPUT_LENGTHS.chat,
    sanitizePII: true,
    sanitizeInjection: true,
    truncate: true, // Allow truncation for system prompt
  });

  if (!systemPromptResult.isValid) {
    // If prompt building fails, use a minimal fallback with truncated content
    const fallbackContent = contentSanitized.sanitized.slice(0, 500);
    systemPromptResult = buildSecurePrompt(CHAT_SYSTEM_TEMPLATE, {
      title: titleSanitized.sanitized,
      content: fallbackContent,
    }, {
      maxLength: MAX_INPUT_LENGTHS.chat,
      sanitizePII: true,
      sanitizeInjection: true,
      truncate: true,
    });
    
    if (!systemPromptResult.isValid) {
      throw new Error(`Failed to build secure system prompt: ${systemPromptResult.error}`);
    }
  }

  const systemMessage = {
    role: 'system',
    content: systemPromptResult.prompt
  };

  const messages = [systemMessage];
  const warnings = [...(systemPromptResult.warnings || [])];

  // Sanitize previous conversation history
  if (previousMessages && previousMessages.length > 0) {
    const sanitizedHistory = previousMessages.map(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        const sanitized = sanitizeInput(msg.content || '', {
          maxLength: MAX_INPUT_LENGTHS.chat,
          sanitizePII: true,
          sanitizeInjection: true,
          truncate: true,
        });
        
        if (sanitized.warnings && sanitized.warnings.length > 0) {
          warnings.push(...sanitized.warnings);
        }
        
        return {
          role: msg.role,
          content: sanitized.sanitized
        };
      }
      return msg;
    });
    
    messages.push(...sanitizedHistory);
  }

  // Sanitize current user message
  if (currentUserMessage) {
    const userMessageSanitized = sanitizeInput(currentUserMessage, {
      maxLength: MAX_INPUT_LENGTHS.chat,
      sanitizePII: true,
      sanitizeInjection: true,
      truncate: true,
    });
    
    if (!userMessageSanitized.isValid) {
      throw new Error(`User message validation failed: ${userMessageSanitized.error}`);
    }
    
    if (userMessageSanitized.warnings && userMessageSanitized.warnings.length > 0) {
      warnings.push(...userMessageSanitized.warnings);
    }
    
    messages.push({
      role: 'user',
      content: userMessageSanitized.sanitized
    });
  }

  return {
    messages,
    warnings,
    detectedPII: [
      ...(titleSanitized.detectedPII || []),
      ...(contentSanitized.detectedPII || []),
      ...(systemPromptResult.detectedPII || []),
    ],
  };
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

