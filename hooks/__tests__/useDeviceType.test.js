import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';
import { useDeviceType } from '../useDeviceType';

// Mock react-native's useWindowDimensions
jest.mock('react-native', () => ({
  useWindowDimensions: jest.fn(),
}));

describe('useDeviceType', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should detect portrait orientation when height > width', () => {
    useWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.isLandscape).toBe(false);
    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(812);
  });

  it('should detect landscape orientation when width > height', () => {
    useWindowDimensions.mockReturnValue({
      width: 812,
      height: 375,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.isLandscape).toBe(true);
    expect(result.current.width).toBe(812);
    expect(result.current.height).toBe(375);
  });

  it('should return correct dimensions for phone portrait', () => {
    useWindowDimensions.mockReturnValue({
      width: 390,
      height: 844,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.width).toBe(390);
    expect(result.current.height).toBe(844);
    expect(result.current.isLandscape).toBe(false);
  });

  it('should return correct dimensions for tablet landscape', () => {
    useWindowDimensions.mockReturnValue({
      width: 1024,
      height: 768,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
    expect(result.current.isLandscape).toBe(true);
  });

  it('should return correct dimensions for tablet portrait', () => {
    useWindowDimensions.mockReturnValue({
      width: 768,
      height: 1024,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.width).toBe(768);
    expect(result.current.height).toBe(1024);
    expect(result.current.isLandscape).toBe(false);
  });

  it('should handle square dimensions (width === height)', () => {
    useWindowDimensions.mockReturnValue({
      width: 500,
      height: 500,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.width).toBe(500);
    expect(result.current.height).toBe(500);
    expect(result.current.isLandscape).toBe(false); // width > height is false
  });

  it('should update when dimensions change', () => {
    const { result, rerender } = renderHook(() => useDeviceType());

    // Start in portrait
    useWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
    });
    rerender();

    expect(result.current.isLandscape).toBe(false);
    expect(result.current.width).toBe(375);

    // Rotate to landscape
    useWindowDimensions.mockReturnValue({
      width: 812,
      height: 375,
    });
    rerender();

    expect(result.current.isLandscape).toBe(true);
    expect(result.current.width).toBe(812);
  });
});


