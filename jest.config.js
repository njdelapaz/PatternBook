module.exports = {
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-svg|expo|@expo|expo-status-bar|axios)/)',
    'node_modules/(?!(expo-file-system|react-native|@react-native|expo|expo-status-bar)/)',
    'node_modules/react-native/jest/setup.js'
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@env$': '<rootDir>/__mocks__/@env.js',
    '^expo-file-system/legacy$': '<rootDir>/__mocks__/expo-file-system.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/__mocks__/image.js',
  },
  collectCoverageFrom: [
    'utils/**/*.{js,jsx}',
    'screens/**/*.{js,jsx}',
    '!**/*.test.{js,jsx}',
    '!**/node_modules/**',
    'services/**/*.js',
    '!services/**/*.test.js'
  ],
  testMatch: [
    '**/__tests__/**/*.{js,jsx}',
    '**/?(*.)+(spec|test).{js,jsx}'
  ]
};
