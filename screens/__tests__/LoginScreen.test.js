/**
 * LoginScreen UI Tests
 * Tests for rendering and user interactions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { createLoginScreenProps } from '../../__tests__/fixtures/uiTestUtils';

describe('LoginScreen', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = createLoginScreenProps();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { root } = render(<LoginScreen {...defaultProps} />);
      expect(root).toBeTruthy();
    });

    it('should render PatternBook logo text', () => {
      const { getByText } = render(<LoginScreen {...defaultProps} />);
      expect(getByText('PatternBook')).toBeTruthy();
    });

    it('should render tagline', () => {
      const { getByText } = render(<LoginScreen {...defaultProps} />);
      expect(getByText('The second notebook that writes back')).toBeTruthy();
    });

    it('should render Google login button', () => {
      const { getByText } = render(<LoginScreen {...defaultProps} />);
      expect(getByText('Continue with Google')).toBeTruthy();
    });

    it('should render email login button', () => {
      const { getByText } = render(<LoginScreen {...defaultProps} />);
      expect(getByText('Continue with email')).toBeTruthy();
    });

    it('should render testimonials section', () => {
      const { getByText } = render(<LoginScreen {...defaultProps} />);
      expect(getByText('Reactions from early users')).toBeTruthy();
    });

    it('should render terms and privacy text', () => {
      const { getByText } = render(<LoginScreen {...defaultProps} />);
      expect(getByText(/Terms of Use/i)).toBeTruthy();
      expect(getByText(/Privacy Policy/i)).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should call onLogin when Google button is pressed', () => {
      const { getByText } = render(<LoginScreen {...defaultProps} />);
      
      const googleButton = getByText('Continue with Google');
      fireEvent.press(googleButton);
      
      expect(defaultProps.onLogin).toHaveBeenCalled();
    });

    it('should call onNavigateToEmail when email button is pressed', () => {
      const { getByText } = render(<LoginScreen {...defaultProps} />);
      
      const emailButton = getByText('Continue with email');
      fireEvent.press(emailButton);
      
      expect(defaultProps.onNavigateToEmail).toHaveBeenCalled();
    });
  });
});

