/**
 * Tests for AI Suggestion Service
 */

import { generateSuggestions, clearSuggestionsCache, hasCachedSuggestions } from '../suggestionService';
import { callLLM } from '../llmService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../llmService');
jest.mock('@react-native-async-storage/async-storage');

describe('SuggestionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('generateSuggestions', () => {
    it('should return empty suggestions for no notes', async () => {
      const result = await generateSuggestions([]);
      
      expect(result.success).toBe(true);
      expect(result.suggestions).toEqual([]);
      expect(result.cached).toBe(false);
    });

    it('should return cached suggestions if available', async () => {
      const cachedSuggestions = [
        {
          type: 'quote',
          title: 'Test quote',
          author: 'Test Author',
          badge: 'Picked for you',
          description: 'Test description',
        },
      ];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        suggestions: cachedSuggestions,
        timestamp: Date.now(),
      }));

      const notes = [{ id: '1', content: 'Test note', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toEqual(cachedSuggestions);
      expect(result.cached).toBe(true);
      expect(callLLM).not.toHaveBeenCalled();
    });

    it('should generate AI suggestions when no cache exists', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'The Starry Night',
              author: 'Vincent van Gogh',
              subtitle: '1889',
              badge: 'Picked for you',
              description: 'This artwork resonates with your contemplative mood.',
            },
          ]),
        },
        metrics: {
          cost: 0.001,
          tokens: 100,
        },
      };

      callLLM.mockResolvedValue(mockLLMResponse);

      const notes = [
        { id: '1', content: 'Thinking about dreams and starry skies', timestamp: Date.now() },
      ];

      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('art');
      expect(result.suggestions[0].title).toBe('The Starry Night');
      expect(result.cached).toBe(false);
      expect(callLLM).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle JSON in markdown code blocks', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: '```json\n[{"type":"quote","title":"Test","badge":"Picked for you","description":"Test"}]\n```',
        },
        metrics: {},
      };

      callLLM.mockResolvedValue(mockLLMResponse);

      const notes = [{ id: '1', content: 'Test', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
    });

    it('should return empty array when LLM returns invalid JSON', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: 'Invalid JSON response',
        },
        metrics: {},
      };

      callLLM.mockResolvedValue(mockLLMResponse);

      const notes = [{ id: '1', content: 'Test', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should handle LLM errors gracefully', async () => {
      callLLM.mockResolvedValue({
        success: false,
        error: {
          type: 'API_ERROR',
          message: 'API is down',
        },
      });

      const notes = [{ id: '1', content: 'Test', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(false);
      expect(result.suggestions).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it('should force refresh when requested', async () => {
      // Set up cache
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        suggestions: [{ type: 'quote', title: 'Old', badge: 'test', description: 'test' }],
        timestamp: Date.now(),
      }));

      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([
            { type: 'quote', title: 'New', badge: 'test', description: 'test' },
          ]),
        },
        metrics: {},
      };

      callLLM.mockResolvedValue(mockLLMResponse);

      const notes = [{ id: '1', content: 'Test', timestamp: Date.now() }];
      const result = await generateSuggestions(notes, { forceRefresh: true });

      expect(result.success).toBe(true);
      expect(result.suggestions[0].title).toBe('New');
      expect(callLLM).toHaveBeenCalled();
    });

    it('should filter out invalid suggestions', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([
            { type: 'quote', title: 'Valid', badge: 'test', description: 'test' },
            { type: 'quote' }, // Missing required fields
            { title: 'Invalid', description: 'test' }, // Missing type
          ]),
        },
        metrics: {},
      };

      callLLM.mockResolvedValue(mockLLMResponse);

      const notes = [{ id: '1', content: 'Test', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].title).toBe('Valid');
    });

    it('should limit to most recent 10 notes', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([{ type: 'quote', title: 'Test', badge: 'test', description: 'test' }]),
        },
        metrics: {},
      };

      callLLM.mockResolvedValue(mockLLMResponse);

      // Create 15 notes
      const notes = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        content: `Note ${i}`,
        timestamp: Date.now() - (15 - i) * 1000, // Oldest to newest
      }));

      await generateSuggestions(notes);

      expect(callLLM).toHaveBeenCalled();
      const callArgs = callLLM.mock.calls[0][0];
      const userMessage = callArgs.messages.find(m => m.role === 'user').content;
      
      // Should only include 10 notes in the summary
      const noteCount = (userMessage.match(/\[Note /g) || []).length;
      expect(noteCount).toBeLessThanOrEqual(10);
    });
  });

  describe('clearSuggestionsCache', () => {
    it('should clear the cache', async () => {
      await clearSuggestionsCache();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@suggestions_cache');
    });
  });

  describe('hasCachedSuggestions', () => {
    it('should return true when valid cache exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        suggestions: [{ type: 'quote', title: 'Test', badge: 'test', description: 'test' }],
        timestamp: Date.now(),
      }));

      const result = await hasCachedSuggestions();
      expect(result).toBe(true);
    });

    it('should return false when cache is expired', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        suggestions: [{ type: 'quote', title: 'Test', badge: 'test', description: 'test' }],
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      }));

      const result = await hasCachedSuggestions();
      expect(result).toBe(false);
    });

    it('should return false when no cache exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await hasCachedSuggestions();
      expect(result).toBe(false);
    });
  });
});

