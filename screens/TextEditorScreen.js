import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme, Typography, Shadows } from '../utils/constants';
import { createFadeInAnimation, createPressAnimation, createFocusGlowAnimation } from '../utils/animations';

// Animated Button Component
const AnimatedButton = ({ children, onPress, style, ...props }) => {
  const pressAnimation = createPressAnimation();
  
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: pressAnimation.animatedValue }]
        }
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressAnimation.pressIn}
        onPressOut={pressAnimation.pressOut}
        activeOpacity={0.7}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Text Editor Screen Component
export default function TextEditorScreen({ isDarkMode, onBack, onSave }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  const contentInputRef = useRef(null);
  
  // Animation setup
  const headerAnimation = createFadeInAnimation(0);
  const contentAnimation = createFadeInAnimation(100);
  const footerAnimation = createFadeInAnimation(150);
  
  // Start animations on mount
  useEffect(() => {
    headerAnimation.startAnimation();
    contentAnimation.startAnimation();
    footerAnimation.startAnimation();
  }, []);

  // Auto-focus on content when screen loads
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contentInputRef.current) {
        contentInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Save the note
  const handleSave = () => {
    if (content.trim() || title.trim()) {
      const noteTitle = title.trim() || content.split(' ').slice(0, 5).join(' ') || 'New Note';
      onSave(noteTitle, content.trim());
      onBack();
    }
  };

  // Auto-save when content changes
  useEffect(() => {
    if (content.trim() || title.trim()) {
      // Could implement auto-save here if needed
    }
  }, [content, title]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <View style={{ paddingTop: insets.top, flex: 1 }}>
        {/* Header */}
        <View style={[styles.editorHeader, { borderBottomColor: theme.borderColor }]}>
          <AnimatedButton onPress={onBack} style={styles.todayButton}>
            <Text style={[styles.todayButtonText, { color: theme.accentColor }]}>← Back</Text>
          </AnimatedButton>
            
            <View style={styles.titleContainer}>
              {isEditingTitle ? (
                <TextInput
                  style={[styles.titleInputInline, { color: theme.textColor, backgroundColor: theme.inputBackground }]}
                  value={title}
                  onChangeText={setTitle}
                  onBlur={() => setIsEditingTitle(false)}
                  autoFocus
                  placeholder="Note title"
                  placeholderTextColor={theme.placeholderColor}
                />
              ) : (
                <AnimatedButton 
                  style={styles.titleDisplay}
                  onPress={() => setIsEditingTitle(true)}
                >
                  <Text style={[styles.titleText, { color: theme.textColor }]}>
                    {title || 'New Note'}
                  </Text>
                </AnimatedButton>
              )}
            </View>
            
            <View style={styles.editorActions}>
              {(content.trim() || title.trim()) && (
                <AnimatedButton 
                  onPress={handleSave}
                  style={[styles.modernSaveButton, { backgroundColor: theme.accentColor }]}
                >
                  <Text style={[styles.modernSaveButtonText, { color: '#fff' }]}>Save</Text>
                </AnimatedButton>
              )}
            </View>
          </View>

          {/* Main Content Area */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.editorContent}>
              <TouchableWithoutFeedback onPress={() => contentInputRef.current?.focus()}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    ref={contentInputRef}
                    style={[
                      styles.contentInput,
                      {
                        color: theme.textColor,
                        backgroundColor: 'transparent',
                      },
                    ]}
                    value={content}
                    onChangeText={setContent}
                    placeholder="Start typing your note..."
                    placeholderTextColor={theme.placeholderColor}
                    multiline
                    textAlignVertical="top"
                    autoCorrect
                    autoCapitalize="sentences"
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </KeyboardAvoidingView>

          {/* Footer */}
          <View 
            style={[styles.textEditorFooter, { 
              paddingBottom: insets.bottom, 
              backgroundColor: theme.navBackground, 
              borderTopColor: theme.borderColor 
            }]}
          >
            <Text style={[styles.textEditorHint, { color: theme.secondaryTextColor }]}>
              Tap to start typing
            </Text>
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    justifyContent: 'space-between',
    minHeight: 56,
  },
  todayButton: {
    padding: 12,
  },
  todayButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  titleDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  titleText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginRight: 8,
  },
  renameArrow: {
    fontSize: 14,
    opacity: 0.6,
  },
  titleInputInline: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    minWidth: 200,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
    minWidth: 80, // Consistent width for proper centering
    justifyContent: 'flex-end',
  },
  editorContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  contentInput: {
    ...Typography.body,
    flex: 1,
    padding: 0,
  },
  // Modern save button styles with enhanced shadows
  modernSaveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.button,
    minWidth: 120,
  },
  modernSaveButtonText: {
    ...Typography.button,
    color: '#fff',
  },
  textEditorFooter: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 0.5,
  },
  textEditorHint: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});