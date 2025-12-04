/**
 * Artwork Image Service
 * Fetches artwork images from Wikipedia/Wikimedia Commons for AI-suggested artworks
 * No API key required - completely free!
 */

import { scanForInappropriateKeywords } from '../utils/contentValidation';

/**
 * Validate image URL to ensure it's actually an image
 * Made more lenient to allow more artwork images through
 */
export function validateImageUrl(imageUrl) {
  try {
    // Handle null/undefined
    if (!imageUrl || typeof imageUrl !== 'string') {
      return false;
    }
    
    // Be very lenient - trust Wikipedia/Wikimedia sources
    const urlLower = imageUrl.toLowerCase();
    
    // Accept if it's from Wikipedia/Wikimedia (our trusted source)
    const isFromTrustedSource = urlLower.includes('wikimedia') || urlLower.includes('wikipedia');
    
    if (isFromTrustedSource) {
      return true;
    }
    
    // For other sources, check for image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => urlLower.includes(ext));
    
    if (!hasImageExtension) {
      console.warn('[ArtworkImageService] Image URL appears invalid:', imageUrl);
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}


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
 * Extract page description/extract from Wikipedia with full content
 */
async function fetchPageMetadata(pageId) {
  try {
    // Get both intro extract and full page content
    const metadataUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=extracts|categories&exintro=true&explaintext=true&format=json&origin=*`;
    const fullContentUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=extracts&explaintext=true&format=json&origin=*`;
    
    const [metadataResponse, fullContentResponse] = await Promise.all([
      fetch(metadataUrl),
      fetch(fullContentUrl),
    ]);
    
    const metadataData = await metadataResponse.json();
    const fullContentData = await fullContentResponse.json();
    
    // Safely access pages - API may return empty/invalid response
    const metadataPage = metadataData?.query?.pages?.[pageId];
    const fullContentPage = fullContentData?.query?.pages?.[pageId];
    
    // Return early with empty data if pages are missing
    if (!metadataPage || !fullContentPage) {
      console.warn('[ArtworkImageService] Missing page data in API response for pageId:', pageId);
      return { extract: '', fullContent: '', categories: [] };
    }
    
    return {
      extract: metadataPage.extract || '',
      fullContent: fullContentPage.extract || '',
      categories: (metadataPage.categories || []).map(cat => cat.title.toLowerCase()),
    };
  } catch (error) {
    console.error('[ArtworkImageService] Error fetching metadata:', error);
    return { extract: '', fullContent: '', categories: [] };
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

    // Validate API response structure
    if (!imageData.query || !imageData.query.pages) {
      console.log(`[ArtworkImageService] Malformed Wikipedia API response`);
      return { success: false, error: 'Malformed Wikipedia API response' };
    }

    const page = imageData.query.pages[pageId];
    
    // Validate that page exists and has an image
    if (!page) {
      console.log(`[ArtworkImageService] Page data not found in API response`);
      return { success: false, error: 'Page data not found' };
    }
    
    if (page.thumbnail && page.thumbnail.source) {
      const imageUrl = page.thumbnail.source;
      
      // Be lenient with Wikipedia/Wikimedia URLs - they're trusted sources
      // Only reject if it's clearly not an image
      const isWikimediaUrl = imageUrl.includes('wikimedia') || imageUrl.includes('wikipedia');
      const hasImageExtension = imageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/i);
      
      if (!isWikimediaUrl && !hasImageExtension) {
        console.log(`[ArtworkImageService] Invalid image URL format: ${imageUrl}`);
        return { success: false, error: 'Invalid image URL format' };
      }
      
      // Fetch page metadata (description and categories)
      const metadata = await fetchPageMetadata(pageId);
      
      // Check categories for red flags (including artistic nudity)
      const inappropriateCategories = ['explicit', 'controversial', 'disputed', 'nsfw', 'adult', 'nude', 'nudity', 'erotic'];
      const hasInappropriateCategory = metadata.categories.some(cat => 
        inappropriateCategories.some(flag => cat.includes(flag))
      );
      
      if (hasInappropriateCategory) {
        console.log(`[ArtworkImageService] Page has inappropriate categories:`, metadata.categories.filter(cat => 
          inappropriateCategories.some(flag => cat.includes(flag))
        ));
        return { success: false, error: 'Inappropriate content category' };
      }
      
      // Check description/extract for inappropriate content
      const extractScan = scanForInappropriateKeywords(metadata.extract);
      if (extractScan.hasIssues) {
        console.log(`[ArtworkImageService] Page extract contains inappropriate content:`, extractScan.issues);
        return { success: false, error: 'Artwork contains inappropriate content in description' };
      }
      
      // Check FULL Wikipedia page content for inappropriate keywords
      const fullContentScan = scanForInappropriateKeywords(metadata.fullContent);
      if (fullContentScan.hasIssues) {
        console.log(`[ArtworkImageService] Full page content contains inappropriate material:`, fullContentScan.issues.slice(0, 3));
        return { 
          success: false, 
          error: 'Artwork contains inappropriate content',
          details: fullContentScan.issues.map(i => i.keyword).slice(0, 3).join(', '),
        };
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

    // Safe logging with fallback
    const pageTitle = page && page.title ? page.title : artworkTitle;
    console.log(`[ArtworkImageService] No image on Wikipedia page: ${pageTitle}`);
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
  validateImageUrl,
};

