module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-svg|expo|@expo|axios)/)'
  ],
  moduleNameMapper: {
    '^@env$': '<rootDir>/__mocks__/@env.js',
    '\\.(svg)$': '<rootDir>/__mocks__/svg.js'
  },
  collectCoverageFrom: [
    'utils/**/*.{js,jsx}',
    'screens/**/*.{js,jsx}',
    '!**/*.test.{js,jsx}',
    '!**/node_modules/**',
  ],
  testMatch: [
    '**/__tests__/**/*.{js,jsx}',
    '**/?(*.)+(spec|test).{js,jsx}'
  ]
};