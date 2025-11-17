/**
 * Tests for Token Estimator
 */

import {
  estimateTokens,
  estimateMessagesTokens,
  truncateToTokens,
  truncateMessages,
  TOKEN_BUDGETS,
} from '../tokenEstimator';

describe('estimateTokens', () => {
  it('should estimate tokens for text', () => {
    const text = 'Hello world';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBe(Math.ceil(text.length / 4));
  });

  it('should handle empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('should handle null/undefined', () => {
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  it('should handle non-string input', () => {
    expect(estimateTokens(123)).toBe(0);
    expect(estimateTokens({})).toBe(0);
  });

  it('should estimate correctly for longer text', () => {
    const text = 'This is a longer piece of text that should take up more tokens';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(10);
  });
});

describe('estimateMessagesTokens', () => {
  it('should estimate tokens for message array', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];
    
    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBeGreaterThan(0);
    // Should include content tokens + overhead (4 tokens per message)
    expect(tokens).toBeGreaterThan(8); // At least overhead
  });

  it('should handle empty array', () => {
    expect(estimateMessagesTokens([])).toBe(0);
  });

  it('should handle null/undefined', () => {
    expect(estimateMessagesTokens(null)).toBe(0);
    expect(estimateMessagesTokens(undefined)).toBe(0);
  });

  it('should include overhead for each message', () => {
    const messages = [
      { role: 'user', content: '' },
      { role: 'assistant', content: '' },
    ];
    
    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBe(8); // 4 tokens overhead per message
  });

  it('should handle messages without content', () => {
    const messages = [
      { role: 'user' },
      { role: 'assistant', content: null },
    ];
    
    const tokens = estimateMessagesTokens(messages);
    expect(tokens).toBe(8); // Just overhead
  });
});

describe('truncateToTokens', () => {
  it('should truncate text to fit token budget', () => {
    const text = 'This is a very long piece of text that needs to be truncated to fit within a specific token budget';
    const maxTokens = 10;
    
    const result = truncateToTokens(text, maxTokens);
    
    expect(estimateTokens(result)).toBeLessThanOrEqual(maxTokens);
    expect(result).toContain('...');
  });

  it('should not truncate if already under budget', () => {
    const text = 'Short text';
    const maxTokens = 100;
    
    const result = truncateToTokens(text, maxTokens);
    
    expect(result).toBe(text);
  });

  it('should handle empty text', () => {
    expect(truncateToTokens('', 10)).toBe('');
  });

  it('should handle zero token budget', () => {
    expect(truncateToTokens('Hello', 0)).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(truncateToTokens(null, 10)).toBe('');
    expect(truncateToTokens(undefined, 10)).toBe('');
  });

  it('should preserve meaning with truncation', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const result = truncateToTokens(text, 5);
    
    expect(result.length).toBeLessThan(text.length);
    expect(result).toContain('The quick');
  });
});

describe('truncateMessages', () => {
  const createMessages = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));
  };

  it('should keep all messages if under budget', () => {
    const messages = createMessages(5);
    const result = truncateMessages(messages, 1000);
    
    expect(result.length).toBe(5);
  });

  it('should keep first message (system) and recent messages', () => {
    const messages = [
      { role: 'system', content: 'System prompt' },
      ...createMessages(20),
    ];
    
    const result = truncateMessages(messages, 100);
    
    expect(result[0].role).toBe('system');
    expect(result[0].content).toBe('System prompt');
    expect(result.length).toBeLessThan(messages.length);
  });

  it('should prioritize recent messages', () => {
    const messages = [
      { role: 'system', content: 'System' },
      { role: 'user', content: 'Old message' },
      { role: 'assistant', content: 'Old response' },
      { role: 'user', content: 'Recent message' },
      { role: 'assistant', content: 'Recent response' },
    ];
    
    const result = truncateMessages(messages, 50);
    
    expect(result[0].role).toBe('system');
    expect(result[result.length - 1].content).toBe('Recent response');
  });

  it('should handle empty messages array', () => {
    const result = truncateMessages([], 100);
    expect(result).toEqual([]);
  });

  it('should handle null/undefined', () => {
    expect(truncateMessages(null, 100)).toBeNull();
    expect(truncateMessages(undefined, 100)).toBeUndefined();
  });

  it('should handle very small token budget', () => {
    const messages = createMessages(10);
    const result = truncateMessages(messages, 10);
    
    expect(result.length).toBeLessThan(messages.length);
    expect(estimateMessagesTokens(result)).toBeLessThanOrEqual(10);
  });

  it('should handle messages with long content', () => {
    const messages = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'x'.repeat(1000) },
      { role: 'assistant', content: 'y'.repeat(1000) },
      { role: 'user', content: 'Recent short message' },
    ];
    
    const result = truncateMessages(messages, 100);
    
    expect(result[0].role).toBe('system');
    expect(result.length).toBeGreaterThan(1); // At least system + one more
  });
});

