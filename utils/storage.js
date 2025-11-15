import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTES_STORAGE_KEY, VOICE_API_CONSENT_KEY } from './constants';

// AsyncStorage functions
export async function loadNotes() {
  try {
    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    return notesJson ? JSON.parse(notesJson) : [];
  } catch (error) {
    console.error('Error loading notes:', error);
    return [];
  }
}

export async function saveNotes(notes) {
  try {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
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