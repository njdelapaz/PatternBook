/**
 * Image Cache Service
 * Handles temporary caching of images from external sources
 * Images expire after 7 days
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = FileSystem.cacheDirectory + 'suggestions/';
const CACHE_INDEX_KEY = '@patternbook_image_cache_index';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Initialize cache directory
 */
async function ensureCacheDir() {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Get cache index from AsyncStorage
 */
async function getCacheIndex() {
  try {
    const index = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    return index ? JSON.parse(index) : {};
  } catch (error) {
    console.error('[ImageCache] Error reading cache index:', error);
    return {};
  }
}

/**
 * Save cache index to AsyncStorage
 */
async function saveCacheIndex(index) {
  try {
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('[ImageCache] Error saving cache index:', error);
  }
}

/**
 * Generate cache key from URL
 */
function getCacheKey(url) {
  // Simple hash function for URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get cached image or download and cache it
 * @param {string} url - Image URL to cache
 * @returns {Promise<string|null>} Local file URI or null if failed
 */
export async function getCachedImage(url) {
  if (!url) return null;

  try {
    await ensureCacheDir();
    const cacheIndex = await getCacheIndex();
    const cacheKey = getCacheKey(url);
    const cached = cacheIndex[cacheKey];

    // Check if cached and not expired
    if (cached && cached.expiresAt > Date.now()) {
      const fileInfo = await FileSystem.getInfoAsync(cached.localUri);
      if (fileInfo.exists) {
        console.log('[ImageCache] Using cached image:', cacheKey);
        return cached.localUri;
      }
    }

    // Download and cache new image
    console.log('[ImageCache] Downloading image:', url);
    const fileExtension = url.split('.').pop().split('?')[0] || 'jpg';
    const localUri = CACHE_DIR + cacheKey + '.' + fileExtension;

    const downloadResult = await FileSystem.downloadAsync(url, localUri);
    
    if (downloadResult.status === 200) {
      // Update cache index
      cacheIndex[cacheKey] = {
        url: url,
        localUri: localUri,
        cachedAt: Date.now(),
        expiresAt: Date.now() + CACHE_TTL,
      };
      await saveCacheIndex(cacheIndex);
      
      console.log('[ImageCache] Image cached successfully:', cacheKey);
      return localUri;
    } else {
      console.error('[ImageCache] Download failed with status:', downloadResult.status);
      return null;
    }
  } catch (error) {
    console.error('[ImageCache] Error caching image:', error);
    return null;
  }
}

/**
 * Clear expired cache entries
 */
export async function clearOldCache() {
  try {
    await ensureCacheDir();
    const cacheIndex = await getCacheIndex();
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of Object.entries(cacheIndex)) {
      if (entry.expiresAt < now) {
        // Delete file
        try {
          const fileInfo = await FileSystem.getInfoAsync(entry.localUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
          }
          delete cacheIndex[key];
          cleaned++;
        } catch (error) {
          console.error('[ImageCache] Error deleting cached file:', error);
        }
      }
    }

    if (cleaned > 0) {
      await saveCacheIndex(cacheIndex);
      console.log(`[ImageCache] Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  } catch (error) {
    console.error('[ImageCache] Error clearing old cache:', error);
    return 0;
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache() {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    await AsyncStorage.removeItem(CACHE_INDEX_KEY);
    console.log('[ImageCache] All cache cleared');
  } catch (error) {
    console.error('[ImageCache] Error clearing all cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const cacheIndex = await getCacheIndex();
    const entries = Object.values(cacheIndex);
    const now = Date.now();
    
    const valid = entries.filter(e => e.expiresAt > now).length;
    const expired = entries.filter(e => e.expiresAt <= now).length;

    return {
      total: entries.length,
      valid,
      expired,
    };
  } catch (error) {
    console.error('[ImageCache] Error getting cache stats:', error);
    return { total: 0, valid: 0, expired: 0 };
  }
}

