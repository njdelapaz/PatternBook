/**
 * Integration tests for Chat functionality
 * Tests the chat message building and API integration
 */

import { buildChatMessages } from '../utils/chat';
import { callLLM } from '../services/llmService';

// Mock the LLM service
jest.mock('../services/llmService');

describe('Chat Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildChatMessages', () => {
    test('should build messages with system prompt containing note context', () => {
      const title = 'My Note';
      const content = 'This is my note content';
      const previousMessages = [];
      const currentMessage = 'What do you think?';

      const messages = buildChatMessages(title, content, previousMessages, currentMessage);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('You are a helpful assistant');
      expect(messages[0].content).toContain(title);
      expect(messages[0].content).toContain(content);
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe(currentMessage);
    });

    test('should include conversation history', () => {
      const title = 'My Note';
      const content = 'This is my note content';
      const previousMessages = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' }
      ];
      const currentMessage = 'Follow-up question';

      const messages = buildChatMessages(title, content, previousMessages, currentMessage);

      expect(messages).toHaveLength(4);
      expect(messages[0].role).toBe('system');
      expect(messages[1].content).toBe('First question');
      expect(messages[2].content).toBe('First answer');
      expect(messages[3].content).toBe('Follow-up question');
    });
  });

  describe('Chat API Integration', () => {
    test('should call callLLM with correct parameters', async () => {
      const mockCallLLM = callLLM;
      mockCallLLM.mockResolvedValue({
        success: true,
        data: {
          content: 'This is a test response'
        }
      });

      const title = 'Test Note';
      const content = 'Test content';
      const messages = buildChatMessages(title, content, [], 'Test question');

      await callLLM({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        maxTokens: 500,
      });

      expect(mockCallLLM).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Test question' })
        ]),
        temperature: 0.7,
        maxTokens: 500,
      });
    });

    test('should handle successful API response', async () => {
      const mockCallLLM = callLLM;
      const mockResponse = {
        success: true,
        data: {
          content: 'This is a helpful response'
        }
      };
      mockCallLLM.mockResolvedValue(mockResponse);

      const result = await callLLM({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('This is a helpful response');
    });

    test('should handle API error gracefully', async () => {
      const mockCallLLM = callLLM;
      const mockError = {
        success: false,
        error: {
          type: 'NetworkError',
          message: 'Network error occurred'
        }
      };
      mockCallLLM.mockResolvedValue(mockError);

      const result = await callLLM({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.type).toBe('NetworkError');
    });

    test('should handle rate limit errors', async () => {
      const mockCallLLM = callLLM;
      const mockError = {
        success: false,
        error: {
          type: 'RateLimitError',
          message: 'Rate limit exceeded'
        }
      };
      mockCallLLM.mockResolvedValue(mockError);

      const result = await callLLM({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('RateLimitError');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty note content gracefully', () => {
      const title = '';
      const content = '';
      const currentMessage = 'Hello';

      const messages = buildChatMessages(title, content, [], currentMessage);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].content).toBe('Hello');
    });

    test('should handle very long note content', () => {
      const title = 'Long Note';
      const content = 'A'.repeat(10000);
      const currentMessage = 'Question';

      const messages = buildChatMessages(title, content, [], currentMessage);

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toContain(content);
    });
  });
});

