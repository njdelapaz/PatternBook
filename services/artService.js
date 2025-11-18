/**
 * Art Service
 * Fetches artwork from The Metropolitan Museum of Art API
 * API documentation: https://metmuseum.github.io/
 */

const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

/**
 * Search for artworks by query
 * @param {string} query - Search query (artist name, title, keyword)
 * @returns {Promise<Array<number>>} Array of object IDs
 */
export async function searchArtwork(query) {
  if (!query) return [];

  try {
    const url = `${MET_API_BASE}/search?hasImages=true&q=${encodeURIComponent(query)}`;
    console.log('[ArtService] Searching artwork:', query);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.objectIDs && data.objectIDs.length > 0) {
      console.log(`[ArtService] Found ${data.objectIDs.length} artworks`);
      // Return up to 10 results
      return data.objectIDs.slice(0, 10);
    }

    console.log('[ArtService] No artworks found for query:', query);
    return [];
  } catch (error) {
    console.error('[ArtService] Error searching artwork:', error);
    return [];
  }
}

/**
 * Get artwork details by object ID
 * @param {number} objectID - Met Museum object ID
 * @returns {Promise<Object|null>} Artwork details or null if failed
 */
export async function getArtworkDetails(objectID) {
  if (!objectID) return null;

  try {
    const url = `${MET_API_BASE}/objects/${objectID}`;
    console.log('[ArtService] Fetching artwork details:', objectID);
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.objectID) {
      return null;
    }

    // Extract relevant information
    const artwork = {
      objectID: data.objectID,
      title: data.title || 'Untitled',
      artist: data.artistDisplayName || 'Unknown Artist',
      date: data.objectDate || 'Date Unknown',
      medium: data.medium || '',
      department: data.department || '',
      culture: data.culture || '',
      period: data.period || '',
      imageUrl: data.primaryImage || data.primaryImageSmall || null,
      museum: 'The Metropolitan Museum of Art',
      museumUrl: data.objectURL || '',
      creditLine: data.creditLine || '',
      classification: data.classification || '',
      dimensions: data.dimensions || '',
    };

    // Only return if we have an image
    if (!artwork.imageUrl) {
      console.log('[ArtService] Artwork has no image:', objectID);
      return null;
    }

    console.log('[ArtService] Retrieved artwork:', artwork.title);
    return artwork;
  } catch (error) {
    console.error('[ArtService] Error fetching artwork details:', error);
    return null;
  }
}

/**
 * Find a suitable artwork for a theme
 * @param {string} searchQuery - Search query for artwork
 * @returns {Promise<Object|null>} Artwork details or null
 */
export async function findArtworkForTheme(searchQuery) {
  try {
    const objectIDs = await searchArtwork(searchQuery);
    
    if (objectIDs.length === 0) {
      return null;
    }

    // Try to get details for the first few results until we find one with an image
    for (let i = 0; i < Math.min(5, objectIDs.length); i++) {
      const artwork = await getArtworkDetails(objectIDs[i]);
      if (artwork && artwork.imageUrl) {
        return artwork;
      }
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return null;
  } catch (error) {
    console.error('[ArtService] Error finding artwork for theme:', error);
    return null;
  }
}

/**
 * Get random artwork from a specific department
 * @param {string} department - Department name (e.g., 'European Paintings')
 * @returns {Promise<Object|null>} Artwork details or null
 */
export async function getRandomArtwork(department = '') {
  try {
    // Use a broad search to get many results
    const query = department || 'painting';
    const objectIDs = await searchArtwork(query);
    
    if (objectIDs.length === 0) {
      return null;
    }

    // Pick a random artwork
    const randomIndex = Math.floor(Math.random() * Math.min(50, objectIDs.length));
    const artwork = await getArtworkDetails(objectIDs[randomIndex]);
    
    return artwork;
  } catch (error) {
    console.error('[ArtService] Error getting random artwork:', error);
    return null;
  }
}

