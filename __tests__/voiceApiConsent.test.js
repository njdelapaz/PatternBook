// Voice API Consent Tests
import { hasVoiceApiConsent, setVoiceApiConsent } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('Voice API Consent Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasVoiceApiConsent', () => {
    it('should return true when consent is stored as "true"', async () => {
      AsyncStorage.getItem.mockResolvedValue('true');
      
      const result = await hasVoiceApiConsent();
      
      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@patternbook_voice_api_consent');
    });

    it('should return false when consent is not stored', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await hasVoiceApiConsent();
      
      expect(result).toBe(false);
    });

    it('should return false when consent is stored as "false"', async () => {
      AsyncStorage.getItem.mockResolvedValue('false');
      
      const result = await hasVoiceApiConsent();
      
      expect(result).toBe(false);
    });

    it('should return false when AsyncStorage throws an error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const result = await hasVoiceApiConsent();
      
      expect(result).toBe(false);
    });
  });

  describe('setVoiceApiConsent', () => {
    it('should store "true" when consent is given', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      
      await setVoiceApiConsent(true);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@patternbook_voice_api_consent', 'true');
    });

    it('should store "false" when consent is declined', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      
      await setVoiceApiConsent(false);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@patternbook_voice_api_consent', 'false');
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw
      await expect(setVoiceApiConsent(true)).resolves.toBeUndefined();
    });
  });

  describe('Consent State Management', () => {
    it('should correctly handle consent flow from false to true', async () => {
      // Initially no consent
      AsyncStorage.getItem.mockResolvedValue(null);
      let hasConsent = await hasVoiceApiConsent();
      expect(hasConsent).toBe(false);

      // User gives consent
      AsyncStorage.setItem.mockResolvedValue();
      await setVoiceApiConsent(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@patternbook_voice_api_consent', 'true');

      // Check consent is now true
      AsyncStorage.getItem.mockResolvedValue('true');
      hasConsent = await hasVoiceApiConsent();
      expect(hasConsent).toBe(true);
    });

    it('should persist consent between app sessions', async () => {
      // Simulate user giving consent in one session
      AsyncStorage.setItem.mockResolvedValue();
      await setVoiceApiConsent(true);

      // Simulate app restart - consent should be remembered
      AsyncStorage.getItem.mockResolvedValue('true');
      const hasConsent = await hasVoiceApiConsent();
      
      expect(hasConsent).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed stored values', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid_value');
      
      const result = await hasVoiceApiConsent();
      
      expect(result).toBe(false);
    });

    it('should handle boolean parameters correctly', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      
      await setVoiceApiConsent(false);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@patternbook_voice_api_consent', 'false');
      
      await setVoiceApiConsent(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@patternbook_voice_api_consent', 'true');
    });
  });
});