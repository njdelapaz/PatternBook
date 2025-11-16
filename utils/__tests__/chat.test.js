/**
 * Tests for Chat Utility Functions
 */

import {
  buildChatMessages,
  getDefaultChatModel,
  getDefaultMaxTokens,
  getDefaultTemperature,
} from '../chat';

describe('Chat Utilities', () => {
  describe('buildChatMessages', () => {
    test('should build messages with system prompt and current user message', () => {
      const title = 'Test Note';
      const content = 'This is test content';
      const currentMessage = 'What do you think?';

      const messages = buildChatMessages(title, content, [], currentMessage);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain(title);
      expect(messages[0].content).toContain(content);
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe(currentMessage);
    });

    test('should include previous messages in conversation', () => {
      const title = 'Test Note';
      const content = 'This is test content';
      const previousMessages = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' }
      ];
      const currentMessage = 'What do you think?';

      const messages = buildChatMessages(title, content, previousMessages, currentMessage);

      expect(messages).toHaveLength(4);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('First message');
      expect(messages[2].role).toBe('assistant');
      expect(messages[2].content).toBe('First response');
      expect(messages[3].role).toBe('user');
      expect(messages[3].content).toBe(currentMessage);
    });

    test('should handle empty previous messages', () => {
      const title = 'Test Note';
      const content = 'This is test content';
      const currentMessage = 'What do you think?';

      const messages = buildChatMessages(title, content, [], currentMessage);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
    });

    test('should handle empty title and content', () => {
      const title = '';
      const content = '';
      const currentMessage = 'Hello';

      const messages = buildChatMessages(title, content, [], currentMessage);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Title:');
      expect(messages[1].content).toBe('Hello');
    });

    test('should handle long content in system message', () => {
      const title = 'Test Note';
      const content = 'A'.repeat(1000);
      const currentMessage = 'What do you think?';

      const messages = buildChatMessages(title, content, [], currentMessage);

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toContain(content);
    });

    test('should handle special characters in title and content', () => {
      const title = 'Note with "quotes" & symbols';
      const content = 'Content with\nnewlines\tand\ttabs';
      const currentMessage = 'What do you think?';

      const messages = buildChatMessages(title, content, [], currentMessage);

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toContain(title);
      expect(messages[0].content).toContain(content);
    });
  });

  describe('getDefaultChatModel', () => {
    test('should return gpt-4o-mini', () => {
      expect(getDefaultChatModel()).toBe('gpt-4o-mini');
    });
  });

  describe('getDefaultMaxTokens', () => {
    test('should return 500', () => {
      expect(getDefaultMaxTokens()).toBe(500);
    });
  });

  describe('getDefaultTemperature', () => {
    test('should return 0.7', () => {
      expect(getDefaultTemperature()).toBe(0.7);
    });
  });
});

