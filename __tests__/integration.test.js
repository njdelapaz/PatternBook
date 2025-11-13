import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import VoiceRecordingScreen from '../screens/VoiceRecordingScreen';
import { transcribeAudioWithDeepgram } from '../utils/deepgram';
import { Audio as AVAudio } from 'expo-av';
import axios from 'axios';

// Mock all dependencies
jest.mock('../utils/deepgram');
jest.mock('expo-av');
jest.mock('axios');

const mockedTranscribeAudio = transcribeAudioWithDeepgram;
const mockedAVAudio = AVAudio;
const mockedAxios = axios;

describe('Voice Transcription Integration Tests', () => {
  const defaultProps = {
    isDarkMode: false,
    onBack: jest.fn(),
    onSave: jest.fn()
  };

  let mockRecording;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup recording mock
    mockRecording = {
      prepareToRecordAsync: jest.fn(),
      startAsync: jest.fn(),
      stopAndUnloadAsync: jest.fn(),
      getStatusAsync: jest.fn().mockResolvedValue({ canRecord: true }),
      getURI: jest.fn().mockReturnValue('file://test-recording.m4a')
    };

    // Setup AV Audio mocks
    mockedAVAudio.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockedAVAudio.setAudioModeAsync.mockResolvedValue();
    mockedAVAudio.Recording.mockImplementation(() => mockRecording);

    // Setup platform
    Platform.OS = 'ios';
  });

  describe('End-to-End Recording and Transcription Flow', () => {
    it('should complete full recording and transcription workflow successfully', async () => {
      const expectedTranscription = 'Hello, this is an integration test transcription.';
      
      // Mock successful transcription
      mockedTranscribeAudio.mockResolvedValue(expectedTranscription);

      const { getByRole, getByText, queryByText } = render(
        <VoiceRecordingScreen {...defaultProps} />
      );

      // Initial state: should show "Tap to record"
      expect(getByText('Tap to record')).toBeTruthy();
      expect(queryByText('Save')).toBeFalsy();

      const micButton = getByRole('button');

      // Step 1: Start recording
      await act(async () => {
        fireEvent.press(micButton);
      });

      // Should show recording state
      await waitFor(() => {
        expect(getByText('Recording...')).toBeTruthy();
      });

      // Verify recording setup was called
      expect(mockedAVAudio.requestPermissionsAsync).toHaveBeenCalled();
      expect(mockedAVAudio.setAudioModeAsync).toHaveBeenCalled();
      expect(mockRecording.prepareToRecordAsync).toHaveBeenCalled();
      expect(mockRecording.startAsync).toHaveBeenCalled();

      // Step 2: Stop recording and trigger transcription
      await act(async () => {
        fireEvent.press(micButton);
      });

      // Should show transcribing state
      await waitFor(() => {
        expect(queryByText('Transcribing...')).toBeTruthy();
      });

      // Verify recording cleanup
      expect(mockRecording.stopAndUnloadAsync).toHaveBeenCalled();
      expect(mockRecording.getURI).toHaveBeenCalled();

      // Wait for transcription to complete
      await waitFor(() => {
        expect(getByText(expectedTranscription)).toBeTruthy();
        expect(getByText('Save')).toBeTruthy();
      });

      // Verify transcription was called with correct URI
      expect(mockedTranscribeAudio).toHaveBeenCalledWith('file://test-recording.m4a');

      // Step 3: Save the transcription
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith(expectedTranscription);
    });

    it('should handle recording failure and graceful fallback', async () => {
      // Make initial recording preparation fail
      mockRecording.prepareToRecordAsync.mockRejectedValue(new Error('Recording setup failed'));

      // Setup fallback recording
      const fallbackRecording = {
        prepareToRecordAsync: jest.fn(),
        startAsync: jest.fn(),
        stopAndUnloadAsync: jest.fn(),
        getStatusAsync: jest.fn().mockResolvedValue({ canRecord: true }),
        getURI: jest.fn().mockReturnValue('file://fallback-recording.m4a')
      };

      mockedAVAudio.Recording
        .mockImplementationOnce(() => mockRecording) // First attempt fails
        .mockImplementationOnce(() => fallbackRecording); // Second attempt succeeds

      mockedTranscribeAudio.mockResolvedValue('Fallback transcription successful');

      const { getByRole, getByText } = render(
        <VoiceRecordingScreen {...defaultProps} />
      );

      const micButton = getByRole('button');

      // Start recording (should use fallback)
      await act(async () => {
        fireEvent.press(micButton);
      });

      await waitFor(() => {
        expect(getByText('Recording...')).toBeTruthy();
      });

      // Verify fallback was used
      expect(fallbackRecording.prepareToRecordAsync).toHaveBeenCalled();
      expect(fallbackRecording.startAsync).toHaveBeenCalled();

      // Complete the flow
      await act(async () => {
        fireEvent.press(micButton);
      });

      await waitFor(() => {
        expect(getByText('Fallback transcription successful')).toBeTruthy();
      });
    });

    it('should handle network errors during transcription', async () => {
      const networkError = new Error('Network connection failed');
      mockedTranscribeAudio.mockRejectedValue(networkError);

      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation();

      const { getByRole, queryByText } = render(
        <VoiceRecordingScreen {...defaultProps} />
      );

      const micButton = getByRole('button');

      // Complete recording workflow
      await act(async () => {
        fireEvent.press(micButton); // Start
      });

      await act(async () => {
        fireEvent.press(micButton); // Stop and transcribe
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Transcription Failed',
          'Network connection failed',
          [{ text: 'OK' }]
        );
      });

      // Should not show save button after error
      expect(queryByText('Save')).toBeFalsy();

      alertSpy.mockRestore();
    });
  });

  describe('Multiple Recording Sessions', () => {
    it('should handle multiple recording sessions correctly', async () => {
      const firstTranscription = 'First recording session';
      const secondTranscription = 'Second recording session';

      const { getByRole, getByText } = render(
        <VoiceRecordingScreen {...defaultProps} />
      );

      const micButton = getByRole('button');

      // First recording session
      mockedTranscribeAudio.mockResolvedValueOnce(firstTranscription);

      await act(async () => {
        fireEvent.press(micButton); // Start first recording
      });

      await act(async () => {
        fireEvent.press(micButton); // Stop first recording
      });

      await waitFor(() => {
        expect(getByText(firstTranscription)).toBeTruthy();
      });

      // Second recording session (should replace first)
      mockedTranscribeAudio.mockResolvedValueOnce(secondTranscription);

      await act(async () => {
        fireEvent.press(micButton); // Start second recording
      });

      await act(async () => {
        fireEvent.press(micButton); // Stop second recording
      });

      await waitFor(() => {
        expect(getByText(secondTranscription)).toBeTruthy();
      });

      // Should only show the latest transcription
      expect(queryByText(firstTranscription)).toBeFalsy();
    });
  });

  describe('Performance and Timing', () => {
    it('should handle rapid button presses without breaking', async () => {
      const { getByRole } = render(
        <VoiceRecordingScreen {...defaultProps} />
      );

      const micButton = getByRole('button');

      // Rapidly press the button multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.press(micButton);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Should only have one recording setup call despite multiple presses
      expect(mockRecording.prepareToRecordAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle long transcription responses', async () => {
      const longTranscription = 'This is a very long transcription '.repeat(50);
      mockedTranscribeAudio.mockResolvedValue(longTranscription);

      const { getByRole, getByText } = render(
        <VoiceRecordingScreen {...defaultProps} />
      );

      const micButton = getByRole('button');

      await act(async () => {
        fireEvent.press(micButton);
      });

      await act(async () => {
        fireEvent.press(micButton);
      });

      await waitFor(() => {
        expect(getByText(longTranscription)).toBeTruthy();
      }, { timeout: 5000 });

      // Should still be able to save long transcriptions
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith(longTranscription);
    });
  });

  describe('State Management', () => {
    it('should properly reset state between recordings', async () => {
      const { getByRole, getByText, queryByText } = render(
        <VoiceRecordingScreen {...defaultProps} />
      );

      mockedTranscribeAudio.mockResolvedValue('Test transcription');

      const micButton = getByRole('button');

      // Complete first recording
      await act(async () => {
        fireEvent.press(micButton);
      });

      await act(async () => {
        fireEvent.press(micButton);
      });

      await waitFor(() => {
        expect(getByText('Test transcription')).toBeTruthy();
      });

      // Start new recording - should reset transcription state
      await act(async () => {
        fireEvent.press(micButton);
      });

      // During new recording, old transcription should still be visible
      expect(getByText('Test transcription')).toBeTruthy();
      expect(getByText('Recording...')).toBeTruthy();
    });
  });
});