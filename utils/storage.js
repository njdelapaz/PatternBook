import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTES_STORAGE_KEY, VOICE_API_CONSENT_KEY } from './constants';

/**
 * Get the storage key for a user's notes
 * @param {string} userId - User ID (if null, uses global key for backwards compatibility)
 * @returns {string} Storage key
 */
function getUserNotesKey(userId) {
  return userId ? `${NOTES_STORAGE_KEY}_${userId}` : NOTES_STORAGE_KEY;
}

// AsyncStorage functions
export async function loadNotes(userId = null) {
  try {
    const storageKey = getUserNotesKey(userId);
    const notesJson = await AsyncStorage.getItem(storageKey);
    return notesJson ? JSON.parse(notesJson) : [];
  } catch (error) {
    console.error('Error loading notes:', error);
    return [];
  }
}

export async function saveNotes(notes, userId = null) {
  try {
    const storageKey = getUserNotesKey(userId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(notes));
  } catch (error) {
    console.error('Error saving notes:', error);
  }
}

// Voice API consent functions
export async function hasVoiceApiConsent() {
  try {
    const consent = await AsyncStorage.getItem(VOICE_API_CONSENT_KEY);
    return consent === 'true';
  } catch (error) {
    console.error('Error loading voice API consent:', error);
    return false;
  }
}

export async function setVoiceApiConsent(hasConsent) {
  try {
    await AsyncStorage.setItem(VOICE_API_CONSENT_KEY, hasConsent.toString());
  } catch (error) {
    console.error('Error saving voice API consent:', error);
  }
}