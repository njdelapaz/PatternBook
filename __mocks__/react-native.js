// Mock react-native for testing
import React from 'react';

export const Platform = {
  OS: 'ios',
  select: (options) => options.ios || options.default,
  Version: 15,
};

export const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  compose: (...styles) => styles,
  hairlineWidth: 0.5,
};

// Mock components
export const View = ({ children, testID, ...props }) => {
  return React.createElement('View', { testID, ...props }, children);
};

export const Text = ({ children, testID, ...props }) => {
  return React.createElement('Text', { testID, ...props }, children);
};

export const ScrollView = ({ children, testID, ...props }) => {
  return React.createElement('ScrollView', { testID, ...props }, children);
};

export const TouchableOpacity = ({ children, onPress, testID, ...props }) => {
  return React.createElement('TouchableOpacity', { onPress, testID, ...props }, children);
};

export const TextInput = ({ testID, ...props }) => {
  return React.createElement('TextInput', { testID, ...props });
};

export const Modal = ({ children, visible, testID, ...props }) => {
  return visible ? React.createElement('Modal', { testID, ...props }, children) : null;
};

export const Pressable = ({ children, onPress, testID, ...props }) => {
  return React.createElement('Pressable', { onPress, testID, ...props }, children);
};

export const Image = ({ source, testID, ...props }) => {
  return React.createElement('Image', { source, testID, ...props });
};

export const ActivityIndicator = ({ testID, ...props }) => {
  return React.createElement('ActivityIndicator', { testID, ...props });
};

export const KeyboardAvoidingView = ({ children, testID, ...props }) => {
  return React.createElement('KeyboardAvoidingView', { testID, ...props }, children);
};

export const TouchableWithoutFeedback = ({ children, onPress, testID, ...props }) => {
  return React.createElement('TouchableWithoutFeedback', { onPress, testID, ...props }, children);
};

export const SafeAreaView = ({ children, testID, ...props }) => {
  return React.createElement('SafeAreaView', { testID, ...props }, children);
};

export const Keyboard = {
  dismiss: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
};

export const Alert = {
  alert: jest.fn(),
  prompt: jest.fn(),
};

export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const Animated = {
  View: View,
  Text: Text,
  Image: Image,
  ScrollView: ScrollView,
  Value: jest.fn(() => ({
    setValue: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    stopAnimation: jest.fn(),
  })),
  timing: jest.fn(() => ({ start: jest.fn() })),
  spring: jest.fn(() => ({ start: jest.fn() })),
  sequence: jest.fn(),
  parallel: jest.fn(),
  delay: jest.fn(),
  loop: jest.fn(),
};

export default {
  Platform,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  SafeAreaView,
  Keyboard,
  Alert,
  Dimensions,
  Animated,
};
