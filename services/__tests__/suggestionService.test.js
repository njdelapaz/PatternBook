/**
 * Tests for AI Suggestion Service
 */

import { generateSuggestions, clearSuggestionsCache, hasCachedSuggestions } from '../suggestionService';
import { callLLM } from '../llmService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findArtworkImage, validateImageUrl } from '../artworkImageService';

// Mock dependencies
jest.mock('../llmService');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../artworkImageService');

describe('SuggestionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
    // Mock validateImageUrl to return true by default (accepts all Wikipedia URLs)
    validateImageUrl.mockReturnValue(true);
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
      
      // Mock artwork image fetch success
      findArtworkImage.mockResolvedValue({
        success: true,
        imageUrl: 'https://upload.wikimedia.org/starry-night.jpg',
        source: 'wikipedia',
        metadata: {
          description: 'The Starry Night is an oil painting depicting a night sky',
          categories: ['category:paintings by vincent van gogh'],
        },
      });

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

    it('should return error when LLM returns invalid JSON', async () => {
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

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.type).toBe('PARSE_ERROR');
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

    it('should enrich artwork suggestions with images', async () => {
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
              description: 'This swirling night sky resonates with your contemplative mood and search for meaning.',
            },
          ]),
        },
        metrics: {},
      };

      callLLM.mockResolvedValue(mockLLMResponse);
      
      findArtworkImage.mockResolvedValue({
        success: true,
        imageUrl: 'https://upload.wikimedia.org/starry-night.jpg',
        source: 'wikipedia',
        metadata: {
          description: 'The Starry Night is an oil painting depicting a night sky with swirling clouds and stars',
          categories: ['category:paintings by vincent van gogh'],
        },
      });

      const notes = [{ id: '1', content: 'Thinking about dreams and starry skies', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('art');
      expect(result.suggestions[0].imageUri).toBe('https://upload.wikimedia.org/starry-night.jpg');
      expect(result.suggestions[0].imageSource).toBe('wikipedia');
    });

    it('should convert artwork to quote when image fetch fails', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Unknown Painting',
              author: 'Unknown Artist',
              badge: 'Picked for you',
              description: 'This artwork explores themes of isolation and self-discovery.',
            },
          ]),
        },
        metrics: {},
      };

      // Mock artwork image fetch failure
      callLLM
        .mockResolvedValueOnce(mockLLMResponse)
        // Mock fallback quote generation
        .mockResolvedValueOnce({
          success: true,
          data: {
            content: JSON.stringify({
              quote: 'The privilege of a lifetime is to become who you truly are.',
              author: 'Carl Jung',
              description: 'This quote resonates with your journey of self-discovery and exploration of identity.',
            }),
          },
          metrics: {},
        });

      findArtworkImage.mockResolvedValue({
        success: false,
        error: 'Image not found on Wikipedia',
      });

      const notes = [{ id: '1', content: 'Exploring my identity', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('quote');
      expect(result.suggestions[0].author).toBe('Carl Jung');
    });

    it('should accept artwork with lenient relevance checking', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'The Persistence of Memory',
              author: 'Salvador Dalí',
              subtitle: '1931',
              badge: 'Picked for you',
              description: 'The melting clocks reflect your thoughts on time and memory.',
            },
          ]),
        },
        metrics: {},
      };

      callLLM.mockResolvedValue(mockLLMResponse);
      
      // Wikipedia description with artwork context but no thematic overlap
      findArtworkImage.mockResolvedValue({
        success: true,
        imageUrl: 'https://upload.wikimedia.org/dali-painting.jpg',
        source: 'wikipedia',
        metadata: {
          description: 'This painting depicts melting clocks in a desert landscape. Created by Salvador Dalí.',
          categories: ['category:paintings by salvador dalí'],
        },
      });

      const notes = [{ id: '1', content: 'Reflecting on time', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('art');
      expect(result.suggestions[0].imageUri).toBeDefined();
    });

    it('should prioritize artwork suggestions over quotes', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Wanderer above the Sea of Fog',
              author: 'Caspar David Friedrich',
              badge: 'Picked for you',
              description: 'This romantic landscape captures the contemplative mood of your entries.',
            },
            {
              type: 'art',
              title: 'The Great Wave off Kanagawa',
              author: 'Hokusai',
              badge: 'Picked for you',
              description: 'The power and beauty of nature reflects your recent thoughts.',
            },
            {
              type: 'quote',
              title: 'Test quote',
              author: 'Test',
              badge: 'Picked for you',
              description: 'Test',
            },
          ]),
        },
        metrics: {},
      };

      callLLM.mockResolvedValue(mockLLMResponse);
      
      findArtworkImage.mockResolvedValue({
        success: true,
        imageUrl: 'https://upload.wikimedia.org/artwork.jpg',
        source: 'wikipedia',
        metadata: {
          description: 'A painting depicting a landscape with mountains',
          categories: ['category:paintings'],
        },
      });

      const notes = [{ id: '1', content: 'Nature and reflection', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      // Should have 2 artworks and 1 quote
      const artworks = result.suggestions.filter(s => s.type === 'art');
      const quotes = result.suggestions.filter(s => s.type === 'quote');
      expect(artworks.length).toBeGreaterThanOrEqual(1);
      expect(artworks.length).toBeGreaterThanOrEqual(quotes.length);
    });

    it('should validate fallback quote has all required fields', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Unknown Painting',
              author: 'Unknown Artist',
              badge: 'Picked for you',
              description: 'A mysterious artwork',
            },
          ]),
        },
        metrics: {},
      };

      // First call returns artwork, second call returns quote with missing fields
      callLLM
        .mockResolvedValueOnce(mockLLMResponse)
        .mockResolvedValueOnce({
          success: true,
          data: {
            content: JSON.stringify({
              quote: 'A quote',
              // Missing author and description
            }),
          },
          metrics: {},
        });

      findArtworkImage.mockResolvedValue({
        success: false,
        error: 'Image not found',
      });

      const notes = [{ id: '1', content: 'Test', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('quote');
      // Should fall back to Socrates quote
      expect(result.suggestions[0].author).toBe('Socrates');
      expect(result.suggestions[0].title).toBeDefined();
      expect(result.suggestions[0].description).toBeDefined();
    });

    it('should handle empty object in fallback quote response', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Unknown Painting',
              author: 'Unknown Artist',
              badge: 'Picked for you',
              description: 'A mysterious artwork',
            },
          ]),
        },
        metrics: {},
      };

      // First call returns artwork, second call returns empty object
      callLLM
        .mockResolvedValueOnce(mockLLMResponse)
        .mockResolvedValueOnce({
          success: true,
          data: {
            content: JSON.stringify({}),
          },
          metrics: {},
        });

      findArtworkImage.mockResolvedValue({
        success: false,
        error: 'Image not found',
      });

      const notes = [{ id: '1', content: 'Test', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('quote');
      expect(result.suggestions[0].author).toBe('Socrates');
    });

    it('should handle non-string fields in fallback quote response', async () => {
      const mockLLMResponse = {
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Unknown Painting',
              author: 'Unknown Artist',
              badge: 'Picked for you',
              description: 'A mysterious artwork',
            },
          ]),
        },
        metrics: {},
      };

      // First call returns artwork, second call returns invalid types
      callLLM
        .mockResolvedValueOnce(mockLLMResponse)
        .mockResolvedValueOnce({
          success: true,
          data: {
            content: JSON.stringify({
              quote: 123, // Should be string
              author: null, // Should be string
              description: ['array'], // Should be string
            }),
          },
          metrics: {},
        });

      findArtworkImage.mockResolvedValue({
        success: false,
        error: 'Image not found',
      });

      const notes = [{ id: '1', content: 'Test', timestamp: Date.now() }];
      const result = await generateSuggestions(notes);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('quote');
      expect(result.suggestions[0].author).toBe('Socrates');
      expect(typeof result.suggestions[0].title).toBe('string');
      expect(typeof result.suggestions[0].description).toBe('string');
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

