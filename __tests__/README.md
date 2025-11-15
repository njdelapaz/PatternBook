# Voice Transcription Testing

This directory contains comprehensive testing suite for the voice transcription functionality using Deepgram API.

## Test Structure

### Unit Tests
- **`deepgram.test.js`** - Tests for Deepgram utility functions
  - API configuration validation
  - Audio file handling
  - Error handling for various API responses
  - Network error handling

### Component Tests  
- **`VoiceRecordingScreen.test.js`** - Tests for the VoiceRecordingScreen component
  - UI rendering and state management
  - Recording functionality
  - User interactions and navigation
  - Error handling and edge cases

### Integration Tests
- **`integration.test.js`** - End-to-end testing of the complete voice transcription flow
  - Full recording workflow
  - Multiple recording sessions
  - Performance and timing tests
  - State management across recordings

## Test Fixtures

### Mock Data (`fixtures/mockData.js`)
- Sample Deepgram API responses (successful, errors, edge cases)
- Mock audio file configurations
- Sample transcription texts for testing
- Helper functions for creating mock objects

### Test Utilities (`fixtures/testUtils.js`)
- Common testing patterns and helpers
- Recording simulation utilities
- State assertion helpers
- Console mocking and error handling utilities

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Voice Transcription Tests Only
```bash
npm run test:voice
```

## Test Coverage

The test suite covers:

✅ **API Integration**
- Deepgram API calls and responses
- Error handling for all HTTP status codes
- Network and timeout error handling
- API key validation

✅ **Audio Recording**
- Microphone permissions
- Recording start/stop functionality
- Audio file creation and cleanup
- Platform-specific recording configurations

✅ **UI Components**
- Component rendering in different states
- User interactions (button presses, navigation)
- Dark/light theme support
- Accessibility considerations

✅ **Error Handling**
- Network failures
- API errors (401, 402, 413, 429, etc.)
- Invalid configurations
- File system errors

✅ **Edge Cases**
- Empty transcriptions
- Very long transcriptions
- Rapid button presses
- Multiple recording sessions
- Permission denials

## Test Configuration

### Jest Configuration (`jest.config.js`)
- React Native preset
- Module mocking for Expo and React Native modules
- Coverage collection settings
- Custom matchers and setup

### Setup File (`jest.setup.js`)
- Global mocks for React Native modules
- Expo module mocks (expo-av, expo-file-system)
- Console warning suppression
- Test environment configuration

### Mocks Directory (`__mocks__/`)
- Environment variable mocks (`@env.js`)
- SVG component mocks (`svg.js`)

## Mock Strategy

The tests use comprehensive mocking to isolate functionality:

1. **Expo Modules**: Audio recording, file system operations
2. **Network Requests**: Axios HTTP client for API calls  
3. **React Native**: Platform detection, Alert dialogs
4. **Environment**: API keys and configuration

## Best Practices

### Writing New Tests
1. Use descriptive test names that explain the scenario
2. Group related tests using `describe` blocks
3. Use `beforeEach`/`afterEach` for setup and cleanup
4. Mock external dependencies at the module level
5. Test both happy path and error scenarios

### Assertion Patterns
```javascript
// Good: Specific assertions
expect(mockFunction).toHaveBeenCalledWith(expectedParams);
expect(getByText('Expected Text')).toBeTruthy();

// Good: Error testing
await expect(functionThatShouldFail()).rejects.toThrow('Expected error message');
```

### Async Testing
```javascript
// Use act() for state changes
await act(async () => {
  fireEvent.press(button);
});

// Use waitFor() for async operations
await waitFor(() => {
  expect(getByText('Expected Result')).toBeTruthy();
});
```

## Debugging Tests

### Common Issues

1. **Test Timeout**: Increase timeout for slow async operations
2. **Act Warnings**: Wrap state changes in `act()`
3. **Mock Issues**: Ensure mocks are properly reset between tests
4. **Platform Differences**: Use Platform.OS mocks consistently

### Debugging Tools
```bash
# Run specific test file
npm test -- deepgram.test.js

# Run tests in verbose mode
npm test -- --verbose

# Debug mode (useful with IDE debuggers)
npm test -- --no-cache --runInBand
```

## Contributing

When adding new voice transcription features:

1. Add corresponding tests to appropriate test files
2. Update mock data if new API responses are expected
3. Add integration tests for end-to-end workflows
4. Ensure test coverage remains high (>90%)

The testing suite helps ensure reliability and prevents regressions as the voice transcription functionality evolves.