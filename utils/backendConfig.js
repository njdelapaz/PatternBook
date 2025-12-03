/**
 * Backend Configuration
 * Auto-detects the appropriate backend URL based on the platform and environment
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { BACKEND_URL } from '@env';

/**
 * Get the backend URL with auto-detection
 * Priority:
 * 1. BACKEND_URL from .env (if explicitly set)
 * 2. Auto-detect from Expo dev server URL
 * 3. Platform-specific defaults
 *
 * @returns {string} Backend URL
 */
export function getBackendUrl() {
  // If explicitly set in .env, use that
  if (BACKEND_URL && BACKEND_URL.trim() && !BACKEND_URL.includes('YOUR_COMPUTER_IP')) {
    console.log('[Backend Config] Using BACKEND_URL from .env:', BACKEND_URL);
    return BACKEND_URL;
  }

  // Try to auto-detect from Expo dev server
  const expoUrl = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;

  if (expoUrl) {
    // Extract IP from Expo dev server (e.g., "192.168.1.100:8081" -> "192.168.1.100")
    const ip = expoUrl.split(':')[0];
    const backendUrl = `http://${ip}:3000`;
    console.log('[Backend Config] Auto-detected from Expo dev server:', backendUrl);
    return backendUrl;
  }

  // Fallback to platform-specific defaults
  let fallbackUrl;
  if (Platform.OS === 'android') {
    // Android emulator uses special IP to access host machine
    fallbackUrl = 'http://10.0.2.2:3000';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost
    fallbackUrl = 'http://localhost:3000';
  } else {
    // Web or other platforms
    fallbackUrl = 'http://localhost:3000';
  }

  console.log('[Backend Config] Using platform fallback:', fallbackUrl);
  return fallbackUrl;
}

/**
 * Test if the backend is reachable
 * @param {string} url - Backend URL to test
 * @returns {Promise<boolean>} True if backend is reachable
 */
export async function testBackendConnection(url = null) {
  const backendUrl = url || getBackendUrl();

  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      timeout: 5000,
    });

    const data = await response.json();
    return response.ok && data.status === 'ok';
  } catch (error) {
    console.error('[Backend Config] Connection test failed:', error.message);
    return false;
  }
}

/**
 * Get backend status information
 * @returns {Promise<Object>} Backend status info
 */
export async function getBackendStatus() {
  const backendUrl = getBackendUrl();
  const isReachable = await testBackendConnection(backendUrl);

  return {
    url: backendUrl,
    isReachable,
    platform: Platform.OS,
    isAutoDetected: !BACKEND_URL || BACKEND_URL.includes('YOUR_COMPUTER_IP'),
  };
}
