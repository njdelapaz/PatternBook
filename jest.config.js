module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(expo-file-system|react-native|@react-native|expo)/)'
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'services/**/*.js',
    '!services/**/*.test.js'
  ],
  moduleNameMapper: {
    '^@env$': '<rootDir>/__mocks__/@env.js',
    '^expo-file-system/legacy$': '<rootDir>/__mocks__/expo-file-system.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
  },
  verbose: true,
};

