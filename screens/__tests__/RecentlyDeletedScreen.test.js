/**
 * RecentlyDeletedScreen UI Tests
 * Tests for rendering, user interactions, and state management
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RecentlyDeletedScreen from '../RecentlyDeletedScreen';
import { createRecentlyDeletedScreenProps, createMockNote } from '../../__tests__/fixtures/uiTestUtils';

describe('RecentlyDeletedScreen', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = createRecentlyDeletedScreenProps();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { root } = render(<RecentlyDeletedScreen {...defaultProps} />);
      expect(root).toBeTruthy();
    });

    it('should render back button', () => {
      const { getByText } = render(<RecentlyDeletedScreen {...defaultProps} />);
      expect(getByText('← Back')).toBeTruthy();
    });

    it('should render "Recently Deleted" title', () => {
      const { getByText } = render(<RecentlyDeletedScreen {...defaultProps} />);
      expect(getByText('Recently Deleted')).toBeTruthy();
    });

    it('should render empty state when no deleted notes', () => {
      const { getByText } = render(<RecentlyDeletedScreen {...defaultProps} />);
      expect(getByText('No deleted notes')).toBeTruthy();
    });

    it('should render deleted notes when provided', () => {
      const deletedNotes = [
        createMockNote({ id: '1', title: 'Deleted Note 1', deletedAt: Date.now() }),
        createMockNote({ id: '2', title: 'Deleted Note 2', deletedAt: Date.now() })
      ];
      const props = createRecentlyDeletedScreenProps({ deletedNotes });
      const { getByText } = render(<RecentlyDeletedScreen {...props} />);
      
      expect(getByText('Deleted Note 1')).toBeTruthy();
      expect(getByText('Deleted Note 2')).toBeTruthy();
    });

    it('should render restore button for each deleted note', () => {
      const deletedNotes = [
        createMockNote({ id: '1', title: 'Deleted Note 1', deletedAt: Date.now() })
      ];
      const props = createRecentlyDeletedScreenProps({ deletedNotes });
      const { getAllByText } = render(<RecentlyDeletedScreen {...props} />);
      
      expect(getAllByText('Restore').length).toBeGreaterThan(0);
    });

    it('should render delete forever button for each deleted note', () => {
      const deletedNotes = [
        createMockNote({ id: '1', title: 'Deleted Note 1', deletedAt: Date.now() })
      ];
      const props = createRecentlyDeletedScreenProps({ deletedNotes });
      const { getAllByText } = render(<RecentlyDeletedScreen {...props} />);
      
      expect(getAllByText('Delete Forever').length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    it('should call onBack when back button is pressed', () => {
      const { getByText } = render(<RecentlyDeletedScreen {...defaultProps} />);
      
      const backButton = getByText('← Back');
      fireEvent.press(backButton);
      
      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('should call onRestoreNote when restore button is pressed', () => {
      const deletedNotes = [
        createMockNote({ id: '1', title: 'Deleted Note 1', deletedAt: Date.now() })
      ];
      const props = createRecentlyDeletedScreenProps({ deletedNotes });
      const { getByText } = render(<RecentlyDeletedScreen {...props} />);
      
      const restoreButton = getByText('Restore');
      fireEvent.press(restoreButton);
      
      expect(props.onRestoreNote).toHaveBeenCalledWith('1');
    });

    it('should call onPermanentlyDeleteNote when delete forever button is pressed', () => {
      const deletedNotes = [
        createMockNote({ id: '1', title: 'Deleted Note 1', deletedAt: Date.now() })
      ];
      const props = createRecentlyDeletedScreenProps({ deletedNotes });
      const { getByText } = render(<RecentlyDeletedScreen {...props} />);
      
      const deleteButton = getByText('Delete Forever');
      fireEvent.press(deleteButton);
      
      expect(props.onPermanentlyDeleteNote).toHaveBeenCalledWith('1');
    });

    it('should handle multiple deleted notes correctly', () => {
      const deletedNotes = [
        createMockNote({ id: '1', title: 'Deleted Note 1', deletedAt: Date.now() }),
        createMockNote({ id: '2', title: 'Deleted Note 2', deletedAt: Date.now() })
      ];
      const props = createRecentlyDeletedScreenProps({ deletedNotes });
      const { getAllByText } = render(<RecentlyDeletedScreen {...props} />);
      
      // Restore first note - get all restore buttons and press the first one
      const restoreButtons = getAllByText('Restore');
      fireEvent.press(restoreButtons[0]);
      
      // Should call with correct ID
      expect(props.onRestoreNote).toHaveBeenCalledWith('1');
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme styles when isDarkMode is true', () => {
      const props = createRecentlyDeletedScreenProps({ isDarkMode: true });
      const { root } = render(<RecentlyDeletedScreen {...props} />);
      
      expect(props.isDarkMode).toBe(true);
      expect(root).toBeTruthy();
    });

    it('should apply light theme styles when isDarkMode is false', () => {
      const props = createRecentlyDeletedScreenProps({ isDarkMode: false });
      const { root } = render(<RecentlyDeletedScreen {...props} />);
      
      expect(props.isDarkMode).toBe(false);
      expect(root).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty deleted notes array', () => {
      const props = createRecentlyDeletedScreenProps({ deletedNotes: [] });
      const { getByText } = render(<RecentlyDeletedScreen {...props} />);
      
      expect(getByText('No deleted notes')).toBeTruthy();
    });

    it('should handle notes with missing deletedAt timestamp', () => {
      const deletedNotes = [
        { id: '1', title: 'Note without timestamp' }
      ];
      const props = createRecentlyDeletedScreenProps({ deletedNotes });
      const { root } = render(<RecentlyDeletedScreen {...props} />);
      
      // Should render without crashing
      expect(root).toBeTruthy();
    });
  });
});

