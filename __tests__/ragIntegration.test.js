/**
 * Integration Tests for RAG System
 * Tests the complete flow from query to LLM context
 */

import retrievalService from '../services/noteRetrievalService';
import { buildGlobalChatContext, buildNoteChatContext } from '../utils/contextBuilder';
import { loadChatHistory, saveChatHistory, clearAllChatHistories } from '../utils/chatStorage';
import { RETRIEVAL_CONFIG } from '../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('RAG Integration Tests', () => {
  const mockNotes = [
    {
      id: 'note-1',
      title: 'Morning Routine',
      content: 'I wake up at 6am every morning. First thing I do is meditate for 20 minutes. Then I exercise for 30 minutes and have a healthy breakfast with protein and fruits.',
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: 'note-2',
      title: 'Productivity Tips',
      content: 'Focus on one task at a time to maximize productivity. Avoid multitasking as it reduces efficiency. Take regular breaks every 25 minutes using the Pomodoro technique.',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
    },
    {
      id: 'note-3',
      title: 'Goals 2024',
      content: 'Want to build better habits this year. Wake up earlier consistently. Exercise more regularly at least 4 times per week. Read one book per month.',
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'note-4',
      title: 'Evening Routine',
      content: 'Wind down at 9pm each evening. Read a book for 30 minutes before bed. No screens after 10pm to improve sleep quality. Aim to be asleep by 10:30pm.',
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now() - 86400000 * 3,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    retrievalService.indexNotes(mockNotes);
  });

  describe('End-to-End RAG Flow: Global Chat', () => {
    it('should complete full RAG pipeline for morning routine query', async () => {
      const userQuery = 'What time should I wake up and what should I do in the morning?';
      const chatHistory = [];

      // Step 1: Retrieve relevant chunks
      const retrievedChunks = retrievalService.retrieve(userQuery, {
        topK: RETRIEVAL_CONFIG.TOP_K,
        minScore: RETRIEVAL_CONFIG.MIN_SCORE,
      });

      expect(retrievedChunks.length).toBeGreaterThan(0);
      
      // Should find Morning Routine note
      const hasMorningNote = retrievedChunks.some(chunk => 
        chunk.noteId === 'note-1'
      );
      expect(hasMorningNote).toBe(true);

      // Step 2: Build context with retrieved chunks
      const contextResult = buildGlobalChatContext(
        userQuery,
        chatHistory,
        retrievedChunks
      );

      expect(contextResult).toBeDefined();
      expect(contextResult.messages).toBeDefined();
      expect(contextResult.messages.length).toBeGreaterThan(1);

      // Verify system message includes retrieved content
      const systemMessage = contextResult.messages[0];
      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toContain('Morning Routine');
      expect(systemMessage.content).toContain('6am');
      expect(systemMessage.content).toContain('meditate');

      // Verify user message is last
      const userMessage = contextResult.messages[contextResult.messages.length - 1];
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe(userQuery);

      // Verify metadata
      expect(contextResult.metadata.retrievedChunkCount).toBeGreaterThan(0);
      expect(contextResult.metadata.totalTokens).toBeGreaterThan(0);
    });

    it('should handle productivity-related query', async () => {
      const userQuery = 'How can I be more productive with my work?';

      const retrievedChunks = retrievalService.retrieve(userQuery, {
        topK: RETRIEVAL_CONFIG.TOP_K,
        minScore: RETRIEVAL_CONFIG.MIN_SCORE,
      });

      expect(retrievedChunks.length).toBeGreaterThan(0);

      // Should find Productivity Tips note
      const hasProductivityNote = retrievedChunks.some(chunk =>
        chunk.noteId === 'note-2'
      );
      expect(hasProductivityNote).toBe(true);

      const contextResult = buildGlobalChatContext(
        userQuery,
        [],
        retrievedChunks
      );

      const systemMessage = contextResult.messages[0].content;
      expect(systemMessage).toContain('Productivity');
      expect(systemMessage).toContain('task');
    });

    it('should persist and load chat history', async () => {
      const mockHistory = [
        { role: 'user', content: 'What are my goals?', timestamp: Date.now() },
        { role: 'assistant', content: 'Your goals include building better habits...', timestamp: Date.now() },
      ];

      // Save history
      await saveChatHistory('global', mockHistory);
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      // Load history
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ 'global': mockHistory })
      );

      const loadedHistory = await loadChatHistory('global');
      expect(loadedHistory).toEqual(mockHistory);
    });

    it('should include chat history in context', async () => {
      const chatHistory = [
        { role: 'user', content: 'What time should I wake up?' },
        { role: 'assistant', content: 'Based on your notes, 6am works well for you.' },
      ];

      const userQuery = 'What should I do after waking up?';

      const retrievedChunks = retrievalService.retrieve(userQuery, {
        topK: 3,
        minScore: 0.01,
      });

      const contextResult = buildGlobalChatContext(
        userQuery,
        chatHistory,
        retrievedChunks
      );

      expect(contextResult.messages.length).toBeGreaterThan(3); // system + history + user
      
      // Check that history is included
      const hasHistoryUser = contextResult.messages.some(m =>
        m.role === 'user' && m.content.includes('What time')
      );
      const hasHistoryAssistant = contextResult.messages.some(m =>
        m.role === 'assistant' && m.content.includes('6am')
      );

      expect(hasHistoryUser).toBe(true);
      expect(hasHistoryAssistant).toBe(true);
    });
  });

  describe('End-to-End RAG Flow: Per-Note Chat', () => {
    it('should complete RAG pipeline for note-specific chat', async () => {
      const currentNote = mockNotes[0]; // Morning Routine
      const userQuery = 'Are there other routines I should know about?';

      // Retrieve chunks (excluding current note)
      const retrievedChunks = retrievalService.retrieve(userQuery, {
        topK: RETRIEVAL_CONFIG.TOP_K,
        minScore: RETRIEVAL_CONFIG.MIN_SCORE,
        excludeNoteId: currentNote.id,
      });

      // Should NOT include current note
      const hasCurrentNote = retrievedChunks.some(chunk =>
        chunk.noteId === currentNote.id
      );
      expect(hasCurrentNote).toBe(false);

      // Should find Evening Routine
      const hasEveningNote = retrievedChunks.some(chunk =>
        chunk.noteId === 'note-4'
      );
      expect(hasEveningNote).toBe(true);

      // Build context
      const contextResult = buildNoteChatContext(
        currentNote,
        userQuery,
        [],
        retrievedChunks
      );

      const systemMessage = contextResult.messages[0].content;
      
      // Should include current note
      expect(systemMessage).toContain('Morning Routine');
      expect(systemMessage).toContain('wake up at 6am');
      
      // Should include retrieved note
      expect(systemMessage).toContain('Evening Routine');
    });

    it('should save chat history per note', async () => {
      const noteId = 'note-1';
      const mockHistory = [
        { role: 'user', content: 'Tell me about this note', timestamp: Date.now() },
        { role: 'assistant', content: 'This note is about your morning routine...', timestamp: Date.now() },
      ];

      await saveChatHistory(noteId, mockHistory);
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ [noteId]: mockHistory })
      );

      const loadedHistory = await loadChatHistory(noteId);
      expect(loadedHistory).toEqual(mockHistory);
    });
  });

  describe('Cross-Note Reference Discovery', () => {
    it('should find connections between morning and evening routines', async () => {
      const query = 'What are my daily routines?';

      const retrievedChunks = retrievalService.retrieve(query, {
        topK: 10,
        minScore: 0.01,
      });

      const noteIds = new Set(retrievedChunks.map(c => c.noteId));
      
      // Should find both Morning and Evening routines
      expect(noteIds.has('note-1')).toBe(true); // Morning
      expect(noteIds.has('note-4')).toBe(true); // Evening
    });

    it('should find goals related to habits', async () => {
      const query = 'What habits am I trying to build?';

      const retrievedChunks = retrievalService.retrieve(query, {
        topK: 5,
        minScore: 0.01,
      });

      const hasGoalsNote = retrievedChunks.some(chunk =>
        chunk.noteId === 'note-3'
      );
      expect(hasGoalsNote).toBe(true);
    });

    it('should find multiple notes about exercise', async () => {
      const query = 'exercise workout fitness';

      const retrievedChunks = retrievalService.retrieve(query, {
        topK: 5,
        minScore: 0.01,
      });

      const noteIds = new Set(retrievedChunks.map(c => c.noteId));
      
      // Should find Morning Routine (exercise) and Goals (exercise more)
      expect(noteIds.size).toBeGreaterThan(1);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of notes efficiently', () => {
      const manyNotes = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `This is note number ${i} about various topics including productivity, habits, and routines.`.repeat(5),
        createdAt: Date.now() - i * 1000,
        updatedAt: Date.now() - i * 500,
      }));

      const startTime = Date.now();
      retrievalService.indexNotes(manyNotes);
      const indexTime = Date.now() - startTime;

      expect(indexTime).toBeLessThan(1000); // Should index in < 1 second

      const queryStart = Date.now();
      const results = retrievalService.retrieve('productivity habits', {
        topK: 5,
      });
      const queryTime = Date.now() - queryStart;

      expect(queryTime).toBeLessThan(100); // Should query in < 100ms
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle very long notes with chunking', () => {
      const longNote = {
        id: 'long-note',
        title: 'Comprehensive Guide',
        content: 'This is a very long note with lots of content. '.repeat(1000),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      retrievalService.indexNotes([longNote]);

      const results = retrievalService.retrieve('comprehensive guide content', {
        topK: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].noteId).toBe('long-note');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle query with no matching notes', async () => {
      const query = 'quantum physics thermodynamics relativity';

      const retrievedChunks = retrievalService.retrieve(query, {
        topK: 5,
        minScore: 0.1, // Higher threshold
      });

      expect(retrievedChunks.length).toBe(0);

      const contextResult = buildGlobalChatContext(query, [], retrievedChunks);
      
      expect(contextResult.messages).toBeDefined();
      expect(contextResult.metadata.retrievedChunkCount).toBe(0);
    });

    it('should handle empty notes array', () => {
      retrievalService.indexNotes([]);
      const stats = retrievalService.getStats();
      
      expect(stats.noteCount).toBe(0);
      expect(stats.chunkCount).toBe(0);
    });

    it('should handle notes with empty content', () => {
      const emptyNotes = [
        { id: '1', title: 'Empty', content: '', createdAt: Date.now(), updatedAt: Date.now() },
      ];

      retrievalService.indexNotes(emptyNotes);
      
      const results = retrievalService.retrieve('anything', { topK: 5 });
      expect(results.length).toBe(0);
    });

    it('should handle very short query', async () => {
      const query = 'a';

      const retrievedChunks = retrievalService.retrieve(query, {
        topK: 3,
      });

      // Should still work, even if results are limited
      const contextResult = buildGlobalChatContext(query, [], retrievedChunks);
      expect(contextResult.messages).toBeDefined();
    });
  });

  describe('Storage Integration', () => {
    afterEach(async () => {
      await clearAllChatHistories();
    });

    it('should persist multiple chat conversations', async () => {
      const globalChat = [
        { role: 'user', content: 'Global question', timestamp: Date.now() },
      ];
      const note1Chat = [
        { role: 'user', content: 'Note 1 question', timestamp: Date.now() },
      ];
      const note2Chat = [
        { role: 'user', content: 'Note 2 question', timestamp: Date.now() },
      ];

      await saveChatHistory('global', globalChat);
      await saveChatHistory('note-1', note1Chat);
      await saveChatHistory('note-2', note2Chat);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent chat operations', async () => {
      const operations = [
        saveChatHistory('chat-1', [{ role: 'user', content: 'Test 1' }]),
        saveChatHistory('chat-2', [{ role: 'user', content: 'Test 2' }]),
        saveChatHistory('chat-3', [{ role: 'user', content: 'Test 3' }]),
      ];

      await Promise.all(operations);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });
});

