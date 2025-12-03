/**
 * Tests for Artwork Image Service
 */

import { fetchArtworkFromWikipedia, findArtworkImage } from '../artworkImageService';

// Mock fetch globally
global.fetch = jest.fn();

describe('ArtworkImageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchArtworkFromWikipedia', () => {
    it('should successfully fetch artwork image from Wikipedia', async () => {
      // Mock Wikipedia search response
      const searchResponse = {
        query: {
          search: [
            {
              pageid: 12345,
              title: 'The Starry Night',
            },
          ],
        },
      };

      // Mock Wikipedia image response
      const imageResponse = {
        query: {
          pages: {
            12345: {
              pageid: 12345,
              title: 'The Starry Night',
              thumbnail: {
                source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night.jpg/800px-Van_Gogh_-_Starry_Night.jpg',
                width: 800,
                height: 631,
              },
            },
          },
        },
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => imageResponse,
        });

      const result = await fetchArtworkFromWikipedia('The Starry Night', 'Vincent van Gogh');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('wikimedia');
      expect(result.source).toBe('wikipedia');
      expect(result.pageUrl).toContain('curid=12345');
    });

    it('should handle no search results', async () => {
      const searchResponse = {
        query: {
          search: [],
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => searchResponse,
      });

      const result = await fetchArtworkFromWikipedia('Nonexistent Painting', 'Unknown Artist');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No Wikipedia page found');
    });

    it('should handle page without image', async () => {
      const searchResponse = {
        query: {
          search: [
            {
              pageid: 12345,
              title: 'Some Article',
            },
          ],
        },
      };

      const imageResponse = {
        query: {
          pages: {
            12345: {
              pageid: 12345,
              title: 'Some Article',
              // No thumbnail property
            },
          },
        },
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => imageResponse,
        });

      const result = await fetchArtworkFromWikipedia('Article Without Image', 'Author');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No image on Wikipedia page');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchArtworkFromWikipedia('The Scream', 'Edvard Munch');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle malformed search query', async () => {
      const searchResponse = {
        query: {
          search: [
            {
              pageid: 99999,
            },
          ],
        },
      };

      const imageResponse = {
        query: {
          pages: {
            99999: {
              pageid: 99999,
              thumbnail: {
                source: 'https://example.com/image.jpg',
              },
            },
          },
        },
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => imageResponse,
        });

      const result = await fetchArtworkFromWikipedia('', '');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('example.com');
    });

    it('should encode special characters in search query', async () => {
      const searchResponse = {
        query: {
          search: [
            {
              pageid: 54321,
            },
          ],
        },
      };

      const imageResponse = {
        query: {
          pages: {
            54321: {
              thumbnail: {
                source: 'https://example.com/special.jpg',
              },
            },
          },
        },
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => imageResponse,
        });

      const result = await fetchArtworkFromWikipedia(
        'L\'Origine du monde',
        'Gustave Courbet'
      );

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('L\'Origine du monde'))
      );
    });
  });

  describe('findArtworkImage', () => {
    it('should successfully find artwork image', async () => {
      const searchResponse = {
        query: {
          search: [{ pageid: 123 }],
        },
      };

      const imageResponse = {
        query: {
          pages: {
            123: {
              thumbnail: {
                source: 'https://wikimedia.org/image.jpg',
              },
            },
          },
        },
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => imageResponse,
        });

      const result = await findArtworkImage('Mona Lisa', 'Leonardo da Vinci');

      expect(result.success).toBe(true);
      expect(result.imageUrl).toContain('wikimedia');
      expect(result.source).toBe('wikipedia');
    });

    it('should return error when image not found', async () => {
      const searchResponse = {
        query: {
          search: [],
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => searchResponse,
      });

      const result = await findArtworkImage('Unknown Work', 'Unknown Artist');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Image not found on Wikipedia');
    });

    it('should log search attempt', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const searchResponse = {
        query: {
          search: [],
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => searchResponse,
      });

      await findArtworkImage('Test Artwork', 'Test Artist');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Searching Wikipedia for: Test Artwork by Test Artist')
      );

      consoleSpy.mockRestore();
    });

    it('should handle famous artworks correctly', async () => {
      const famousArtworks = [
        { title: 'The Starry Night', artist: 'Vincent van Gogh' },
        { title: 'The Scream', artist: 'Edvard Munch' },
        { title: 'Girl with a Pearl Earring', artist: 'Johannes Vermeer' },
      ];

      for (const artwork of famousArtworks) {
        const searchResponse = {
          query: {
            search: [{ pageid: 123 }],
          },
        };

        const imageResponse = {
          query: {
            pages: {
              123: {
                thumbnail: {
                  source: `https://wikimedia.org/${artwork.title}.jpg`,
                },
              },
            },
          },
        };

        global.fetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => searchResponse,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => imageResponse,
          });

        const result = await findArtworkImage(artwork.title, artwork.artist);

        expect(result.success).toBe(true);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle fetch rejection gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await findArtworkImage('Test', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await findArtworkImage('Test', 'Test');

      expect(result.success).toBe(false);
    });

    it('should handle missing query property', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Empty response
      });

      const result = await findArtworkImage('Test', 'Test');

      expect(result.success).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should work end-to-end for a real artwork', async () => {
      // Simulate a complete successful flow
      const searchResponse = {
        query: {
          search: [
            {
              pageid: 30921,
              title: 'The Starry Night',
              snippet: 'oil painting by Vincent van Gogh',
            },
          ],
        },
      };

      const imageResponse = {
        query: {
          pages: {
            30921: {
              pageid: 30921,
              title: 'The Starry Night',
              thumbnail: {
                source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night.jpg/800px-Van_Gogh_-_Starry_Night.jpg',
                width: 800,
                height: 631,
              },
            },
          },
        },
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => searchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => imageResponse,
        });

      const result = await findArtworkImage('The Starry Night', 'Vincent van Gogh');

      expect(result).toEqual({
        success: true,
        imageUrl: expect.stringContaining('wikimedia.org'),
        source: 'wikipedia',
        pageUrl: expect.stringContaining('curid=30921'),
      });
    });
  });
});

