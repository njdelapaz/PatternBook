/**
 * Tests for Context Builder
 */

import {
  buildChatContext,
  buildNoteChatContext,
  buildGlobalChatContext,
  formatRetrievedNotesForUI,
  checkTokenBudget,
} from '../contextBuilder';

describe('formatRetrievedNotesForUI', () => {
  it('should format retrieved chunks grouped by note', () => {
    const chunks = [
      {
        noteId: 'note-1',
        noteTitle: 'Morning Routine',
        text: 'Wake up at 6am...',
        score: 0.85,
      },
      {
        noteId: 'note-1',
        noteTitle: 'Morning Routine',
        text: 'Meditate for 20 minutes...',
        score: 0.75,
      },
      {
        noteId: 'note-2',
        noteTitle: 'Productivity Tips',
        text: 'Focus on one task...',
        score: 0.65,
      },
    ];

    const result = formatRetrievedNotesForUI(chunks);

    expect(result).toHaveLength(2); // 2 unique notes
    expect(result[0].noteId).toBe('note-1');
    expect(result[0].chunks).toHaveLength(2);
    expect(result[1].noteId).toBe('note-2');
    expect(result[1].chunks).toHaveLength(1);
  });

  it('should handle empty chunks', () => {
    const result = formatRetrievedNotesForUI([]);
    expect(result).toEqual([]);
  });

  it('should handle null/undefined', () => {
    expect(formatRetrievedNotesForUI(null)).toEqual([]);
    expect(formatRetrievedNotesForUI(undefined)).toEqual([]);
  });
});

describe('buildChatContext', () => {
  const mockRetrievedChunks = [
    {
      noteId: 'note-1',
      noteTitle: 'Test Note',
      text: 'This is test content about productivity.',
      score: 0.8,
    },
  ];

  it('should build context with all components', () => {
    const result = buildChatContext({
      userMessage: 'How can I be more productive?',
      retrievedChunks: mockRetrievedChunks,
      chatHistory: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
      isGlobalChat: true,
    });

    expect(result.messages).toBeDefined();
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages[0].role).toBe('system');
    expect(result.messages[result.messages.length - 1].role).toBe('user');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.retrievedChunkCount).toBe(1);
  });

  it('should throw error if userMessage is missing', () => {
    expect(() => {
      buildChatContext({
        retrievedChunks: [],
        chatHistory: [],
        isGlobalChat: true,
      });
    }).toThrow('userMessage is required');
  });

  it('should include current note content for note-specific chat', () => {
    const result = buildChatContext({
      userMessage: 'Tell me about this note',
      retrievedChunks: [],
      chatHistory: [],
      isGlobalChat: false,
      currentNoteTitle: 'My Note',
      currentNoteContent: 'This is my note content.',
    });

    const systemMessage = result.messages[0].content;
    expect(systemMessage).toContain('My Note');
    expect(systemMessage).toContain('[Current Note Content]');
  });

  it('should include retrieved notes in system prompt', () => {
    const result = buildChatContext({
      userMessage: 'Test query',
      retrievedChunks: mockRetrievedChunks,
      chatHistory: [],
      isGlobalChat: true,
    });

    const systemMessage = result.messages[0].content;
    expect(systemMessage).toContain('Test Note');
    expect(systemMessage).toContain('productivity');
  });

  it('should handle empty chat history', () => {
    const result = buildChatContext({
      userMessage: 'Test',
      retrievedChunks: [],
      chatHistory: [],
      isGlobalChat: true,
    });

    expect(result.messages).toHaveLength(2); // system + user
  });

  it('should truncate chat history if exceeding budget', () => {
    // Create very long chat history
    const longHistory = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'This is a message that takes up space in the token budget. '.repeat(10),
    }));

    const result = buildChatContext({
      userMessage: 'Test',
      retrievedChunks: [],
      chatHistory: longHistory,
      isGlobalChat: true,
    });

    expect(result.metadata.historyTruncated).toBe(true);
    expect(result.messages.length).toBeLessThan(longHistory.length + 2);
  });

  it('should return metadata with token estimates', () => {
    const result = buildChatContext({
      userMessage: 'Test message',
      retrievedChunks: mockRetrievedChunks,
      chatHistory: [{ role: 'user', content: 'Previous message' }],
      isGlobalChat: true,
    });

    expect(result.metadata).toHaveProperty('systemTokens');
    expect(result.metadata).toHaveProperty('historyTokens');
    expect(result.metadata).toHaveProperty('userMessageTokens');
    expect(result.metadata).toHaveProperty('totalTokens');
    expect(result.metadata).toHaveProperty('retrievedNotes');
  });
});

