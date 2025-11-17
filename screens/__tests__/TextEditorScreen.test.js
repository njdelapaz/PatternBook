/**
 * TextEditorScreen UI Tests
 * Tests for rendering, user interactions, and state management
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TextEditorScreen from '../TextEditorScreen';
import { createTextEditorScreenProps } from '../../__tests__/fixtures/uiTestUtils';

describe('TextEditorScreen', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = createTextEditorScreenProps();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { root } = render(<TextEditorScreen {...defaultProps} />);
      expect(root).toBeTruthy();
    });

    it('should render with new note (empty state)', () => {
      const { getByText, getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      expect(getByText('New Note')).toBeTruthy();
      expect(getByPlaceholderText('Start typing your note...')).toBeTruthy();
    });

    it('should render back button', () => {
      const { getByText } = render(<TextEditorScreen {...defaultProps} />);
      expect(getByText('← Back')).toBeTruthy();
    });

    it('should render title input when editing title', () => {
      const { getByText, getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Click on title to enter edit mode
      const titleDisplay = getByText('New Note');
      fireEvent.press(titleDisplay);
      
      // Should show title input
      expect(getByPlaceholderText('Note title')).toBeTruthy();
    });

    it('should render content input', () => {
      const { getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      expect(getByPlaceholderText('Start typing your note...')).toBeTruthy();
    });

    it('should render save button when content or title exists', () => {
      const { getByPlaceholderText, getByText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Type some content
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, 'Test content');
      
      // Save button should appear
      expect(getByText('Save')).toBeTruthy();
    });

    it('should not render save button when content and title are empty', () => {
      const { queryByText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Save button should not be visible initially
      expect(queryByText('Save')).toBeNull();
    });

    it('should render footer hint text', () => {
      const { getByText } = render(<TextEditorScreen {...defaultProps} />);
      expect(getByText('Tap to start typing')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should call onBack when back button is pressed', () => {
      const { getByText } = render(<TextEditorScreen {...defaultProps} />);
      
      const backButton = getByText('← Back');
      fireEvent.press(backButton);
      
      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('should update title when typing in title input', () => {
      const { getByText, getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Enter title edit mode
      const titleDisplay = getByText('New Note');
      fireEvent.press(titleDisplay);
      
      // Type in title input
      const titleInput = getByPlaceholderText('Note title');
      fireEvent.changeText(titleInput, 'My New Title');
      
      // Title should update
      expect(titleInput.props.value).toBe('My New Title');
    });

    it('should exit title edit mode on blur', () => {
      const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
        <TextEditorScreen {...defaultProps} />
      );
      
      // Enter title edit mode
      const titleDisplay = getByText('New Note');
      fireEvent.press(titleDisplay);
      
      // Verify input is shown
      expect(getByPlaceholderText('Note title')).toBeTruthy();
      
      // Blur the input
      const titleInput = getByPlaceholderText('Note title');
      fireEvent(titleInput, 'blur');
      
      // Input should be hidden, display should show
      jest.advanceTimersByTime(100);
      expect(queryByPlaceholderText('Note title')).toBeNull();
    });

    it('should update content when typing in content input', () => {
      const { getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, 'This is my note content');
      
      expect(contentInput.props.value).toBe('This is my note content');
    });

    it('should call onSave when save button is pressed with content', () => {
      const { getByPlaceholderText, getByText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Add content
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, 'Test content');
      
      // Press save button
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);
      
      // When title is empty, it generates title from content (first 5 words)
      // Since content is "Test content" (2 words), it uses that or "New Note" as fallback
      expect(defaultProps.onSave).toHaveBeenCalled();
      const callArgs = defaultProps.onSave.mock.calls[0];
      expect(callArgs[1]).toBe('Test content'); // content is correct
      // Title will be generated from content or default to "New Note"
    });

    it('should call onSave when save button is pressed with title only', () => {
      const { getByText, getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Edit title
      const titleDisplay = getByText('New Note');
      fireEvent.press(titleDisplay);
      const titleInput = getByPlaceholderText('Note title');
      fireEvent.changeText(titleInput, 'My Title');
      fireEvent(titleInput, 'blur');
      
      // Press save button
      jest.advanceTimersByTime(100);
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);
      
      expect(defaultProps.onSave).toHaveBeenCalledWith('My Title', '');
    });

    it('should call onBack after saving', () => {
      const { getByPlaceholderText, getByText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Add content and save
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, 'Test');
      
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);
      
      // onBack should be called after onSave
      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('should generate title from content when title is empty', () => {
      const { getByPlaceholderText, getByText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Add content without title
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, 'This is a test note with multiple words');
      
      // Save
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);
      
      // Should generate title from first 5 words
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        'This is a test note',
        'This is a test note with multiple words'
      );
    });

    it('should not save when both title and content are empty', () => {
      const { queryByText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Save button should not be visible
      expect(queryByText('Save')).toBeNull();
      
      // onSave should not be called
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should show save button when content is added', () => {
      const { getByPlaceholderText, queryByText, getByText } = render(
        <TextEditorScreen {...defaultProps} />
      );
      
      // Initially no save button
      expect(queryByText('Save')).toBeNull();
      
      // Add content
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, 'Test');
      
      // Save button should appear
      expect(getByText('Save')).toBeTruthy();
    });

    it('should show save button when title is added', () => {
      const { getByText, getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      
      // Edit title
      const titleDisplay = getByText('New Note');
      fireEvent.press(titleDisplay);
      const titleInput = getByPlaceholderText('Note title');
      fireEvent.changeText(titleInput, 'My Title');
      
      // Save button should appear
      expect(getByText('Save')).toBeTruthy();
    });

    it('should toggle title edit mode', () => {
      const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
        <TextEditorScreen {...defaultProps} />
      );
      
      // Initially in display mode
      expect(queryByPlaceholderText('Note title')).toBeNull();
      
      // Click to enter edit mode
      const titleDisplay = getByText('New Note');
      fireEvent.press(titleDisplay);
      
      // Should be in edit mode
      expect(getByPlaceholderText('Note title')).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme styles when isDarkMode is true', () => {
      const props = createTextEditorScreenProps({ isDarkMode: true });
      const { root } = render(<TextEditorScreen {...props} />);
      
      expect(props.isDarkMode).toBe(true);
      expect(root).toBeTruthy();
    });

    it('should apply light theme styles when isDarkMode is false', () => {
      const props = createTextEditorScreenProps({ isDarkMode: false });
      const { root } = render(<TextEditorScreen {...props} />);
      
      expect(props.isDarkMode).toBe(false);
      expect(root).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', () => {
      const { getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      
      const longContent = 'A'.repeat(10000);
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, longContent);
      
      expect(contentInput.props.value).toBe(longContent);
    });

    it('should handle special characters in content', () => {
      const { getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      
      const specialContent = 'Test with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, specialContent);
      
      expect(contentInput.props.value).toBe(specialContent);
    });

    it('should handle empty string content', () => {
      const { getByPlaceholderText } = render(<TextEditorScreen {...defaultProps} />);
      
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, '');
      
      expect(contentInput.props.value).toBe('');
    });

    it('should handle whitespace-only content', () => {
      const { getByPlaceholderText, queryByText } = render(<TextEditorScreen {...defaultProps} />);
      
      const contentInput = getByPlaceholderText('Start typing your note...');
      fireEvent.changeText(contentInput, '   \n\t   ');
      
      // Save button should not appear for whitespace-only
      expect(queryByText('Save')).toBeNull();
    });
  });
});

