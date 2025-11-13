// Test fixtures for voice transcription tests

export const mockDeepgramResponses = {
  successful: {
    data: {
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript: "Hello, this is a successful transcription from the Deepgram API.",
                confidence: 0.95
              }
            ]
          }
        ]
      }
    }
  },

  longTranscript: {
    data: {
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript: "This is a much longer transcription that contains multiple sentences and demonstrates how the system handles extended speech input. It includes various punctuation marks, numbers like 123 and 456, and should maintain proper formatting throughout the entire response. The goal is to test how well our application handles substantial amounts of transcribed text without any performance issues or display problems.",
                confidence: 0.89
              }
            ]
          }
        ]
      }
    }
  },

  emptyResults: {
    data: {
      results: null
    }
  },

  noChannels: {
    data: {
      results: {
        channels: []
      }
    }
  },

  noAlternatives: {
    data: {
      results: {
        channels: [
          {
            alternatives: []
          }
        ]
      }
    }
  },

  emptyTranscript: {
    data: {
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript: "   ",
                confidence: 0.12
              }
            ]
          }
        ]
      }
    }
  },

  multipleAlternatives: {
    data: {
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript: "This is the most confident transcription option.",
                confidence: 0.95
              },
              {
                transcript: "This is a less confident alternative.",
                confidence: 0.72
              }
            ]
          }
        ]
      }
    }
  }
};

export const mockErrorResponses = {
  unauthorized: {
    response: {
      status: 401,
      statusText: 'Unauthorized',
      data: {
        message: 'Invalid API key'
      }
    }
  },

  paymentRequired: {
    response: {
      status: 402,
      statusText: 'Payment Required',
      data: {
        message: 'Insufficient credits'
      }
    }
  },

  payloadTooLarge: {
    response: {
      status: 413,
      statusText: 'Payload Too Large',
      data: {
        message: 'Audio file exceeds size limit'
      }
    }
  },

  rateLimited: {
    response: {
      status: 429,
      statusText: 'Too Many Requests',
      data: {
        message: 'Rate limit exceeded'
      }
    }
  },

  networkError: {
    request: {},
    message: 'Network Error'
  },

  timeout: {
    code: 'ECONNABORTED',
    message: 'Request timeout'
  }
};

export const mockAudioFiles = {
  valid: {
    uri: 'file:///path/to/valid/recording.m4a',
    exists: true,
    size: 12345
  },

  missing: {
    uri: 'file:///path/to/missing/recording.m4a',
    exists: false
  },

  large: {
    uri: 'file:///path/to/large/recording.m4a',
    exists: true,
    size: 50000000 // 50MB
  },

  empty: {
    uri: 'file:///path/to/empty/recording.m4a',
    exists: true,
    size: 0
  }
};

export const sampleTranscriptions = {
  short: "Hello world.",
  
  medium: "This is a medium-length transcription that contains a few sentences and demonstrates typical speech patterns.",
  
  long: "This is a very long transcription that would typically result from extended speech input. ".repeat(20),
  
  withPunctuation: "Hello, how are you? I'm doing well! Thanks for asking. What about you?",
  
  withNumbers: "The meeting is scheduled for 3:30 PM on October 15th, 2024.",
  
  withSpecialCharacters: "My email is user@example.com and my phone number is (555) 123-4567."
};

export const createMockRecording = (overrides = {}) => ({
  prepareToRecordAsync: jest.fn(),
  startAsync: jest.fn(),
  stopAndUnloadAsync: jest.fn(),
  getStatusAsync: jest.fn().mockResolvedValue({ canRecord: true }),
  getURI: jest.fn().mockReturnValue('file://mock-recording.m4a'),
  ...overrides
});

export const createMockPermissionResponse = (status = 'granted') => ({
  status,
  expires: 'never',
  granted: status === 'granted',
  canAskAgain: status !== 'granted'
});