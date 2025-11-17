// Mock expo-file-system for testing
// Supports both default import and namespace import styles
const mockFileSystem = {
  documentDirectory: 'file:///mock-directory/',
  
  getInfoAsync: jest.fn(async (path) => {
    if (mockFileSystem._files[path]) {
      return { exists: true };
    }
    return { exists: false };
  }),
  
  readAsStringAsync: jest.fn(async (path) => {
    if (mockFileSystem._files[path]) {
      return mockFileSystem._files[path];
    }
    throw new Error('File not found');
  }),
  
  writeAsStringAsync: jest.fn(async (path, content) => {
    mockFileSystem._files[path] = content;
  }),
  
  makeDirectoryAsync: jest.fn(async (path, options) => {
    // Create directory in mock file system
    return;
  }),
  
  deleteAsync: jest.fn(async (path, options) => {
    delete mockFileSystem._files[path];
    return;
  }),
  
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8'
  },
  
  // Internal storage for mock files
  _files: {},
  
  // Helper to reset mock file system
  _reset: jest.fn(() => {
    mockFileSystem._files = {};
    jest.clearAllMocks();
  })
};

// Export as default for: import FileSystem from 'expo-file-system/legacy'
export default mockFileSystem;

// Also export as named exports for: import * as FileSystem from 'expo-file-system/legacy'
export const documentDirectory = mockFileSystem.documentDirectory;
export const getInfoAsync = mockFileSystem.getInfoAsync;
export const readAsStringAsync = mockFileSystem.readAsStringAsync;
export const writeAsStringAsync = mockFileSystem.writeAsStringAsync;
export const makeDirectoryAsync = mockFileSystem.makeDirectoryAsync;
export const deleteAsync = mockFileSystem.deleteAsync;
export const EncodingType = mockFileSystem.EncodingType;
export const _reset = mockFileSystem._reset;

