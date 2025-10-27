// Storage keys
export const NOTES_STORAGE_KEY = '@patternbook_notes';

// Enhanced themes with better contrast and depth
export const darkTheme = {
  backgroundColor: '#000000',
  cardBackground: '#111111',
  textColor: '#ffffff',
  secondaryTextColor: '#8e8e93',
  placeholderColor: '#6d6d70',
  accentColor: '#007AFF',
  iconColor: '#8e8e93',
  navBackground: '#000000',
  borderColor: '#1c1c1e',
  headerBackground: '#000000',
  inputBackground: '#1c1c1e',
  // Enhanced colors for better contrast and depth
  cardShadow: 'rgba(0, 0, 0, 0.3)',
  focusGlow: 'rgba(0, 122, 255, 0.2)',
  subtleBorder: '#2c2c2e',
  elevatedBackground: '#1a1a1a',
};

export const lightTheme = {
  backgroundColor: '#ffffff',
  cardBackground: '#f9f9f9',
  textColor: '#000000',
  secondaryTextColor: '#8e8e93',
  placeholderColor: '#c7c7cc',
  accentColor: '#007AFF',
  iconColor: '#8e8e93',
  navBackground: '#ffffff',
  borderColor: '#e5e5ea',
  headerBackground: '#ffffff',
  inputBackground: '#f2f2f7',
  // Enhanced colors for better contrast and depth
  cardShadow: 'rgba(0, 0, 0, 0.08)',
  focusGlow: 'rgba(0, 122, 255, 0.15)',
  subtleBorder: '#e1e1e1',
  elevatedBackground: '#ffffff',
};

// Typography scale for responsive font sizing
export const Typography = {
  // Headers
  h1: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  
  // Body text
  body: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 26,
  },
  bodySmall: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  
  // UI elements
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  captionSmall: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
};

// Enhanced shadow configurations
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  focus: {
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 0,
  },
};