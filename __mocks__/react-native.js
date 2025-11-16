// Mock react-native
export const Platform = {
  OS: 'ios',
  select: (options) => options.ios || options.default,
};

