import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { getBackendUrl } from './backendConfig';

/**
 * Transcribe audio file using Deepgram API
 * @param {string} audioUri - Local file URI of the recorded audio
 * @returns {Promise<string>} - Transcribed text
 */
export const transcribeAudioWithDeepgram = async (audioUri) => {
  try {
    const backendBaseUrl = getBackendUrl();
    console.log('Starting transcription via backend server:', backendBaseUrl);

    // Get file info for proper content type
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      throw new Error('Audio file does not exist');
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    });

    // Backend API endpoint
    const backendUrl = `${backendBaseUrl}/api/deepgram/transcribe`;

    // Configure request parameters for optimal transcription
    const params = {
      model: 'nova-2',           // Use Deepgram's Nova-2 model for best accuracy
      language: 'en-us',         // English (US)
      punctuate: 'true',         // Add punctuation
      smart_format: 'true',      // Smart formatting for better readability
      diarize: 'false',          // No speaker diarization needed for single user
      filler_words: 'false',     // Remove filler words like "um", "uh"
      multichannel: 'false',     // Single channel audio
    };

    console.log('Sending request to backend server...');

    // Make the API request to backend
    const response = await axios.post(backendUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: params,
      timeout: 60000, // 60 second timeout (increased for backend relay)
    });

    console.log('Backend server response received');

    // Extract transcription from response
    const results = response.data?.results;
    if (!results || !results.channels || results.channels.length === 0) {
      throw new Error('No transcription results returned from Deepgram');
    }

    const alternatives = results.channels[0]?.alternatives;
    if (!alternatives || alternatives.length === 0) {
      throw new Error('No transcription alternatives found');
    }

    const transcript = alternatives[0]?.transcript;
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Empty transcription returned. Please try speaking more clearly or check your microphone.');
    }

    console.log('Transcription successful:', transcript.substring(0, 100) + '...');
    return transcript.trim();

  } catch (error) {
    console.error('Transcription error:', error);

    // Handle specific error types
    if (error.response) {
      // Backend/API returned an error response
      const status = error.response.status;
      const message = error.response.data?.error || error.response.data?.message || error.response.statusText;

      switch (status) {
        case 401:
          throw new Error('Authentication error. Please check server configuration.');
        case 402:
          throw new Error('Deepgram account has insufficient credits. Please top up your account.');
        case 413:
          throw new Error('Audio file is too large. Please record a shorter message.');
        case 429:
          throw new Error('Too many requests. Please wait a moment and try again.');
        case 500:
          throw new Error('Server error. Please try again later.');
        case 504:
          throw new Error('Request timed out. Please try again.');
        default:
          throw new Error(`Transcription error (${status}): ${message}`);
      }
    } else if (error.request) {
      // Network error
      throw new Error('Cannot connect to server. Please ensure the backend server is running.');
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      throw new Error('Transcription timed out. Please try with a shorter recording.');
    } else {
      // Other errors
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }
};

/**
 * Check if backend server is configured
 * @returns {boolean} - True if backend URL is available
 */
export const isDeepgramConfigured = () => {
  const url = getBackendUrl();
  return Boolean(url && url.trim().length > 0);
};