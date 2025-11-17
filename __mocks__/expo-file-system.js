// Mock expo-file-system for testing
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
  
  makeDirectoryAsync: jest.fn(async () => {
    return;
  }),
  
  // Internal storage for mock files
  _files: {},
  
  // Helper to reset mock file system
  _reset: () => {
    mockFileSystem._files = {};
    jest.clearAllMocks();
  }
};

export default mockFileSystem;

