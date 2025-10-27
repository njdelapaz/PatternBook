import { Animated, Easing } from 'react-native';

// Animation configurations for consistent, subtle effects
export const AnimationConfig = {
  // Subtle fade-in for new content
  fadeIn: {
    duration: 300,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  },
  
  // Quick micro-interaction for buttons
  microInteraction: {
    duration: 150,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  },
  
  // Smooth scale animation for button presses
  scalePress: {
    duration: 100,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  },
  
  // Focus glow animation for inputs
  focusGlow: {
    duration: 200,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  },
};

// Helper function to create fade-in animation
export const createFadeInAnimation = (delay = 0) => {
  const animatedValue = new Animated.Value(0);
  
  const startAnimation = () => {
    Animated.timing(animatedValue, {
      toValue: 1,
      delay,
      ...AnimationConfig.fadeIn,
    }).start();
  };
  
  return {
    animatedValue,
    startAnimation,
  };
};

// Helper function for button press animation
export const createPressAnimation = () => {
  const animatedValue = new Animated.Value(1);
  
  const pressIn = () => {
    Animated.timing(animatedValue, {
      toValue: 0.95,
      ...AnimationConfig.scalePress,
    }).start();
  };
  
  const pressOut = () => {
    Animated.timing(animatedValue, {
      toValue: 1,
      ...AnimationConfig.scalePress,
    }).start();
  };
  
  return {
    animatedValue,
    pressIn,
    pressOut,
  };
};

// Helper function for focus glow animation
export const createFocusGlowAnimation = () => {
  const animatedValue = new Animated.Value(0);
  
  const focusIn = () => {
    Animated.timing(animatedValue, {
      toValue: 1,
      ...AnimationConfig.focusGlow,
    }).start();
  };
  
  const focusOut = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      ...AnimationConfig.focusGlow,
    }).start();
  };
  
  return {
    animatedValue,
    focusIn,
    focusOut,
  };
};

// Staggered animation for lists
export const createStaggeredAnimation = (itemCount, baseDelay = 50) => {
  const animations = [];
  
  for (let i = 0; i < itemCount; i++) {
    const { animatedValue, startAnimation } = createFadeInAnimation(i * baseDelay);
    animations.push({ animatedValue, startAnimation });
  }
  
  return animations;
};
