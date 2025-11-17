// Storage keys
export const NOTES_STORAGE_KEY = '@patternbook_notes';
export const VOICE_API_CONSENT_KEY = '@patternbook_voice_api_consent';
export const CHAT_HISTORY_KEY = '@patternbook_chat_history';

// Themes
export const darkTheme = {
  backgroundColor: '#000000',
  cardBackground: '#2a2a2a',
  textColor: '#FFFFFF',
  secondaryTextColor: '#999999',
  placeholderColor: '#666666',
  accentColor: '#C8D5B9',
  iconColor: '#FFFFFF',
  navBackground: '#000000',
  borderColor: '#2a2a2a',
  headerBackground: '#000000',
  inputBackground: '#2a2a2a',
};

export const lightTheme = {
  backgroundColor: '#ffffff',
  cardBackground: '#f9f9f9',
  textColor: '#000000',
  secondaryTextColor: '#8e8e93',
  placeholderColor: '#c7c7cc',
  accentColor: '#007AFF',
  iconColor: '#8e8e93',
  navBackground: '#ffffff',
  borderColor: '#e5e5ea',
  headerBackground: '#ffffff',
  inputBackground: '#f2f2f7',
};

// Retrieval configuration
export const RETRIEVAL_CONFIG = {
  TOP_K: 5, // Number of chunks to retrieve
  MIN_SCORE: 0.01, // Minimum relevance score
  CHUNK_SIZE: 500, // Characters per chunk
  OVERLAP: 100, // Overlap between chunks
};