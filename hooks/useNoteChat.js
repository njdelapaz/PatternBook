import { useState } from 'react';
import { buildChatMessages, getDefaultChatModel, getDefaultMaxTokens, getDefaultTemperature } from '../utils/chat';
import { callLLM } from '../services/llmService';

// Canned chat responses for demo - organized by note content (development only)
// Note: These are only used as fallback if API fails
const CHAT_RESPONSES = __DEV__ ? {
  // For the "dream library" note (first voice recording)
  dream: [
    "That's a fascinating dream! The library of altered memories sounds like your subconscious exploring the malleability of memory. What do you think triggered this dream?",
    "It's interesting how dreams can reveal our deeper thoughts about identity and truth. The fact that each book was slightly different suggests you might be processing how perspective shapes our past.",
    "This reminds me of the concept of 'memory reconsolidation' - each time we recall something, we actually change it slightly. Your dream seems to be grappling with that very idea."
  ],
  // For the "productivity" note (second voice recording and beyond)
  productivity: [
    "That's a really mature insight about productivity culture. What do you think would help you shift from quantity to quality in practice?",
    "It sounds like you're recognizing the difference between being busy and being purposeful. Have you thought about what 'intentional' looks like for you specifically?",
    "This is such an important realization. Measuring worth by accomplishments can be exhausting. What would it look like to measure your worth differently?"
  ]
} : null;

/**
 * Handle fallback response when API fails
 * @param {string} content - Note content to determine response type
 * @param {number} chatMessageCount - Current message count for cycling responses
 * @param {Function} setChatMessages - State setter for chat messages
 * @param {Function} setChatMessageCount - State setter for message count
 * @returns {boolean} True if fallback was used, false otherwise
 */
function handleFallbackResponse(content, chatMessageCount, setChatMessages, setChatMessageCount) {
  if (__DEV__ && CHAT_RESPONSES) {
    const isDreamNote = content.toLowerCase().includes('dream') || content.toLowerCase().includes('library');
    const responseSet = isDreamNote ? CHAT_RESPONSES.dream : CHAT_RESPONSES.productivity;
    
    if (responseSet && responseSet.length > 0) {
      const responseIndex = chatMessageCount % responseSet.length;
      const fallbackResponse = responseSet[responseIndex];
      const aiMessage = { role: 'assistant', content: fallbackResponse };
      setChatMessages(prev => [...prev, aiMessage]);
      setChatMessageCount(prev => prev + 1);
      return true;
    }
  }
  
  // Remove user message if we can't provide a response
  setChatMessages(prev => prev.slice(0, -1));
  return false;
}

/**
 * Custom hook for note chat functionality
 * @param {string} title - Note title
 * @param {string} content - Note content
 */
export function useNoteChat(title, content) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatMessageCount, setChatMessageCount] = useState(0);

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    // Store user input and clear input field
    const userInput = chatInput.trim();
    const userMessage = { role: 'user', content: userInput };
    setChatInput('');
    setIsLoadingChat(true);

    // Build message history with note context BEFORE adding user message to UI
    // This ensures we don't duplicate the current message
    // Guardrails are applied: sanitization, PII detection, length validation
    const chatResult = buildChatMessages(
      title,
      content,
      chatMessages, // Previous conversation history (before current message)
      userInput // Current user message
    );

    // Add user message to chat UI
    setChatMessages(prev => [...prev, userMessage]);

    // Log warnings if any (PII detected, injection attempts, etc.)
    if (chatResult.warnings && chatResult.warnings.length > 0) {
      console.log('[Chat Guardrails] Warnings:', chatResult.warnings);
    }

    try {
      // Call OpenAI API with sanitized messages
      const result = await callLLM({
        model: getDefaultChatModel(),
        messages: chatResult.messages,
        temperature: getDefaultTemperature(),
        maxTokens: getDefaultMaxTokens(),
      });

      if (result.success && result.data && result.data.content) {
        // Add AI response to chat
        const aiMessage = { role: 'assistant', content: result.data.content };
        setChatMessages(prev => [...prev, aiMessage]);
      } else {
        // Handle API errors gracefully - use fallback response
        handleFallbackResponse(content, chatMessageCount, setChatMessages, setChatMessageCount);
      }
    } catch (error) {
      // Gracefully handle unexpected errors - no user-facing error messages
      console.error('[Chat] Error sending message:', error);
      
      // Use fallback in development, otherwise silently fail
      handleFallbackResponse(content, chatMessageCount, setChatMessages, setChatMessageCount);
    } finally {
      setIsLoadingChat(false);
    }
  };

  return {
    chatMessages,
    chatInput,
    setChatInput,
    isLoadingChat,
    handleSendChatMessage,
  };
}

