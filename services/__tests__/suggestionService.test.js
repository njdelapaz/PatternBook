/**
 * Tests for Suggestion Service
 */

import { generateSuggestions, clearSuggestionsCache, hasCachedSuggestions } from '../suggestionService';
import { callLLM } from '../llmService';
import { findArtworkImage, validateImageUrl } from '../artworkImageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../llmService');
jest.mock('../artworkImageService');
jest.mock('@react-native-async-storage/async-storage');

describe('Suggestion Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    // Default mock for validateImageUrl
    validateImageUrl.mockReturnValue(true);
  });

  describe('generateSuggestions', () => {
    it('should return empty suggestions for no notes', async () => {
      const result = await generateSuggestions([]);
      expect(result.success).toBe(true);
      expect(result.suggestions).toEqual([]);
      expect(result.cached).toBe(false);
    });

    it('should return empty suggestions for null notes', async () => {
      const result = await generateSuggestions(null);
      expect(result.success).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should filter out inappropriate artwork suggestions', async () => {
      const notes = [{ content: 'Test note', title: 'Test', timestamp: Date.now() }];
      
      // Mock LLM to return inappropriate artwork
      callLLM.mockResolvedValue({
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Nude Portrait',
              description: 'A painting with naked figures',
              author: 'Test Artist',
            },
          ]),
        },
      });

      const result = await generateSuggestions(notes);
      
      // Should filter out the inappropriate artwork
      expect(result.success).toBe(false);
      expect(result.suggestions).toEqual([]);
    });

    it('should accept appropriate artwork suggestions', async () => {
      const notes = [{ content: 'Test note about feeling peaceful under night sky', title: 'Test', timestamp: Date.now() }];
      
      // Mock LLM to return appropriate artwork
      callLLM.mockResolvedValue({
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Starry Night',
              description: 'A beautiful swirling night sky painting with stars that captures peaceful contemplation',
              author: 'Vincent van Gogh',
            },
          ]),
        },
      });

      // Mock successful image fetch with matching metadata
      // Keywords: beautiful, swirling, night, sky, painting, stars, peaceful
      findArtworkImage.mockResolvedValue({
        success: true,
        imageUrl: 'https://wikimedia.org/starry-night.jpg',
        metadata: {
          description: 'The Starry Night is a beautiful oil painting by Vincent van Gogh depicting a swirling night sky filled with bright stars. The painting captures a peaceful scene with its flowing, swirling brushstrokes that create a sense of movement in the sky.',
        },
      });

      const result = await generateSuggestions(notes);
      
      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('art');
      expect(result.suggestions[0].title).toBe('Starry Night');
      expect(result.suggestions[0].imageUri).toBe('https://wikimedia.org/starry-night.jpg');
    });

    it('should accept quote suggestions', async () => {
      const notes = [{ content: 'Test note', title: 'Test', timestamp: Date.now() }];
      
      callLLM.mockResolvedValue({
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'quote',
              title: 'The only way to do great work is to love what you do',
              description: 'This resonates with your passion',
              author: 'Steve Jobs',
            },
          ]),
        },
      });

      const result = await generateSuggestions(notes);
      
      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('quote');
    });

    it('should convert artwork to quote if image not found', async () => {
      const notes = [{ content: 'Test note', title: 'Test', timestamp: Date.now() }];
      
      callLLM.mockResolvedValueOnce({
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Unknown Painting',
              description: 'A painting that does not exist',
              author: 'Unknown Artist',
            },
          ]),
        },
      })
      .mockResolvedValueOnce({
        // Fallback quote generation
        success: true,
        data: {
          content: JSON.stringify({
            quote: 'Fallback quote',
            author: 'Author',
            description: 'A meaningful fallback',
          }),
        },
      });

      findArtworkImage.mockResolvedValue({
        success: false,
        error: 'Image not found',
      });

      const result = await generateSuggestions(notes);
      
      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('quote');
    });

    it('should handle LLM errors gracefully', async () => {
      const notes = [{ content: 'Test note', title: 'Test', timestamp: Date.now() }];
      
      callLLM.mockResolvedValue({
        success: false,
        error: { message: 'API error' },
      });

      const result = await generateSuggestions(notes);
      
      expect(result.success).toBe(false);
      expect(result.suggestions).toEqual([]);
    });

    it('should use cached suggestions when available', async () => {
      const cachedSuggestions = [
        { type: 'quote', title: 'Cached quote', author: 'Author' },
      ];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        suggestions: cachedSuggestions,
        timestamp: Date.now(),
      }));

      const result = await generateSuggestions([{ content: 'Test' }]);
      
      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.suggestions).toEqual(cachedSuggestions);
      expect(callLLM).not.toHaveBeenCalled();
    });

    it('should bypass cache with forceRefresh', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        suggestions: [{ type: 'quote', title: 'Cached' }],
        timestamp: Date.now(),
      }));

      callLLM.mockResolvedValue({
        success: true,
        data: {
          content: JSON.stringify([
            { type: 'quote', title: 'New quote', description: 'Fresh', author: 'Author' },
          ]),
        },
      });

      const result = await generateSuggestions(
        [{ content: 'Test' }],
        { forceRefresh: true }
      );
      
      expect(result.cached).toBe(false);
      expect(callLLM).toHaveBeenCalled();
    });
  });

  describe('clearSuggestionsCache', () => {
    it('should clear the cache', async () => {
      await clearSuggestionsCache();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@suggestions_cache');
    });

    it('should handle errors gracefully', async () => {
      AsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));
      await expect(clearSuggestionsCache()).resolves.not.toThrow();
    });
  });

  describe('hasCachedSuggestions', () => {
    it('should return true when cache exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        suggestions: [{ type: 'quote' }],
        timestamp: Date.now(),
      }));

      const result = await hasCachedSuggestions();
      expect(result).toBe(true);
    });

    it('should return false when cache does not exist', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await hasCachedSuggestions();
      expect(result).toBe(false);
    });

    it('should return false when cache is expired', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        suggestions: [{ type: 'quote' }],
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      }));

      const result = await hasCachedSuggestions();
      expect(result).toBe(false);
    });
  });

  describe('Content Filtering Integration', () => {
    it('should filter suggestions with nudity keywords', async () => {
      const notes = [{ content: 'Test', timestamp: Date.now() }];
      
      callLLM.mockResolvedValue({
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Dance',
              description: 'Nude figures dancing',
              author: 'Artist',
            },
          ]),
        },
      });

      const result = await generateSuggestions(notes);
      
      // Should be filtered out
      expect(result.success).toBe(false);
      expect(result.suggestions).toEqual([]);
    });

    it('should filter suggestions with violence keywords', async () => {
      const notes = [{ content: 'Test', timestamp: Date.now() }];
      
      callLLM.mockResolvedValue({
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Battle',
              description: 'Violent war scene with blood',
              author: 'Artist',
            },
          ]),
        },
      });

      const result = await generateSuggestions(notes);
      
      expect(result.success).toBe(false);
      expect(result.suggestions).toEqual([]);
    });

    it('should filter suggestions with sexual keywords', async () => {
      const notes = [{ content: 'Test', timestamp: Date.now() }];
      
      callLLM.mockResolvedValue({
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Romance',
              description: 'An erotic composition',
              author: 'Artist',
            },
          ]),
        },
      });

      const result = await generateSuggestions(notes);
      
      expect(result.success).toBe(false);
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle suggestions with null/undefined author', async () => {
      const notes = [{ content: 'Test', timestamp: Date.now() }];
      
      callLLM.mockResolvedValueOnce({
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'art',
              title: 'Unknown Artwork',
              description: 'A mysterious painting',
              author: null, // null author
            },
          ]),
        },
      })
      .mockResolvedValueOnce({
        // Fallback quote generation
        success: true,
        data: {
          content: JSON.stringify({
            quote: 'Test quote',
            author: 'Test Author',
            description: 'A meaningful quote',
          }),
        },
      });

      findArtworkImage.mockResolvedValue({
        success: false,
        error: 'Not found',
      });

      const result = await generateSuggestions(notes);
      
      // Should convert to quote and not include "null" in description
      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe('quote');
    });

    it('should handle empty author strings', async () => {
      const notes = [{ content: 'Test', timestamp: Date.now() }];
      
      callLLM.mockResolvedValue({
        success: true,
        data: {
          content: JSON.stringify([
            {
              type: 'quote',
              title: 'Anonymous Quote',
              description: 'A wise saying',
              author: '', // empty author
            },
          ]),
        },
      });

      const result = await generateSuggestions(notes);
      
      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(1);
    });
  });
});
