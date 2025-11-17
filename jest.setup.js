// Mock Expo modules
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64'
  }
}));

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

// Mock timers
jest.useFakeTimers();

