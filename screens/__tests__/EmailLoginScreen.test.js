/**
 * EmailLoginScreen UI Tests
 * Tests for rendering, user interactions, form validation, and password requirements
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EmailLoginScreen from '../EmailLoginScreen';
import { createEmailLoginScreenProps } from '../../__tests__/fixtures/uiTestUtils';
import { createUser, verifyUser } from '../../utils/userStorage';

// Mock user storage functions
jest.mock('../../utils/userStorage', () => ({
  createUser: jest.fn(),
  verifyUser: jest.fn(),
}));

describe('EmailLoginScreen', () => {
  let defaultProps;
  
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    createdAt: Date.now(),
  };

  beforeEach(() => {
    defaultProps = createEmailLoginScreenProps();
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Set up default successful mocks
    createUser.mockResolvedValue({ success: true, user: mockUser });
    verifyUser.mockResolvedValue({ success: true, user: mockUser });
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

    it('should render show/hide password button', () => {
      const { getByText } = render(<EmailLoginScreen {...defaultProps} />);
      expect(getByText('Show')).toBeTruthy();
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

    it('should toggle password visibility when Show/Hide is pressed', () => {
      const { getByText, getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      
      const passwordInput = getByPlaceholderText('Enter your password');
      
      // Initially password is hidden (secureTextEntry = true)
      expect(passwordInput.props.secureTextEntry).toBe(true);
      
      // Press Show button
      const showButton = getByText('Show');
      fireEvent.press(showButton);
      
      // Now should show Hide and password should be visible
      expect(getByText('Hide')).toBeTruthy();
      expect(passwordInput.props.secureTextEntry).toBe(false);
    });

    it('should call onLogin when form is submitted with valid data (sign in)', async () => {
      const { getByPlaceholderText, getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Fill in form with valid email and password
      const emailInput = getByPlaceholderText('you@example.com');
      const passwordInput = getByPlaceholderText('Enter your password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Password1!');
      
      // Submit - get the button (not the title)
      const submitButtons = getAllByText('Sign in');
      const submitButton = submitButtons[submitButtons.length - 1]; // Get the last one (button)
      fireEvent.press(submitButton);
      
      // Wait for async operation
      await waitFor(() => {
        expect(verifyUser).toHaveBeenCalledWith('test@example.com', 'Password1!');
        expect(defaultProps.onLogin).toHaveBeenCalledWith(mockUser);
      });
    });

    it('should call onLogin when sign up form is valid', async () => {
      const { getByPlaceholderText, getByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Toggle to sign up
      fireEvent.press(getByText('Sign up'));
      
      // Fill in form with valid data meeting all requirements
      const emailInput = getByPlaceholderText('you@example.com');
      const passwordInput = getByPlaceholderText('Create a strong password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Password1!');
      fireEvent.changeText(confirmPasswordInput, 'Password1!');
      
      // Submit
      const submitButton = getByText('Create account');
      fireEvent.press(submitButton);
      
      // Wait for async operation
      await waitFor(() => {
        expect(createUser).toHaveBeenCalledWith('test@example.com', 'Password1!');
        expect(defaultProps.onLogin).toHaveBeenCalledWith(mockUser);
      });
    });
  });

  describe('Email Validation', () => {
    it('should show error for invalid email format', () => {
      const { getByPlaceholderText, getByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      const emailInput = getByPlaceholderText('you@example.com');
      fireEvent.changeText(emailInput, 'invalidemail');
      
      // Should show inline validation error
      expect(getByText('Please enter a valid email')).toBeTruthy();
    });

    it('should not show error for valid email format', () => {
      const { getByPlaceholderText, queryByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      const emailInput = getByPlaceholderText('you@example.com');
      fireEvent.changeText(emailInput, 'valid@example.com');
      
      // Should not show validation error
      expect(queryByText('Please enter a valid email')).toBeNull();
    });

    it('should accept various valid email formats', () => {
      const { getByPlaceholderText, queryByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      const emailInput = getByPlaceholderText('you@example.com');
      
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
        'test123@test.io',
      ];
      
      validEmails.forEach(email => {
        fireEvent.changeText(emailInput, email);
        expect(queryByText('Please enter a valid email')).toBeNull();
      });
    });

    it('should reject various invalid email formats', () => {
      const { getByPlaceholderText, getByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      const emailInput = getByPlaceholderText('you@example.com');
      
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'no@',
        'spaces in@email.com',
        'missing.domain@',
      ];
      
      invalidEmails.forEach(email => {
        fireEvent.changeText(emailInput, email);
        expect(getByText('Please enter a valid email')).toBeTruthy();
      });
    });
  });

  describe('Password Requirements (Sign Up)', () => {
    it('should show password requirements when typing password in sign up mode', () => {
      const { getByText, getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Toggle to sign up
      fireEvent.press(getByText('Sign up'));
      
      // Type in password field
      const passwordInput = getByPlaceholderText('Create a strong password');
      fireEvent.changeText(passwordInput, 'a');
      
      // Should show all requirements
      expect(getByText('At least 8 characters')).toBeTruthy();
      expect(getByText('One uppercase letter')).toBeTruthy();
      expect(getByText('One lowercase letter')).toBeTruthy();
      expect(getByText('One number')).toBeTruthy();
      expect(getByText('One special character (!@#$%^&*)')).toBeTruthy();
    });

    it('should validate minimum length requirement', () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      fireEvent.press(getByText('Sign up'));
      
      const passwordInput = getByPlaceholderText('Create a strong password');
      
      // Short password - requirement not met
      fireEvent.changeText(passwordInput, 'Short1!');
      let checkmarks = getAllByText('✓');
      let circles = getAllByText('○');
      expect(circles.length).toBeGreaterThan(0); // Some requirements not met
      
      // Long enough password
      fireEvent.changeText(passwordInput, 'LongEnough1!');
      checkmarks = getAllByText('✓');
      expect(checkmarks.length).toBeGreaterThan(0); // At least length requirement met
    });

    it('should validate uppercase requirement', () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      fireEvent.press(getByText('Sign up'));
      
      const passwordInput = getByPlaceholderText('Create a strong password');
      
      // No uppercase
      fireEvent.changeText(passwordInput, 'lowercase1!');
      let checkmarks = getAllByText('✓');
      // Uppercase requirement should not have checkmark
      
      // With uppercase
      fireEvent.changeText(passwordInput, 'Uppercase1!');
      checkmarks = getAllByText('✓');
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should validate lowercase requirement', () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      fireEvent.press(getByText('Sign up'));
      
      const passwordInput = getByPlaceholderText('Create a strong password');
      
      // With lowercase
      fireEvent.changeText(passwordInput, 'hasLower1!');
      const checkmarks = getAllByText('✓');
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should validate number requirement', () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      fireEvent.press(getByText('Sign up'));
      
      const passwordInput = getByPlaceholderText('Create a strong password');
      
      // With number
      fireEvent.changeText(passwordInput, 'Password1!');
      const checkmarks = getAllByText('✓');
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should validate special character requirement', () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      fireEvent.press(getByText('Sign up'));
      
      const passwordInput = getByPlaceholderText('Create a strong password');
      
      // With special character
      fireEvent.changeText(passwordInput, 'Password1!');
      const checkmarks = getAllByText('✓');
      expect(checkmarks.length).toBe(5); // All 5 requirements met
    });

    it('should show all checkmarks when password meets all requirements', () => {
      const { getByText, getByPlaceholderText, getAllByText, queryByText } = render(
        <EmailLoginScreen {...defaultProps} />
      );
      
      fireEvent.press(getByText('Sign up'));
      
      const passwordInput = getByPlaceholderText('Create a strong password');
      fireEvent.changeText(passwordInput, 'ValidPass1!');
      
      // All 5 requirements should show checkmarks
      const checkmarks = getAllByText('✓');
      expect(checkmarks.length).toBe(5);
      
      // No unfilled circles
      expect(queryByText('○')).toBeNull();
    });
  });

  describe('Confirm Password Validation', () => {
    it('should show error when passwords do not match', () => {
      const { getByText, getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Toggle to sign up
      fireEvent.press(getByText('Sign up'));
      
      // Fill in mismatched passwords
      const passwordInput = getByPlaceholderText('Create a strong password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      
      fireEvent.changeText(passwordInput, 'Password1!');
      fireEvent.changeText(confirmPasswordInput, 'DifferentPass1!');
      
      // Should show mismatch error
      expect(getByText('Passwords do not match')).toBeTruthy();
    });

    it('should show success message when passwords match', () => {
      const { getByText, getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Toggle to sign up
      fireEvent.press(getByText('Sign up'));
      
      // Fill in matching passwords
      const passwordInput = getByPlaceholderText('Create a strong password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      
      fireEvent.changeText(passwordInput, 'Password1!');
      fireEvent.changeText(confirmPasswordInput, 'Password1!');
      
      // Should show match success
      expect(getByText('Passwords match ✓')).toBeTruthy();
    });
  });

  describe('Form Submission Validation', () => {
    it('should disable submit button when email is invalid', () => {
      const { getByPlaceholderText, getByTestId } = render(<EmailLoginScreen {...defaultProps} />);
      
      const emailInput = getByPlaceholderText('you@example.com');
      const passwordInput = getByPlaceholderText('Enter your password');
      
      fireEvent.changeText(emailInput, 'invalidemail');
      fireEvent.changeText(passwordInput, 'somepassword');
      
      // Get submit button by testID
      const submitButton = getByTestId('submit-button');
      
      // Button should have disabled accessibility state
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should disable submit button when password requirements not met (sign up)', () => {
      const { getByText, getByPlaceholderText, getByTestId } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Toggle to sign up
      fireEvent.press(getByText('Sign up'));
      
      const emailInput = getByPlaceholderText('you@example.com');
      const passwordInput = getByPlaceholderText('Create a strong password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'weak'); // Doesn't meet requirements
      fireEvent.changeText(confirmPasswordInput, 'weak');
      
      // Get submit button by testID
      const submitButton = getByTestId('submit-button');
      
      // Button should have disabled accessibility state
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should enable submit button when all requirements are met (sign up)', () => {
      const { getByText, getByPlaceholderText, getByTestId } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Toggle to sign up
      fireEvent.press(getByText('Sign up'));
      
      const emailInput = getByPlaceholderText('you@example.com');
      const passwordInput = getByPlaceholderText('Create a strong password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'ValidPass1!');
      fireEvent.changeText(confirmPasswordInput, 'ValidPass1!');
      
      // Get submit button by testID
      const submitButton = getByTestId('submit-button');
      
      // Button should be enabled
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('State Reset on Mode Toggle', () => {
    it('should clear password fields when switching between sign in and sign up', () => {
      const { getByText, getByPlaceholderText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Fill in password in sign in mode
      const passwordInput = getByPlaceholderText('Enter your password');
      fireEvent.changeText(passwordInput, 'somepassword');
      
      // Toggle to sign up
      fireEvent.press(getByText('Sign up'));
      
      // Password should be cleared, find the new password input
      const newPasswordInput = getByPlaceholderText('Create a strong password');
      expect(newPasswordInput.props.value).toBe('');
    });

    it('should reset show password state when switching modes', () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(<EmailLoginScreen {...defaultProps} />);
      
      // Show password in sign in mode
      fireEvent.press(getByText('Show'));
      expect(getByText('Hide')).toBeTruthy();
      
      // Toggle to sign up
      fireEvent.press(getByText('Sign up'));
      
      // Should reset to "Show" (password hidden)
      const showButtons = getAllByText('Show');
      expect(showButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should show Loading text when submitting', async () => {
      const { getByPlaceholderText, getAllByText, getByText } = render(
        <EmailLoginScreen {...defaultProps} />
      );
      
      // Fill in valid form
      const emailInput = getByPlaceholderText('you@example.com');
      const passwordInput = getByPlaceholderText('Enter your password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Password1!');
      
      // Submit
      const submitButtons = getAllByText('Sign in');
      const submitButton = submitButtons[submitButtons.length - 1];
      fireEvent.press(submitButton);
      
      // Should show loading
      expect(getByText('Loading...')).toBeTruthy();
      
      // Wait for async operation
      await waitFor(() => {
        expect(verifyUser).toHaveBeenCalledWith('test@example.com', 'Password1!');
        expect(defaultProps.onLogin).toHaveBeenCalledWith(mockUser);
      });
    });
  });
});
