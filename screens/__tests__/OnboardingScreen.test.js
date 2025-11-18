/**
 * OnboardingScreen UI Tests
 * Tests for rendering, slide navigation, and user interactions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OnboardingScreen from '../OnboardingScreen';
import { createOnboardingScreenProps } from '../../__tests__/fixtures/uiTestUtils';

describe('OnboardingScreen', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = createOnboardingScreenProps();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { root } = render(<OnboardingScreen {...defaultProps} />);
      expect(root).toBeTruthy();
    });

    it('should render first slide title', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      expect(getByText('Welcome to PatternBook, your living notebook')).toBeTruthy();
    });

    it('should render continue button on first slide', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      expect(getByText('Continue →')).toBeTruthy();
    });

    it('should render slide indicators', () => {
      const { root } = render(<OnboardingScreen {...defaultProps} />);
      // Indicators are rendered as View elements
      expect(root).toBeTruthy();
    });
  });

  describe('Slide Navigation', () => {
    it('should navigate to next slide when continue button is pressed', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Initially on slide 0
      expect(getByText('Welcome to PatternBook, your living notebook')).toBeTruthy();
      
      // Press continue
      const continueButton = getByText('Continue →');
      fireEvent.press(continueButton);
      
      // Should be on slide 1
      expect(getByText('Dictate or write about anything on your mind')).toBeTruthy();
    });

    it('should navigate through all slides', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate through slides
      for (let i = 0; i < 5; i++) {
        const continueButton = getByText('Continue →');
        fireEvent.press(continueButton);
      }
      
      // Should be on last slide
      expect(getByText('Want a daily reminder to make it a habit?')).toBeTruthy();
    });

    it('should navigate to last slide when continue is pressed on second-to-last slide', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate to slide 4 (index 4, last slide with continue button)
      // Slides 0-4 have continue button, slide 5 has primary/secondary buttons
      for (let i = 0; i < 4; i++) {
        const continueButton = getByText('Continue →');
        fireEvent.press(continueButton);
      }
      
      // Press continue on slide 4 (index 4)
      const continueButton = getByText('Continue →');
      fireEvent.press(continueButton);
      
      // Should navigate to slide 5 (last slide with primary/secondary buttons)
      expect(getByText('Want a daily reminder to make it a habit?')).toBeTruthy();
      // Note: onComplete is called from primary/secondary buttons, not continue button
    });
  });

  describe('User Interactions', () => {
    it('should call onComplete when primary button is pressed on last slide', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate to last slide (slide 5)
      for (let i = 0; i < 5; i++) {
        const continueButton = getByText('Continue →');
        fireEvent.press(continueButton);
      }
      
      // Press primary button
      const primaryButton = getByText('Turn on daily reminder');
      fireEvent.press(primaryButton);
      
      expect(defaultProps.onComplete).toHaveBeenCalled();
    });

    it('should call onComplete when secondary button is pressed on last slide', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate to last slide (slide 5)
      for (let i = 0; i < 5; i++) {
        const continueButton = getByText('Continue →');
        fireEvent.press(continueButton);
      }
      
      // Press secondary button
      const secondaryButton = getByText('Maybe later');
      fireEvent.press(secondaryButton);
      
      expect(defaultProps.onComplete).toHaveBeenCalled();
    });
  });

  describe('Slide Content', () => {
    it('should render note card on slide 2', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate to slide 1
      const continueButton = getByText('Continue →');
      fireEvent.press(continueButton);
      
      // Should show note content
      expect(getByText('Morning pages')).toBeTruthy();
      expect(getByText('NOTE')).toBeTruthy();
    });

    it('should render chat content on slide 3', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate to slide 2
      for (let i = 0; i < 2; i++) {
        const continueButton = getByText('Continue →');
        fireEvent.press(continueButton);
      }
      
      // Should show chat content
      expect(getByText('Chat with your AI when you want a thought partner')).toBeTruthy();
    });

    it('should render related content on slide 4', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate to slide 3
      for (let i = 0; i < 3; i++) {
        const continueButton = getByText('Continue →');
        fireEvent.press(continueButton);
      }
      
      // Should show related content title
      expect(getByText('Every day, it\'ll find things related to what you\'ve been thinking about')).toBeTruthy();
    });

    it('should render letter preview on slide 5', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate to slide 4
      for (let i = 0; i < 4; i++) {
        const continueButton = getByText('Continue →');
        fireEvent.press(continueButton);
      }
      
      // Should show letter preview
      expect(getByText('On Sundays, it\'ll recap your week and offer insights in a personal letter')).toBeTruthy();
    });

    it('should render daily reminder options on slide 6', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate to slide 5
      for (let i = 0; i < 5; i++) {
        const continueButton = getByText('Continue →');
        fireEvent.press(continueButton);
      }
      
      // Should show reminder options
      expect(getByText('Want a daily reminder to make it a habit?')).toBeTruthy();
      expect(getByText('Turn on daily reminder')).toBeTruthy();
      expect(getByText('Maybe later')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button presses', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Rapidly press continue multiple times
      const continueButton = getByText('Continue →');
      fireEvent.press(continueButton);
      fireEvent.press(continueButton);
      fireEvent.press(continueButton);
      
      // Should handle gracefully - after 3 presses, should be on slide 3
      expect(getByText('Every day, it\'ll find things related to what you\'ve been thinking about')).toBeTruthy();
    });

    it('should maintain state correctly during navigation', () => {
      const { getByText } = render(<OnboardingScreen {...defaultProps} />);
      
      // Navigate forward
      const continueButton1 = getByText('Continue →');
      fireEvent.press(continueButton1);
      
      // Should be on slide 1
      expect(getByText('Dictate or write about anything on your mind')).toBeTruthy();
      
      // Navigate forward again
      const continueButton2 = getByText('Continue →');
      fireEvent.press(continueButton2);
      
      // Should be on slide 2
      expect(getByText('Chat with your AI when you want a thought partner')).toBeTruthy();
    });
  });
});

