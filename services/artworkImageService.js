/**
 * Artwork Image Service
 * Fetches artwork images from Wikipedia/Wikimedia Commons for AI-suggested artworks
 * No API key required - completely free!
 */

/**
 * Validate if Wikipedia page is about the artwork (not the artist or something else)
 */
function isRelevantArtworkPage(pageTitle, pageSnippet, artworkTitle, artistName) {
  const titleLower = pageTitle.toLowerCase();
  const snippetLower = pageSnippet.toLowerCase();
  const artworkLower = artworkTitle.toLowerCase();
  const artistLower = artistName.toLowerCase();
  
  // Page title should contain the artwork title
  const titleMatchesArtwork = titleLower.includes(artworkLower);
  
  // Avoid pages that are just about the artist
  const isJustArtistPage = titleLower === artistLower && !titleLower.includes(artworkLower);
  
  // Check if snippet mentions painting/artwork related terms
  const artworkRelatedTerms = ['painting', 'artwork', 'canvas', 'masterpiece', 'created', 'depicts', 'portrait', 'sculpture'];
  const hasArtworkContext = artworkRelatedTerms.some(term => snippetLower.includes(term));
  
  return titleMatchesArtwork && !isJustArtistPage && hasArtworkContext;
}

/**
 * Extract page description/extract from Wikipedia
 */
async function fetchPageMetadata(pageId) {
  try {
    const metadataUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=extracts|categories&exintro=true&explaintext=true&format=json&origin=*`;
    const response = await fetch(metadataUrl);
    const data = await response.json();
    
    const page = data.query.pages[pageId];
    
    return {
      extract: page.extract || '',
      categories: (page.categories || []).map(cat => cat.title.toLowerCase()),
    };
  } catch (error) {
    console.error('[ArtworkImageService] Error fetching metadata:', error);
    return { extract: '', categories: [] };
  }
}

/**
 * Fetch artwork from Wikipedia/Wikimedia Commons
 * More reliable for famous artworks with improved validation
 */
export async function fetchArtworkFromWikipedia(artworkTitle, artistName) {
  try {
    // Search Wikipedia for the artwork with more specific query
    const searchQuery = `${artworkTitle} ${artistName} painting`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*&srlimit=5`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
      console.log(`[ArtworkImageService] No Wikipedia results for: ${searchQuery}`);
      return { success: false, error: 'No Wikipedia page found' };
    }

    // Find the most relevant page (should be about the artwork, not just the artist)
    let bestMatch = null;
    for (const result of searchData.query.search) {
      if (isRelevantArtworkPage(result.title, result.snippet || '', artworkTitle, artistName)) {
        bestMatch = result;
        break;
      }
    }
    
    // If no relevant match found, try the first result
    if (!bestMatch && searchData.query.search.length > 0) {
      bestMatch = searchData.query.search[0];
      console.log(`[ArtworkImageService] No perfect match, trying first result: ${bestMatch.title}`);
    }
    
    if (!bestMatch) {
      return { success: false, error: 'No relevant Wikipedia page found' };
    }

    const pageId = bestMatch.pageid;

    // Get page images with higher resolution
    const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=pageimages|pageterms&format=json&pithumbsize=1000&origin=*`;
    const imageResponse = await fetch(imageUrl);
    const imageData = await imageResponse.json();

    const page = imageData.query.pages[pageId];
    
    // Validate that we actually got an image
    if (page.thumbnail && page.thumbnail.source) {
      const imageUrl = page.thumbnail.source;
      
      // Additional validation: check if it's actually an image URL
      if (!imageUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) && !imageUrl.includes('wikimedia')) {
        console.log(`[ArtworkImageService] Invalid image URL format: ${imageUrl}`);
        return { success: false, error: 'Invalid image URL format' };
      }
      
      // Fetch page metadata (description and categories)
      const metadata = await fetchPageMetadata(pageId);
      
      // Check categories for red flags
      const inappropriateCategories = ['explicit', 'controversial', 'disputed', 'nsfw', 'adult'];
      const hasInappropriateCategory = metadata.categories.some(cat => 
        inappropriateCategories.some(flag => cat.includes(flag))
      );
      
      if (hasInappropriateCategory) {
        console.log(`[ArtworkImageService] Page has inappropriate categories`);
        return { success: false, error: 'Inappropriate content category' };
      }
      
      console.log(`[ArtworkImageService] ✓ Found valid image for ${artworkTitle}`);
      return {
        success: true,
        imageUrl: imageUrl,
        source: 'wikipedia',
        pageUrl: `https://en.wikipedia.org/?curid=${pageId}`,
        pageTitle: page.title,
        metadata: {
          description: metadata.extract,
          categories: metadata.categories,
        },
      };
    }

    console.log(`[ArtworkImageService] No image on Wikipedia page: ${page.title}`);
    return { success: false, error: 'No image on Wikipedia page' };

  } catch (error) {
    console.error('[ArtworkImageService] Wikipedia error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Find artwork image with multiple search strategies
 */
export async function findArtworkImage(artworkTitle, artistName) {
  console.log(`[ArtworkImageService] Searching Wikipedia for: ${artworkTitle} by ${artistName}`);

  // Strategy 1: Full search with both title and artist
  let wikiResult = await fetchArtworkFromWikipedia(artworkTitle, artistName);
  
  if (wikiResult.success) {
    console.log('[ArtworkImageService] ✓ Found on Wikipedia (strategy 1)');
    return wikiResult;
  }

  // Strategy 2: Try with just the artwork title (some artists have variations in their names)
  console.log(`[ArtworkImageService] Trying alternate search: ${artworkTitle} only`);
  wikiResult = await fetchArtworkFromWikipedia(artworkTitle, '');
  
  if (wikiResult.success) {
    console.log('[ArtworkImageService] ✓ Found on Wikipedia (strategy 2)');
    return wikiResult;
  }

  // Strategy 3: Try with artist last name only (e.g., "van Gogh" instead of "Vincent van Gogh")
  if (artistName && artistName.includes(' ')) {
    const artistLastName = artistName.split(' ').pop();
    console.log(`[ArtworkImageService] Trying with artist last name: ${artworkTitle} ${artistLastName}`);
    wikiResult = await fetchArtworkFromWikipedia(artworkTitle, artistLastName);
    
    if (wikiResult.success) {
      console.log('[ArtworkImageService] ✓ Found on Wikipedia (strategy 3)');
      return wikiResult;
    }
  }

  console.log('[ArtworkImageService] ✗ No image found on Wikipedia after all strategies');
  return { success: false, error: 'Image not found on Wikipedia after multiple search strategies' };
}

export default {
  fetchArtworkFromWikipedia,
  findArtworkImage,
};

