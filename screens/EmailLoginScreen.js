import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createUser, verifyUser } from '../utils/userStorage';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirement checkers
const passwordRequirements = {
  minLength: { label: 'At least 8 characters', check: (p) => p.length >= 8 },
  hasUppercase: { label: 'One uppercase letter', check: (p) => /[A-Z]/.test(p) },
  hasLowercase: { label: 'One lowercase letter', check: (p) => /[a-z]/.test(p) },
  hasNumber: { label: 'One number', check: (p) => /[0-9]/.test(p) },
  hasSpecial: { label: 'One special character (!@#$%^&*)', check: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
};

export default function EmailLoginScreen({ onBack, onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate email format
  const isEmailValid = useMemo(() => EMAIL_REGEX.test(email), [email]);

  // Check all password requirements
  const passwordChecks = useMemo(() => {
    return Object.entries(passwordRequirements).map(([key, req]) => ({
      key,
      label: req.label,
      met: req.check(password),
    }));
  }, [password]);

  // Check if all password requirements are met
  const allPasswordRequirementsMet = useMemo(() => {
    return passwordChecks.every((check) => check.met);
  }, [passwordChecks]);

  // Check if passwords match (for sign up)
  const passwordsMatch = useMemo(() => {
    return password === confirmPassword && confirmPassword.length > 0;
  }, [password, confirmPassword]);

  // Determine if form is valid
  const isFormValid = useMemo(() => {
    if (isSignUp) {
      return isEmailValid && allPasswordRequirementsMet && passwordsMatch;
    }
    return isEmailValid && password.length > 0;
  }, [isSignUp, isEmailValid, allPasswordRequirementsMet, passwordsMatch, password]);

  const handleSubmit = async () => {
    setError('');

    // Validate email
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!isEmailValid) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    if (isSignUp) {
      // Check password requirements for sign up
      if (!allPasswordRequirementsMet) {
        setError('Password does not meet all requirements');
        return;
      }

      // Check passwords match
      if (!passwordsMatch) {
        setError('Passwords do not match');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Create new user account
        const result = await createUser(email.trim(), password);
        
        if (!result.success) {
          setError(result.error);
          setIsLoading(false);
          return;
        }
        
        // Successfully created account, now login
        setIsLoading(false);
        onLogin(result.user);
      } else {
        // Verify existing user credentials
        const result = await verifyUser(email.trim(), password);
        
        if (!result.success) {
          setError(result.error);
          setIsLoading(false);
          return;
        }
        
        // Successfully logged in
        setIsLoading(false);
        onLogin(result.user);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isSignUp ? 'Create an account' : 'Sign in'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Enter your email and password to get started'
                : 'Enter your email and password to continue'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  email.length > 0 && !isEmailValid && styles.inputError,
                  email.length > 0 && isEmailValid && styles.inputValid,
                ]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                placeholder="you@example.com"
                placeholderTextColor="#666666"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {email.length > 0 && !isEmailValid && (
                <Text style={styles.fieldError}>Please enter a valid email</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    isSignUp && password.length > 0 && !allPasswordRequirementsMet && styles.inputError,
                    isSignUp && password.length > 0 && allPasswordRequirementsMet && styles.inputValid,
                  ]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  placeholder={isSignUp ? 'Create a strong password' : 'Enter your password'}
                  placeholderTextColor="#666666"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Password Requirements (only for sign up) */}
              {isSignUp && password.length > 0 && (
                <View style={styles.requirementsContainer}>
                  {passwordChecks.map((req) => (
                    <View key={req.key} style={styles.requirementRow}>
                      <Text style={[styles.requirementIcon, req.met && styles.requirementMet]}>
                        {req.met ? '✓' : '○'}
                      </Text>
                      <Text style={[styles.requirementText, req.met && styles.requirementTextMet]}>
                        {req.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Confirm Password (only for sign up) */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      confirmPassword.length > 0 && !passwordsMatch && styles.inputError,
                      confirmPassword.length > 0 && passwordsMatch && styles.inputValid,
                    ]}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setError('');
                    }}
                    placeholder="Confirm your password"
                    placeholderTextColor="#666666"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.showPasswordButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.showPasswordText}>
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <Text style={styles.fieldError}>Passwords do not match</Text>
                )}
                {confirmPassword.length > 0 && passwordsMatch && (
                  <Text style={styles.fieldSuccess}>Passwords match ✓</Text>
                )}
              </View>
            )}

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              testID="submit-button"
              style={[
                styles.submitButton,
                (!isFormValid || isLoading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={!isFormValid || isLoading}
              accessibilityState={{ disabled: !isFormValid || isLoading }}
              accessibilityLabel={isSignUp ? 'Create account' : 'Sign in'}
            >
              <Text style={styles.submitButtonText}>
                {isLoading
                  ? 'Loading...'
                  : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggle between Sign in and Sign up */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setPassword('');
                setConfirmPassword('');
                setError('');
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleLink}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 30,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
    lineHeight: 24,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  inputValid: {
    borderColor: '#34c759',
  },
  passwordWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 70,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  showPasswordText: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
  },
  requirementsContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementIcon: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
    width: 18,
  },
  requirementMet: {
    color: '#34c759',
  },
  requirementText: {
    fontSize: 13,
    color: '#666666',
  },
  requirementTextMet: {
    color: '#34c759',
  },
  fieldError: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  fieldSuccess: {
    fontSize: 12,
    color: '#34c759',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#3a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  toggleText: {
    fontSize: 14,
    color: '#999999',
  },
  toggleLink: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