describe('TOKEN_BUDGETS', () => {
  it('should have defined budget values', () => {
    expect(TOKEN_BUDGETS).toBeDefined();
    expect(TOKEN_BUDGETS.SYSTEM_PROMPT).toBeDefined();
    expect(TOKEN_BUDGETS.RETRIEVED_CONTEXT).toBeDefined();
    expect(TOKEN_BUDGETS.CHAT_HISTORY).toBeDefined();
    expect(TOKEN_BUDGETS.USER_MESSAGE).toBeDefined();
    expect(TOKEN_BUDGETS.RESPONSE_RESERVE).toBeDefined();
    expect(TOKEN_BUDGETS.TOTAL_INPUT).toBeDefined();
  });

  it('should have reasonable budget allocations', () => {
    expect(TOKEN_BUDGETS.SYSTEM_PROMPT).toBeGreaterThan(0);
    expect(TOKEN_BUDGETS.RETRIEVED_CONTEXT).toBeGreaterThan(0);
    expect(TOKEN_BUDGETS.CHAT_HISTORY).toBeGreaterThan(0);
    expect(TOKEN_BUDGETS.TOTAL_INPUT).toBeGreaterThan(
      TOKEN_BUDGETS.SYSTEM_PROMPT + TOKEN_BUDGETS.USER_MESSAGE
    );
  });

  it('should have total budget as sum of components', () => {
    const sum = 
      TOKEN_BUDGETS.SYSTEM_PROMPT +
      TOKEN_BUDGETS.RETRIEVED_CONTEXT +
      TOKEN_BUDGETS.CHAT_HISTORY +
      TOKEN_BUDGETS.USER_MESSAGE +
      TOKEN_BUDGETS.RESPONSE_RESERVE;
    
    expect(sum).toBeGreaterThan(TOKEN_BUDGETS.TOTAL_INPUT);
  });
});

describe('Integration: Token Management', () => {
  it('should manage tokens in realistic chat scenario', () => {
    // Simulate a conversation
    const systemPrompt = 'You are a helpful assistant with access to the user\'s notes.';
    const retrievedContext = 'Note 1: Morning routine with meditation.\nNote 2: Productivity tips.';
    const chatHistory = [
      { role: 'user', content: 'What time should I wake up?' },
      { role: 'assistant', content: 'Based on your notes, 6am seems to work well for you.' },
      { role: 'user', content: 'How can I be more productive?' },
      { role: 'assistant', content: 'Your notes suggest focusing on one task at a time.' },
    ];
    const userMessage = 'Tell me more about my morning routine';

    const messages = [
      { role: 'system', content: systemPrompt + '\n\n' + retrievedContext },
      ...chatHistory,
      { role: 'user', content: userMessage },
    ];

    const totalTokens = estimateMessagesTokens(messages);

    expect(totalTokens).toBeLessThan(TOKEN_BUDGETS.TOTAL_INPUT);
    expect(totalTokens).toBeGreaterThan(100);
  });

  it('should truncate oversized conversation', () => {
    const systemPrompt = { role: 'system', content: 'System prompt' };
    const longHistory = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'This is a message that takes up space. '.repeat(50),
    }));

    const messages = [systemPrompt, ...longHistory];
    const originalTokens = estimateMessagesTokens(messages);

    expect(originalTokens).toBeGreaterThan(TOKEN_BUDGETS.TOTAL_INPUT);

    const truncated = truncateMessages(messages, TOKEN_BUDGETS.TOTAL_INPUT);
    const truncatedTokens = estimateMessagesTokens(truncated);

    expect(truncatedTokens).toBeLessThanOrEqual(TOKEN_BUDGETS.TOTAL_INPUT);
    expect(truncated[0].role).toBe('system');
    expect(truncated.length).toBeLessThan(messages.length);
  });
});