describe('buildNoteChatContext', () => {
  const mockNote = {
    id: 'note-1',
    title: 'My Note',
    content: 'This is my note about productivity and habits.',
  };

  const mockRetrievedChunks = [
    {
      noteId: 'note-2',
      noteTitle: 'Related Note',
      text: 'Related content about habits.',
      score: 0.7,
    },
  ];

  it('should build context for note-specific chat', () => {
    const result = buildNoteChatContext(
      mockNote,
      'How can I improve my habits?',
      [],
      mockRetrievedChunks
    );

    expect(result.messages).toBeDefined();
    expect(result.messages[0].role).toBe('system');
    
    const systemMessage = result.messages[0].content;
    expect(systemMessage).toContain('My Note');
    expect(systemMessage).toContain('productivity and habits');
    expect(systemMessage).toContain('Related Note');
  });

  it('should handle note with no retrieved chunks', () => {
    const result = buildNoteChatContext(
      mockNote,
      'Tell me about this note',
      [],
      []
    );

    expect(result.messages).toBeDefined();
    expect(result.metadata.retrievedChunkCount).toBe(0);
  });

  it('should include chat history', () => {
    const chatHistory = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ];

    const result = buildNoteChatContext(
      mockNote,
      'Follow-up question',
      chatHistory,
      []
    );

    expect(result.messages.length).toBeGreaterThan(3); // system + history + user
  });
});

describe('buildGlobalChatContext', () => {
  const mockRetrievedChunks = [
    {
      noteId: 'note-1',
      noteTitle: 'Morning Routine',
      text: 'Wake up at 6am and meditate.',
      score: 0.8,
    },
    {
      noteId: 'note-2',
      noteTitle: 'Evening Routine',
      text: 'Read before bed.',
      score: 0.7,
    },
  ];

  it('should build context for global chat', () => {
    const result = buildGlobalChatContext(
      'What are my daily routines?',
      [],
      mockRetrievedChunks
    );

    expect(result.messages).toBeDefined();
    expect(result.messages[0].role).toBe('system');
    
    const systemMessage = result.messages[0].content;
    expect(systemMessage).toContain('Morning Routine');
    expect(systemMessage).toContain('Evening Routine');
  });

  it('should handle global chat with no retrieved chunks', () => {
    const result = buildGlobalChatContext(
      'Tell me about my notes',
      [],
      []
    );

    expect(result.messages).toBeDefined();
    expect(result.metadata.retrievedChunkCount).toBe(0);
  });

  it('should include chat history in global context', () => {
    const chatHistory = [
      { role: 'user', content: 'What notes do I have?' },
      { role: 'assistant', content: 'You have several notes about routines...' },
    ];

    const result = buildGlobalChatContext(
      'Tell me more',
      chatHistory,
      mockRetrievedChunks
    );

    expect(result.messages.length).toBeGreaterThan(3);
  });
});

describe('checkTokenBudget', () => {
  it('should check if messages are within budget', () => {
    const messages = [
      { role: 'system', content: 'Short system message' },
      { role: 'user', content: 'Hello' },
    ];

    const result = checkTokenBudget(messages);

    expect(result).toHaveProperty('totalTokens');
    expect(result).toHaveProperty('budgetLimit');
    expect(result).toHaveProperty('isWithinBudget');
    expect(result).toHaveProperty('percentUsed');
    expect(result.isWithinBudget).toBe(true);
  });

  it('should detect when over budget', () => {
    const messages = [
      { role: 'system', content: 'x'.repeat(15000) }, // Very long message
    ];

    const result = checkTokenBudget(messages);

    expect(result.isWithinBudget).toBe(false);
    expect(result.percentUsed).toBeGreaterThan(100);
  });

  it('should calculate percent used correctly', () => {
    const messages = [
      { role: 'system', content: 'Test message that uses some tokens' },
    ];

    const result = checkTokenBudget(messages);

    expect(result.percentUsed).toBeGreaterThan(0);
    expect(result.percentUsed).toBeLessThan(100);
  });
});

describe('Integration: Full Context Building Flow', () => {
  it('should build complete context for realistic scenario', () => {
    const retrievedChunks = [
      {
        noteId: 'note-1',
        noteTitle: 'Morning Routine',
        text: 'Wake up at 6am. Meditate for 20 minutes. Exercise for 30 minutes.',
        score: 0.85,
      },
      {
        noteId: 'note-2',
        noteTitle: 'Productivity Tips',
        text: 'Focus on one task at a time. Use Pomodoro technique.',
        score: 0.75,
      },
    ];

    const chatHistory = [
      { role: 'user', content: 'What time should I wake up?' },
      { role: 'assistant', content: 'Based on your notes, you aim to wake up at 6am.' },
    ];

    const result = buildGlobalChatContext(
      'How can I be more productive in the morning?',
      chatHistory,
      retrievedChunks
    );

    // Verify structure
    expect(result.messages).toBeDefined();
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages[0].role).toBe('system');
    expect(result.messages[result.messages.length - 1].role).toBe('user');

    // Verify system prompt includes retrieved content
    const systemPrompt = result.messages[0].content;
    expect(systemPrompt).toContain('Morning Routine');
    expect(systemPrompt).toContain('Productivity Tips');
    expect(systemPrompt).toContain('6am');
    expect(systemPrompt).toContain('Pomodoro');

    // Verify metadata
    expect(result.metadata.retrievedChunkCount).toBe(2);
    expect(result.metadata.retrievedNotes).toHaveLength(2);
    expect(result.metadata.totalTokens).toBeGreaterThan(0);

    // Verify within token budget
    const budgetCheck = checkTokenBudget(result.messages);
    expect(budgetCheck.isWithinBudget).toBe(true);
  });
});

