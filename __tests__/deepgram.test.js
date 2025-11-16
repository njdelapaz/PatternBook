import { transcribeAudioWithDeepgram, isDeepgramConfigured } from '../utils/deepgram';
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock FileSystem
jest.mock('expo-file-system/legacy');
const mockedFileSystem = FileSystem;

describe('Deepgram Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isDeepgramConfigured', () => {
    it('should return true when API key is configured', () => {
      // The mock @env should provide a test API key
      expect(isDeepgramConfigured()).toBe(true);
    });
  });

  describe('transcribeAudioWithDeepgram', () => {
    const mockAudioUri = 'file:///path/to/audio.m4a';
    const mockTranscription = 'Hello, this is a test transcription.';

    beforeEach(() => {
      // Mock FileSystem.getInfoAsync
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      // Mock successful Deepgram API response
      mockedAxios.post.mockResolvedValue({
        data: {
          results: {
            channels: [
              {
                alternatives: [
                  {
                    transcript: mockTranscription
                  }
                ]
              }
            ]
          }
        }
      });
    });

    it('should successfully transcribe audio with valid response', async () => {
      const result = await transcribeAudioWithDeepgram(mockAudioUri);

      expect(result).toBe(mockTranscription);
      expect(mockedFileSystem.getInfoAsync).toHaveBeenCalledWith(mockAudioUri);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.deepgram.com/v1/listen',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Token'),
            'Content-Type': 'multipart/form-data'
          }),
          params: expect.objectContaining({
            model: 'nova-2',
            language: 'en-us',
            punctuate: true,
            smart_format: true
          }),
          timeout: 30000
        })
      );
    });

    it('should throw error when file does not exist', async () => {
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: false
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('Audio file does not exist');
    });

    it('should throw error when API returns 401 (invalid API key)', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 401,
          statusText: 'Unauthorized'
        }
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('Invalid Deepgram API key. Please check your credentials.');
    });

    it('should throw error when API returns 402 (insufficient credits)', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 402,
          statusText: 'Payment Required'
        }
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('Deepgram account has insufficient credits. Please top up your account.');
    });

    it('should throw error when API returns 413 (file too large)', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 413,
          statusText: 'Payload Too Large'
        }
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('Audio file is too large. Please record a shorter message.');
    });

    it('should throw error when API returns 429 (rate limit)', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 429,
          statusText: 'Too Many Requests'
        }
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('Too many requests. Please wait a moment and try again.');
    });

    it('should handle network errors', async () => {
      mockedAxios.post.mockRejectedValue({
        request: {}
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('Network error. Please check your internet connection and try again.');
    });

    it('should handle timeout errors', async () => {
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNABORTED'
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('Transcription timed out. Please try with a shorter recording.');
    });

    it('should throw error when no transcription results are returned', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          results: null
        }
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('No transcription results returned from Deepgram');
    });

    it('should throw error when no alternatives are found', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          results: {
            channels: [
              {
                alternatives: []
              }
            ]
          }
        }
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('No transcription alternatives found');
    });

    it('should throw error when transcript is empty', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          results: {
            channels: [
              {
                alternatives: [
                  {
                    transcript: '   '
                  }
                ]
              }
            ]
          }
        }
      });

      await expect(transcribeAudioWithDeepgram(mockAudioUri))
        .rejects
        .toThrow('Empty transcription returned. Please try speaking more clearly or check your microphone.');
    });

    it('should trim whitespace from successful transcription', async () => {
      const transcriptWithWhitespace = '   Hello, world!   ';
      mockedAxios.post.mockResolvedValue({
        data: {
          results: {
            channels: [
              {
                alternatives: [
                  {
                    transcript: transcriptWithWhitespace
                  }
                ]
              }
            ]
          }
        }
      });

      const result = await transcribeAudioWithDeepgram(mockAudioUri);
      expect(result).toBe('Hello, world!');
    });
  });
});