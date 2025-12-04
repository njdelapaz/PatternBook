/**
 * Mock for expo-constants
 * Used in testing environment where Expo modules are not available
 */

const Constants = {
  expoConfig: {
    hostUri: 'localhost:8081', // Mock Expo dev server URI
    name: 'PatternBook',
    slug: 'patternbook',
  },
  manifest: {
    hostUri: 'localhost:8081',
  },
  platform: {
    ios: {
      platform: 'ios',
    },
  },
};

export default Constants;

