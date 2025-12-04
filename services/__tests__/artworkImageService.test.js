/**
 * Tests for Artwork Image Service
 */

import { fetchArtworkFromWikipedia, findArtworkImage, validateImageUrl } from '../artworkImageService';

// Mock fetch globally
global.fetch = jest.fn();

describe('Artwork Image Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchArtworkFromWikipedia', () => {
    it('should fetch artwork successfully with valid metadata', async () => {
      // Mock search response
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            search: [
              {
                pageid: 123,
                title: 'Starry Night',
                snippet: 'Famous painting created by Vincent van Gogh',
              },
            ],
          },
        }),
      });

      // Mock image response
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {
              123: {
                title: 'Starry Night',
                thumbnail: {
                  source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/starry-night.jpg',
                },
              },
            },
          },
        }),
      });

      // Mock metadata response
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {
              123: {
                extract: 'The Starry Night is an oil painting depicting a night sky with swirling stars.',
                categories: [
                  { title: 'Category:Paintings by Vincent van Gogh' },
                  { title: 'Category:1889 paintings' },
                ],
              },
            },
          },
        }),
      });

      const result = await fetchArtworkFromWikipedia('Starry Night', 'Vincent van Gogh');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('wikimedia.org');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.description).toContain('oil painting');
    });

    it('should reject artwork with inappropriate categories', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            search: [{ pageid: 456, title: 'Test', snippet: 'painting' }],
          },
        }),
      });

      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {
              456: {
                thumbnail: { source: 'https://example.com/image.jpg' },
              },
            },
          },
        }),
      });

      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {
              456: {
                extract: 'Description',
                categories: [
                  { title: 'Category:Explicit content' },
                  { title: 'Category:Controversial artworks' },
                ],
              },
            },
          },
        }),
      });

      const result = await fetchArtworkFromWikipedia('Test', 'Artist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Inappropriate content category');
    });

    it('should handle no search results', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            search: [],
          },
        }),
      });

      const result = await fetchArtworkFromWikipedia('Nonexistent Painting', 'Unknown Artist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No Wikipedia');
    });

    it('should accept Wikimedia URLs without explicit file extensions', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            search: [{ pageid: 789, title: 'Test', snippet: 'painting' }],
          },
        }),
      });

      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {
              789: {
                thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/abc123' }, // Wikimedia without extension
              },
            },
          },
        }),
      });

      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {
              789: {
                extract: 'Valid artwork description',
                categories: [{ title: 'Category:Paintings' }],
              },
            },
          },
        }),
      });

      const result = await fetchArtworkFromWikipedia('Test', 'Artist');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('wikimedia');
    });

    it('should reject non-Wikimedia URLs without file extensions', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            search: [{ pageid: 789, title: 'Test', snippet: 'painting' }],
          },
        }),
      });

      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {
              789: {
                thumbnail: { source: 'https://example.com/not-an-image' }, // Non-Wikimedia, no extension
              },
            },
          },
        }),
      });

      const result = await fetchArtworkFromWikipedia('Test', 'Artist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image URL format');
    });

    it('should handle fetch errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchArtworkFromWikipedia('Test', 'Artist');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should prefer artwork pages over artist pages', async () => {
      // Mock search with both artist and artwork pages
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            search: [
              {
                pageid: 1,
                title: 'Vincent van Gogh',
                snippet: 'Dutch post-impressionist artist',
              },
              {
                pageid: 2,
                title: 'Starry Night',
                snippet: 'Famous painting created by Vincent van Gogh depicting a night sky',
              },
            ],
          },
        }),
      });

      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {
              2: {
                title: 'Starry Night',
                thumbnail: { source: 'https://upload.wikimedia.org/starry-night.jpg' },
              },
            },
          },
        }),
      });

      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {
              2: {
                extract: 'The Starry Night is a famous painting',
                categories: [{ title: 'Category:Paintings' }],
              },
            },
          },
        }),
      });

      const result = await fetchArtworkFromWikipedia('Starry Night', 'Vincent van Gogh');

      expect(result.success).toBe(true);
      expect(result.pageTitle).toBe('Starry Night');
    });
  });

  describe('findArtworkImage', () => {
    it('should try multiple search strategies', async () => {
      // Strategy 1 fails (full search)
      fetch
        .mockResolvedValueOnce({
          json: async () => ({ query: { search: [] } }),
        })
        // Strategy 2 succeeds (title only)
        .mockResolvedValueOnce({
          json: async () => ({
            query: {
              search: [{ pageid: 111, title: 'Artwork', snippet: 'painting' }],
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            query: {
              pages: {
                111: {
                  thumbnail: { source: 'https://upload.wikimedia.org/image.jpg' },
                },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            query: {
              pages: {
                111: {
                  extract: 'Description',
                  categories: [{ title: 'Category:Paintings' }],
                },
              },
            },
          }),
        });

      const result = await findArtworkImage('Artwork', 'Long Artist Name');

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(4); // 1 failed search + 3 for success
    });

    it('should try artist last name strategy', async () => {
      // Mock failures for first two strategies
      fetch
        .mockResolvedValueOnce({
          json: async () => ({ query: { search: [] } }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ query: { search: [] } }),
        })
        // Strategy 3 succeeds (last name)
        .mockResolvedValueOnce({
          json: async () => ({
            query: {
              search: [{ pageid: 222, title: 'Art', snippet: 'painting' }],
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            query: {
              pages: {
                222: {
                  thumbnail: { source: 'https://wikimedia.org/art.jpg' },
                },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            query: {
              pages: {
                222: {
                  extract: 'Painting description',
                  categories: [],
                },
              },
            },
          }),
        });

      const result = await findArtworkImage('Art', 'Vincent van Gogh');

      expect(result.success).toBe(true);
    });

    it('should return error after all strategies fail', async () => {
      // All strategies return no results
      fetch
        .mockResolvedValueOnce({
          json: async () => ({ query: { search: [] } }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ query: { search: [] } }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ query: { search: [] } }),
        });

      const result = await findArtworkImage('Unknown', 'Unknown Artist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('after multiple search strategies');
    });
  });

  describe('validateImageUrl', () => {
    it('should accept Wikimedia URLs without file extensions', () => {
      const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/abc123';
      expect(validateImageUrl(url)).toBe(true);
    });

    it('should accept Wikipedia URLs without file extensions', () => {
      const url = 'https://en.wikipedia.org/static/images/project-logos/enwiki.png';
      expect(validateImageUrl(url)).toBe(true);
    });

    it('should accept URLs with image extensions from other sources', () => {
      const url = 'https://example.com/image.jpg';
      expect(validateImageUrl(url)).toBe(true);
    });

    it('should reject non-Wikimedia URLs without extensions', () => {
      const url = 'https://example.com/not-an-image';
      expect(validateImageUrl(url)).toBe(false);
    });

    it('should accept various image formats', () => {
      const formats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      formats.forEach(format => {
        const url = `https://example.com/image${format}`;
        expect(validateImageUrl(url)).toBe(true);
      });
    });

    it('should handle errors gracefully', () => {
      expect(validateImageUrl(null)).toBe(false);
      expect(validateImageUrl(undefined)).toBe(false);
    });
  });

  describe('API response validation', () => {
    it('should handle malformed Wikipedia API response', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            search: [{ pageid: 123, title: 'Test', snippet: 'painting' }],
          },
        }),
      });

      // Return malformed response (missing query.pages)
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {}, // No pages property
        }),
      });

      const result = await fetchArtworkFromWikipedia('Test', 'Artist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Malformed Wikipedia API response');
    });

    it('should handle missing page data in API response', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            search: [{ pageid: 999, title: 'Test', snippet: 'painting' }],
          },
        }),
      });

      // Return response with empty pages
      fetch.mockResolvedValueOnce({
        json: async () => ({
          query: {
            pages: {}, // pageId 999 doesn't exist in pages
          },
        }),
      });

      const result = await fetchArtworkFromWikipedia('Test', 'Artist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Page data not found');
    });
  });
});
