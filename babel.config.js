module.exports = function(api) {
  api.cache(true);
  
  // Check if we're in test environment
  const isTest = process.env.NODE_ENV === 'test' || process.env.BABEL_ENV === 'test';
  
  if (isTest) {
    // Use babel-preset-expo for tests too, as it includes React support
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        ['module:react-native-dotenv', {
          moduleName: '@env',
          path: '.env',
          blacklist: null,
          whitelist: ['OPENAI_API_KEY', 'DEEPGRAM_API_KEY', 'BACKEND_URL'],
          safe: false,
          allowUndefined: true
        }]
      ]
    };
  }
  
  // Default Expo config for development
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: ['OPENAI_API_KEY', 'DEEPGRAM_API_KEY', 'BACKEND_URL'],
        safe: false,
        allowUndefined: true
      }]
    ]
  };
};
