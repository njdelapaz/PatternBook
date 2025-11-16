module.exports = function(api) {
  api.cache(true);
  
  // Check if we're in test environment
  const isTest = process.env.NODE_ENV === 'test';
  
  if (isTest) {
    return {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript'
      ],
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
        whitelist: null,
        safe: false,
        allowUndefined: true
      }]
    ]
  };
};
