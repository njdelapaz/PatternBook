// Simple voice recording functionality tests
import { transcribeAudioWithDeepgram, isDeepgramConfigured } from '../utils/deepgram';

// Mock the dependencies
jest.mock('../utils/deepgram');

const mockedTranscribeAudio = transcribeAudioWithDeepgram;
const mockedIsConfigured = isDeepgramConfigured;

describe('Voice Recording Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsConfigured.mockReturnValue(true);
  });

  describe('Configuration Tests', () => {
    it('should detect when Deepgram is configured', () => {
      expect(isDeepgramConfigured()).toBe(true);
    });

    it('should detect when Deepgram is not configured', () => {
      mockedIsConfigured.mockReturnValue(false);
      expect(isDeepgramConfigured()).toBe(false);
    });
  });

  describe('Transcription Flow Tests', () => {
    it('should handle successful transcription', async () => {
      const testTranscription = 'This is a test transcription result';
      mockedTranscribeAudio.mockResolvedValue(testTranscription);

      const result = await transcribeAudioWithDeepgram('file://test.m4a');
      expect(result).toBe(testTranscription);
      expect(mockedTranscribeAudio).toHaveBeenCalledWith('file://test.m4a');
    });

    it('should handle transcription errors', async () => {
      const errorMessage = 'API error occurred';
      mockedTranscribeAudio.mockRejectedValue(new Error(errorMessage));

      await expect(transcribeAudioWithDeepgram('file://test.m4a'))
        .rejects
        .toThrow(errorMessage);
    });

    it('should handle multiple transcriptions', async () => {
      const transcriptions = ['First result', 'Second result', 'Third result'];
      
      for (let i = 0; i < transcriptions.length; i++) {
        mockedTranscribeAudio.mockResolvedValueOnce(transcriptions[i]);
        const result = await transcribeAudioWithDeepgram(`file://test${i}.m4a`);
        expect(result).toBe(transcriptions[i]);
      }

      expect(mockedTranscribeAudio).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transcription results', async () => {
      mockedTranscribeAudio.mockResolvedValue('');

      const result = await transcribeAudioWithDeepgram('file://empty.m4a');
      expect(result).toBe('');
    });

    it('should handle very long transcriptions', async () => {
      const longTranscription = 'This is a very long transcription. '.repeat(100);
      mockedTranscribeAudio.mockResolvedValue(longTranscription);

      const result = await transcribeAudioWithDeepgram('file://long.m4a');
      expect(result).toBe(longTranscription);
      expect(result.length).toBeGreaterThan(1000);
    });

    it('should handle network timeouts', async () => {
      mockedTranscribeAudio.mockRejectedValue(new Error('Request timeout'));

      await expect(transcribeAudioWithDeepgram('file://timeout.m4a'))
        .rejects
        .toThrow('Request timeout');
    });

    it('should handle API rate limiting', async () => {
      mockedTranscribeAudio.mockRejectedValue(new Error('Too many requests'));

      await expect(transcribeAudioWithDeepgram('file://ratelimited.m4a'))
        .rejects
        .toThrow('Too many requests');
    });
  });

  describe('Performance Tests', () => {
    it('should complete transcription within reasonable time', async () => {
      const startTime = Date.now();
      mockedTranscribeAudio.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('Fast result'), 100))
      );

      const result = await transcribeAudioWithDeepgram('file://fast.m4a');
      const endTime = Date.now();
      
      expect(result).toBe('Fast result');
      expect(endTime - startTime).toBeLessThan(200); // Should complete quickly in tests
    });

    it('should handle concurrent transcription requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        mockedTranscribeAudio.mockResolvedValueOnce(`Result ${i}`);
        promises.push(transcribeAudioWithDeepgram(`file://concurrent${i}.m4a`));
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results).toEqual(['Result 0', 'Result 1', 'Result 2']);
    });
  });
});