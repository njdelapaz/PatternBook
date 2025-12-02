import { useWindowDimensions } from 'react-native';

export function useDeviceType() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;

  return {
    isLandscape,
    width,
    height,
  };
}


