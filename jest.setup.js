// Mock Expo modules
// Note: expo-file-system/legacy is mocked via moduleNameMapper in jest.config.js
// Do not mock it here to avoid conflicts with __mocks__/expo-file-system.js

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Recording: jest.fn(() => ({
      prepareToRecordAsync: jest.fn(),
      startAsync: jest.fn(),
      stopAndUnloadAsync: jest.fn(),
      getStatusAsync: jest.fn(),
      getURI: jest.fn()
    })),
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
      LOW_QUALITY: {}
    },
    AndroidOutputFormat: {
      MPEG_4: 'mpeg4'
    },
    AndroidAudioEncoder: {
      AAC: 'aac'
    },
    IOSOutputFormat: {
      MPEG4AAC: 'mpeg4aac'
    },
    IOSAudioQuality: {
      MEDIUM: 'medium'
    }
  }
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null
}));

// Setup console mock
// Jest setup file
// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock timers - REMOVED: Conflicts with async tests using waitFor()
// If fake timers are needed for specific tests, use jest.useFakeTimers() in those tests only
// jest.useFakeTimers();

