/**
 * Artwork Image Service
 * Fetches artwork images from Wikipedia/Wikimedia Commons for AI-suggested artworks
 * No API key required - completely free!
 */

/**
 * Fetch artwork from Wikipedia/Wikimedia Commons
 * More reliable for famous artworks
 */
export async function fetchArtworkFromWikipedia(artworkTitle, artistName) {
  try {
    // Search Wikipedia for the artwork
    const searchQuery = `${artworkTitle} ${artistName}`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
      return { success: false, error: 'No Wikipedia page found' };
    }

    const pageId = searchData.query.search[0].pageid;

    // Get page images
    const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
    const imageResponse = await fetch(imageUrl);
    const imageData = await imageResponse.json();

    const page = imageData.query.pages[pageId];
    
    if (page.thumbnail && page.thumbnail.source) {
      return {
        success: true,
        imageUrl: page.thumbnail.source,
        source: 'wikipedia',
        pageUrl: `https://en.wikipedia.org/?curid=${pageId}`,
      };
    }

    return { success: false, error: 'No image on Wikipedia page' };

  } catch (error) {
    console.error('[ArtworkImageService] Wikipedia error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Find artwork image (Wikipedia only)
 */
export async function findArtworkImage(artworkTitle, artistName) {
  console.log(`[ArtworkImageService] Searching Wikipedia for: ${artworkTitle} by ${artistName}`);

  const wikiResult = await fetchArtworkFromWikipedia(artworkTitle, artistName);
  
  if (wikiResult.success) {
    console.log('[ArtworkImageService] Found on Wikipedia');
    return wikiResult;
  }

  console.log('[ArtworkImageService] No image found on Wikipedia');
  return { success: false, error: 'Image not found on Wikipedia' };
}

export default {
  fetchArtworkFromWikipedia,
  findArtworkImage,
};

