/**
 * UI Test Utilities
 * Helper functions for testing React Native components
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { darkTheme, lightTheme } from '../../utils/constants';

/**
 * Render component with theme provider wrapper
 * @param {React.Component} component - Component to render
 * @param {boolean} isDarkMode - Whether to use dark theme
 * @param {object} options - Additional render options
 * @returns {object} Render result from @testing-library/react-native
 */
export const renderWithTheme = (component, isDarkMode = false, options = {}) => {
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  // For now, just render directly since themes are passed as props
  // If we add a ThemeProvider later, we can wrap here
  return render(component, options);
};

/**
 * Create mock navigation object
 * @returns {object} Mock navigation object
 */
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(),
  getState: jest.fn(() => ({
    routes: [],
    index: 0
  }))
});

/**
 * Create mock route object
 * @param {object} params - Route parameters
 * @returns {object} Mock route object
 */
export const createMockRoute = (params = {}) => ({
  key: 'mock-route-key',
  name: 'MockRoute',
  params,
  path: undefined
});

/**
 * Wait for async state updates
 * @param {function} callback - Function that should eventually pass
 * @param {number} timeout - Timeout in ms
 * @returns {Promise} Promise that resolves when condition is met
 */
export const waitForAsync = async (callback, timeout = 3000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await callback();
      return;
    } catch (error) {
      if (Date.now() - startTime >= timeout) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  throw new Error('waitForAsync timeout');
};

/**
 * Create default props for MainScreen
 * @param {object} overrides - Props to override
 * @returns {object} Default props object
 */
export const createMainScreenProps = (overrides = {}) => ({
  notes: [],
  onNotePress: jest.fn(),
  onCreateNote: jest.fn(),
  onDeleteNote: jest.fn(),
  onTogglePin: jest.fn(),
  isDarkMode: false,
  onToggleTheme: jest.fn(),
  searchQuery: '',
  onSearchChange: jest.fn(),
  showSearch: false,
  onToggleSearch: jest.fn(),
  sortBy: 'updated',
  onSortChange: jest.fn(),
  showThreeDotsMenu: false,
  onToggleThreeDotsMenu: jest.fn(),
  onNavigateToSettings: jest.fn(),
  onNavigateToRecentlyDeleted: jest.fn(),
  onNavigateToVoiceRecord: jest.fn(),
  onNavigateToTextEditor: jest.fn(),
  ...overrides
});

/**
 * Create default props for TextEditorScreen
 * @param {object} overrides - Props to override
 * @returns {object} Default props object
 */
export const createTextEditorScreenProps = (overrides = {}) => ({
  note: null,
  onBack: jest.fn(),
  onSave: jest.fn(),
  isDarkMode: false,
  ...overrides
});

/**
 * Create default props for VoiceRecordingScreen
 * @param {object} overrides - Props to override
 * @returns {object} Default props object
 */
export const createVoiceRecordingScreenProps = (overrides = {}) => ({
  isDarkMode: false,
  onBack: jest.fn(),
  onSave: jest.fn(),
  ...overrides
});

/**
 * Create default props for SettingsScreen
 * @param {object} overrides - Props to override
 * @returns {object} Default props object
 */
export const createSettingsScreenProps = (overrides = {}) => ({
  settings: {
    profile: { name: 'Test User' },
    notifications: {
      weeklyLetter: false,
      dailyReminder: false,
      reminderTime: '09:00'
    }
  },
  onSettingsChange: jest.fn(),
  isDarkMode: false,
  onBack: jest.fn(),
  onClearAllData: jest.fn(),
  onLogout: jest.fn(),
  ...overrides
});

/**
 * Mock console methods to suppress test output
 */
export const mockConsole = () => {
  const originalConsole = global.console;
  
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
  
  return () => {
    global.console = originalConsole;
  };
};

/**
 * Create default props for LoginScreen
 * @param {object} overrides - Props to override
 * @returns {object} Default props object
 */
export const createLoginScreenProps = (overrides = {}) => ({
  onLogin: jest.fn(),
  onNavigateToEmail: jest.fn(),
  ...overrides
});

/**
 * Create default props for EmailLoginScreen
 * @param {object} overrides - Props to override
 * @returns {object} Default props object
 */
export const createEmailLoginScreenProps = (overrides = {}) => ({
  onBack: jest.fn(),
  onLogin: jest.fn(),
  ...overrides
});

/**
 * Create default props for RecentlyDeletedScreen
 * @param {object} overrides - Props to override
 * @returns {object} Default props object
 */
export const createRecentlyDeletedScreenProps = (overrides = {}) => ({
  deletedNotes: [],
  onRestoreNote: jest.fn(),
  onPermanentlyDeleteNote: jest.fn(),
  onBack: jest.fn(),
  isDarkMode: false,
  ...overrides
});

/**
 * Create default props for OnboardingScreen
 * @param {object} overrides - Props to override
 * @returns {object} Default props object
 */
export const createOnboardingScreenProps = (overrides = {}) => ({
  onComplete: jest.fn(),
  ...overrides
});

/**
 * Create a mock note object
 * @param {object} overrides - Properties to override
 * @returns {object} Mock note object
 */
export const createMockNote = (overrides = {}) => ({
  id: `note-${Date.now()}`,
  title: 'Test Note',
  content: 'Test content',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  pinned: false,
  ...overrides
});

