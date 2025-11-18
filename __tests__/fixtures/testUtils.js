// Test utilities for voice transcription testing

import { act, fireEvent, waitFor } from '@testing-library/react-native';

/**
 * Simulates a complete recording session (start -> record -> stop)
 */
export const simulateRecordingSession = async (micButton, duration = 1000) => {
  // Start recording
  await act(async () => {
    fireEvent.press(micButton);
  });

  // Simulate recording duration
  if (duration > 0) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, duration));
    });
  }

  // Stop recording
  await act(async () => {
    fireEvent.press(micButton);
  });
};

/**
 * Creates a mock FormData for testing API calls
 */
export const createMockFormData = () => {
  const formData = new FormData();
  formData.append = jest.fn();
  return formData;
};

/**
 * Advances timers and flushes promises for testing async operations
 */
export const flushPromisesAndTimers = async () => {
  await act(async () => {
    jest.runAllTimers();
    await new Promise(resolve => setImmediate(resolve));
  });
};

/**
 * Helper to wait for specific text to appear in the component
 */
export const waitForText = async (getByText, text, timeout = 3000) => {
  return await waitFor(
    () => {
      expect(getByText(text)).toBeTruthy();
      return getByText(text);
    },
    { timeout }
  );
};

/**
 * Helper to wait for text to disappear from the component
 */
export const waitForTextToDisappear = async (queryByText, text, timeout = 3000) => {
  return await waitFor(
    () => {
      expect(queryByText(text)).toBeFalsy();
    },
    { timeout }
  );
};

/**
 * Mocks console methods to capture logs during testing
 */
export const mockConsole = () => {
  const originalConsole = { ...console };
  const mockLogs = {
    log: [],
    error: [],
    warn: [],
    info: []
  };

  beforeEach(() => {
    console.log = jest.fn((...args) => mockLogs.log.push(args));
    console.error = jest.fn((...args) => mockLogs.error.push(args));
    console.warn = jest.fn((...args) => mockLogs.warn.push(args));
    console.info = jest.fn((...args) => mockLogs.info.push(args));
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
    Object.keys(mockLogs).forEach(key => {
      mockLogs[key].length = 0;
    });
  });

  return mockLogs;
};

/**
 * Creates a spy for React Native Alert
 */
export const createAlertSpy = () => {
  const AlertModule = require('react-native').Alert;
  return jest.spyOn(AlertModule, 'alert').mockImplementation();
};

/**
 * Helper to test error boundaries and error handling
 */
export const expectErrorToBeHandled = (errorSpy, expectedMessage) => {
  expect(errorSpy).toHaveBeenCalledWith(
    expect.stringContaining('Transcription Failed'),
    expect.stringContaining(expectedMessage),
    expect.any(Array)
  );
};

/**
 * Utility to create a delayed promise for testing async operations
 */
export const createDelayedPromise = (resolveValue, delay = 100) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(resolveValue), delay);
  });
};

/**
 * Helper to test recording states and transitions
 */
export const expectRecordingState = (getByText, queryByText, state) => {
  const states = {
    initial: () => {
      expect(getByText('Tap to record')).toBeTruthy();
      expect(queryByText('Recording...')).toBeFalsy();
      expect(queryByText('Transcribing...')).toBeFalsy();
    },
    recording: () => {
      expect(getByText('Recording...')).toBeTruthy();
      expect(queryByText('Tap to record')).toBeFalsy();
      expect(queryByText('Transcribing...')).toBeFalsy();
    },
    transcribing: () => {
      expect(queryByText('Recording...')).toBeFalsy();
      expect(queryByText('Tap to record')).toBeFalsy();
      // Note: Transcribing state might show different messages
    },
    completed: (transcription) => {
      expect(queryByText('Recording...')).toBeFalsy();
      expect(queryByText('Transcribing...')).toBeFalsy();
      if (transcription) {
        expect(getByText(transcription)).toBeTruthy();
        expect(getByText('Save')).toBeTruthy();
      }
    }
  };

  if (states[state]) {
    states[state]();
  } else {
    throw new Error(`Unknown recording state: ${state}`);
  }
};

/**
 * Test setup helper for common voice recording test scenarios
 */
export const setupVoiceRecordingTest = (customMocks = {}) => {
  const defaultMocks = {
    requestPermissions: { status: 'granted' },
    setAudioMode: undefined,
    recordingMethods: {
      prepareToRecordAsync: undefined,
      startAsync: undefined,
      stopAndUnloadAsync: undefined,
      getStatusAsync: { canRecord: true },
      getURI: 'file://test-recording.m4a'
    },
    transcriptionResult: 'Test transcription result',
    deepgramConfigured: true
  };

  const mocks = { ...defaultMocks, ...customMocks };

  return {
    setupMocks: () => {
      // Setup all the mocks based on the provided configuration
      const { Audio } = require('expo-av');
      const { transcribeAudioWithDeepgram, isDeepgramConfigured } = require('../utils/deepgram');

      Audio.requestPermissionsAsync.mockResolvedValue(mocks.requestPermissions);
      Audio.setAudioModeAsync.mockResolvedValue(mocks.setAudioMode);
      
      transcribeAudioWithDeepgram.mockResolvedValue(mocks.transcriptionResult);
      isDeepgramConfigured.mockReturnValue(mocks.deepgramConfigured);

      const mockRecording = createMockRecording(mocks.recordingMethods);
      Audio.Recording.mockImplementation(() => mockRecording);

      return { mockRecording };
    },
    mocks
  };
};