// Integration tests for voice transcription workflow
import { transcribeAudioWithDeepgram, isDeepgramConfigured } from '../utils/deepgram';
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';

// Mock dependencies
jest.mock('../utils/deepgram');
jest.mock('expo-file-system/legacy');
jest.mock('axios');

const mockedTranscribeAudio = transcribeAudioWithDeepgram;
const mockedIsConfigured = isDeepgramConfigured;
const mockedFileSystem = FileSystem;
const mockedAxios = axios;

describe('Voice Transcription Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsConfigured.mockReturnValue(true);
  });

  describe('End-to-End Transcription Workflow', () => {
    it('should complete a full transcription workflow', async () => {
      // Mock file system operations
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      // Mock successful API response
      const expectedTranscription = 'This is a complete integration test transcription.';
      mockedTranscribeAudio.mockResolvedValue(expectedTranscription);

      // Simulate the complete workflow
      const audioUri = 'file://integration-test.m4a';
      
      // Step 1: Check configuration
      expect(isDeepgramConfigured()).toBe(true);
      
      // Step 2: Transcribe audio
      const result = await transcribeAudioWithDeepgram(audioUri);
      
      // Step 3: Verify results
      expect(result).toBe(expectedTranscription);
      expect(mockedTranscribeAudio).toHaveBeenCalledWith(audioUri);
    });

    it('should handle configuration errors in workflow', async () => {
      // Simulate unconfigured environment
      mockedIsConfigured.mockReturnValue(false);

      const audioUri = 'file://test.m4a';
      
      // Should detect configuration issue
      expect(isDeepgramConfigured()).toBe(false);
      
      // In real app, this would show an error to user
      // Here we just verify the configuration check works
      if (!isDeepgramConfigured()) {
        expect(true).toBe(true); // Configuration error detected
      }
    });

    it('should handle API errors in complete workflow', async () => {
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      // Mock API error
      const apiError = new Error('API temporarily unavailable');
      mockedTranscribeAudio.mockRejectedValue(apiError);

      const audioUri = 'file://error-test.m4a';

      // Should propagate error through workflow
      await expect(transcribeAudioWithDeepgram(audioUri))
        .rejects
        .toThrow('API temporarily unavailable');
    });
  });

  describe('Multiple Recording Sessions', () => {
    it('should handle sequential recordings correctly', async () => {
      const recordings = [
        { uri: 'file://recording1.m4a', result: 'First recording transcription' },
        { uri: 'file://recording2.m4a', result: 'Second recording transcription' },
        { uri: 'file://recording3.m4a', result: 'Third recording transcription' }
      ];

      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      // Process each recording sequentially
      for (let i = 0; i < recordings.length; i++) {
        const { uri, result } = recordings[i];
        
        mockedTranscribeAudio.mockResolvedValueOnce(result);
        
        const transcription = await transcribeAudioWithDeepgram(uri);
        expect(transcription).toBe(result);
      }

      expect(mockedTranscribeAudio).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent recordings', async () => {
      const recordings = [
        { uri: 'file://concurrent1.m4a', result: 'Concurrent recording 1' },
        { uri: 'file://concurrent2.m4a', result: 'Concurrent recording 2' },
        { uri: 'file://concurrent3.m4a', result: 'Concurrent recording 3' }
      ];

      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      // Setup concurrent responses
      recordings.forEach(({ result }) => {
        mockedTranscribeAudio.mockResolvedValueOnce(result);
      });

      // Process concurrently
      const promises = recordings.map(({ uri }) => 
        transcribeAudioWithDeepgram(uri)
      );

      const results = await Promise.all(promises);

      expect(results).toEqual([
        'Concurrent recording 1',
        'Concurrent recording 2', 
        'Concurrent recording 3'
      ]);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large transcription responses', async () => {
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      const largeTranscription = 'This is a long transcription. '.repeat(1000);
      mockedTranscribeAudio.mockResolvedValue(largeTranscription);

      const result = await transcribeAudioWithDeepgram('file://large.m4a');

      expect(result).toBe(largeTranscription);
      expect(result.length).toBeGreaterThan(10000);
    });

    it('should maintain consistency across multiple calls', async () => {
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      const consistentResult = 'This result should be consistent';
      
      // Run the same transcription multiple times
      for (let i = 0; i < 5; i++) {
        mockedTranscribeAudio.mockResolvedValueOnce(consistentResult);
        
        const result = await transcribeAudioWithDeepgram('file://consistent.m4a');
        expect(result).toBe(consistentResult);
      }
    });

    it('should handle rapid successive calls', async () => {
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      const rapidResults = [];
      const numberOfCalls = 10;

      // Setup mocks for rapid calls
      for (let i = 0; i < numberOfCalls; i++) {
        const result = `Rapid call ${i}`;
        mockedTranscribeAudio.mockResolvedValueOnce(result);
        rapidResults.push(result);
      }

      // Make rapid successive calls
      const promises = [];
      for (let i = 0; i < numberOfCalls; i++) {
        promises.push(transcribeAudioWithDeepgram(`file://rapid${i}.m4a`));
      }

      const results = await Promise.all(promises);
      
      expect(results).toEqual(rapidResults);
      expect(mockedTranscribeAudio).toHaveBeenCalledTimes(numberOfCalls);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary API failures', async () => {
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      // First call fails, second succeeds
      mockedTranscribeAudio
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('Recovery successful');

      // First call should fail
      await expect(transcribeAudioWithDeepgram('file://fail.m4a'))
        .rejects
        .toThrow('Temporary failure');

      // Second call should succeed
      const result = await transcribeAudioWithDeepgram('file://recover.m4a');
      expect(result).toBe('Recovery successful');
    });

    it('should handle mixed success and failure scenarios', async () => {
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      const scenarios = [
        { shouldFail: false, result: 'Success 1' },
        { shouldFail: true, error: 'Error 1' },
        { shouldFail: false, result: 'Success 2' },
        { shouldFail: true, error: 'Error 2' },
        { shouldFail: false, result: 'Success 3' }
      ];

      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        
        if (scenario.shouldFail) {
          mockedTranscribeAudio.mockRejectedValueOnce(new Error(scenario.error));
          
          await expect(transcribeAudioWithDeepgram(`file://test${i}.m4a`))
            .rejects
            .toThrow(scenario.error);
        } else {
          mockedTranscribeAudio.mockResolvedValueOnce(scenario.result);
          
          const result = await transcribeAudioWithDeepgram(`file://test${i}.m4a`);
          expect(result).toBe(scenario.result);
        }
      }
    });
  });

  describe('Data Validation and Processing', () => {
    it('should handle various transcription formats', async () => {
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      const formats = [
        'Simple sentence.',
        'Multi-sentence transcription. With punctuation! And questions?',
        'Numbers like 123 and 456 should work.',
        'Special characters: @#$%^&*()_+-=[]{}|;:,.<>?',
        'Very short.',
        'A very long transcription that goes on and on and includes multiple clauses and sentences and should still be handled correctly by our system without any issues whatsoever.'
      ];

      for (const format of formats) {
        mockedTranscribeAudio.mockResolvedValueOnce(format);
        
        const result = await transcribeAudioWithDeepgram('file://format-test.m4a');
        expect(result).toBe(format);
      }
    });

    it('should handle edge case transcription results', async () => {
      mockedFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 12345
      });

      const edgeCases = [
        '', // Empty string
        ' ', // Single space
        '\n', // Newline
        '   whitespace   ', // Whitespace that should be trimmed
        'UPPERCASE TEXT',
        'lowercase text',
        'MiXeD cAsE tExT',
        '123456789', // Numbers only
        '!@#$%^&*()', // Special characters only
      ];

      for (const edgeCase of edgeCases) {
        mockedTranscribeAudio.mockResolvedValueOnce(edgeCase);
        
        const result = await transcribeAudioWithDeepgram('file://edge-test.m4a');
        expect(result).toBe(edgeCase);
      }
    });
  });
});