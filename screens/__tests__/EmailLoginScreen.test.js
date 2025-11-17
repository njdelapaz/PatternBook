/**
 * EmailLoginScreen UI Tests
 * Tests for rendering, user interactions, and form validation
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EmailLoginScreen from '../EmailLoginScreen';
import { createEmailLoginScreenProps } from '../../__tests__/fixtures/uiTestUtils';

describe('EmailLoginScreen', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = createEmailLoginScreenProps();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { root } = render(<EmailLoginScreen {...defaultProps} />);
      expect(root).toBeTruthy();
    });

    it('should render back button', () => {
      const { getByText } = render(<EmailLoginScreen {...defaultProps} />);
      expect(getByText('← Back')).toBeTruthy();
    });

    it('should render sign in title initially', () => {
      const { getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      // "Sign in" appears as both title and button text
      expect(getAllByText('Sign in').length).toBeGreaterThan(0);
    });

    it('should render email input field', () => {
      const { getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    });

    it('should render password input field', () => {
      const { getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    });

    it('should render sign in button', () => {
      const { getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      // Button text is "Sign in" when not in sign up mode
      const signInElements = getAllByText('Sign in');
      expect(signInElements.length).toBeGreaterThan(0);
    });

    it('should render toggle to sign up', () => {
      const { getByText } = render(<EmailLoginScreen {...defaultProps} />);
      expect(getByText(/Don't have an account|Already have an account/i)).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should call onBack when back button is pressed', () => {
      const { getByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      const backButton = getByText('← Back');
      fireEvent.press(backButton);
      
      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('should update email when typing', () => {
      const { getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      
      const emailInput = getByPlaceholderText('you@example.com');
      fireEvent.changeText(emailInput, 'test@example.com');
      
      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('should update password when typing', () => {
      const { getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      
      const passwordInput = getByPlaceholderText('Enter your password');
      fireEvent.changeText(passwordInput, 'password123');
      
      expect(passwordInput.props.value).toBe('password123');
    });

    it('should toggle between sign in and sign up', () => {
      const { getAllByText, getByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Initially shows "Sign in" (both title and button)
      expect(getAllByText('Sign in').length).toBeGreaterThan(0);
      
      // Find and press toggle link (the "Sign up" link text)
      const toggleLink = getByText('Sign up');
      fireEvent.press(toggleLink);
      
      // Should now show "Create an account" title
      expect(getByText('Create an account')).toBeTruthy();
    });

    it('should show confirm password field when in sign up mode', () => {
      const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
        <EmailLoginScreen {...defaultProps} />
      );
      
      // Initially confirm password should not be visible
      expect(queryByPlaceholderText('Confirm your password')).toBeNull();
      
      // Toggle to sign up - click the "Sign up" link
      const toggleLink = getByText('Sign up');
      fireEvent.press(toggleLink);
      
      // Should show confirm password field
      expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
    });

    it('should call onLogin when form is submitted with valid data', async () => {
      const { getByPlaceholderText, getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Fill in form
      const emailInput = getByPlaceholderText('you@example.com');
      const passwordInput = getByPlaceholderText('Enter your password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      
      // Submit - get the button (not the title)
      const submitButtons = getAllByText('Sign in');
      const submitButton = submitButtons[submitButtons.length - 1]; // Get the last one (button)
      fireEvent.press(submitButton);
      
      // Wait for async operation
      jest.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(defaultProps.onLogin).toHaveBeenCalled();
      });
    });

    it('should show error when form is submitted with empty fields', () => {
      const { getAllByText, getByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Submit without filling fields - get button (not title)
      const submitButtons = getAllByText('Sign in');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.press(submitButton);
      
      // Should show error
      expect(getByText('Please fill in all required fields')).toBeTruthy();
    });

    it('should show error when passwords do not match in sign up mode', () => {
      const { getByText, getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Toggle to sign up - click the "Sign up" link
      const toggleLink = getByText('Sign up');
      fireEvent.press(toggleLink);
      
      // Fill in mismatched passwords
      const emailInput = getByPlaceholderText('you@example.com');
      const passwordInput = getByPlaceholderText('Enter your password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password456');
      
      // Submit - button text is "Create account" in sign up mode
      const submitButton = getByText('Create account');
      fireEvent.press(submitButton);
      
      // Should show error
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should clear error when user starts typing', () => {
      const { getAllByText, getByText, getByPlaceholderText, queryByText } = render(
        <EmailLoginScreen {...defaultProps} />
      );
      
      // Submit empty form to trigger error - get button (not title)
      const submitButtons = getAllByText('Sign in');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.press(submitButton);
      
      // Error should be shown
      expect(getByText('Please fill in all required fields')).toBeTruthy();
      
      // Start typing
      const emailInput = getByPlaceholderText('you@example.com');
      fireEvent.changeText(emailInput, 'test');
      
      // Error should be cleared
      expect(queryByText('Please fill in all required fields')).toBeNull();
    });
  });
});

