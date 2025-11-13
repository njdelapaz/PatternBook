import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { DEEPGRAM_API_KEY } from '@env';

/**
 * Transcribe audio file using Deepgram API
 * @param {string} audioUri - Local file URI of the recorded audio
 * @returns {Promise<string>} - Transcribed text
 */
export const transcribeAudioWithDeepgram = async (audioUri) => {
  try {
    if (!DEEPGRAM_API_KEY) {
      throw new Error('Deepgram API key is not configured. Please check your .env file.');
    }

    console.log('Starting transcription with Deepgram API...');
    
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

    // Deepgram API endpoint
    const deepgramUrl = 'https://api.deepgram.com/v1/listen';
    
    // Configure request parameters for optimal transcription
    const params = {
      model: 'nova-2',           // Use Deepgram's Nova-2 model for best accuracy
      language: 'en-us',         // English (US)
      punctuate: true,           // Add punctuation
      smart_format: true,        // Smart formatting for better readability
      diarize: false,           // No speaker diarization needed for single user
      filler_words: false,      // Remove filler words like "um", "uh"
      multichannel: false,      // Single channel audio
    };

    console.log('Sending request to Deepgram API...');
    
    // Make the API request
    const response = await axios.post(deepgramUrl, formData, {
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'multipart/form-data',
      },
      params: params,
      timeout: 30000, // 30 second timeout
    });

    console.log('Deepgram API response received');

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
    console.error('Deepgram transcription error:', error);
    
    // Handle specific error types
    if (error.response) {
      // API returned an error response
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      
      switch (status) {
        case 401:
          throw new Error('Invalid Deepgram API key. Please check your credentials.');
        case 402:
          throw new Error('Deepgram account has insufficient credits. Please top up your account.');
        case 413:
          throw new Error('Audio file is too large. Please record a shorter message.');
        case 429:
          throw new Error('Too many requests. Please wait a moment and try again.');
        default:
          throw new Error(`Deepgram API error (${status}): ${message}`);
      }
    } else if (error.request) {
      // Network error
      throw new Error('Network error. Please check your internet connection and try again.');
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
 * Check if Deepgram API key is configured
 * @returns {boolean} - True if API key is available
 */
export const isDeepgramConfigured = () => {
  return Boolean(DEEPGRAM_API_KEY && DEEPGRAM_API_KEY.trim().length > 0);
};