import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '../utils/constants';
import { editorHeaderStyles, modernSaveButtonStyles } from '../utils/sharedStyles';

// Text Editor Screen Component
export default function TextEditorScreen({ isDarkMode, onBack, onSave }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  const contentInputRef = useRef(null);

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


  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={{ paddingTop: insets.top, flex: 1 }}>
          {/* Header */}
          <View style={[editorHeaderStyles.editorHeader, { borderBottomColor: theme.borderColor }]}>
            <TouchableOpacity onPress={onBack} style={editorHeaderStyles.todayButton}>
              <Text style={[editorHeaderStyles.todayButtonText, { color: theme.accentColor }]}>← Back</Text>
            </TouchableOpacity>
            
            <View style={editorHeaderStyles.titleContainer}>
              {isEditingTitle ? (
                <TextInput
                  style={[editorHeaderStyles.titleInputInline, { color: theme.textColor, backgroundColor: theme.inputBackground }]}
                  value={title}
                  onChangeText={setTitle}
                  onBlur={() => setIsEditingTitle(false)}
                  autoFocus
                  placeholder="Note title"
                  placeholderTextColor={theme.placeholderColor}
                />
              ) : (
                <TouchableOpacity 
                  style={editorHeaderStyles.titleDisplay}
                  onPress={() => setIsEditingTitle(true)}
                >
                  <Text style={[editorHeaderStyles.titleText, { color: theme.textColor }]}>
                    {title || 'New Note'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={editorHeaderStyles.editorActions}>
              {(content.trim() || title.trim()) && (
                <TouchableOpacity 
                  onPress={handleSave}
                  style={[modernSaveButtonStyles.modernSaveButton, { backgroundColor: theme.accentColor }]}
                >
                  <Text style={[modernSaveButtonStyles.modernSaveButtonText, { color: '#fff' }]}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Main Content Area */}
          <TouchableWithoutFeedback onPress={() => contentInputRef.current?.focus()}>
            <View style={styles.editorContent}>
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

          {/* Footer */}
          <View style={[styles.textEditorFooter, { 
            paddingBottom: insets.bottom, 
            backgroundColor: theme.navBackground, 
            borderTopColor: theme.borderColor 
          }]}>
            <Text style={[styles.textEditorHint, { color: theme.secondaryTextColor }]}>
              Tap to start typing
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  contentInput: {
    fontSize: 17,
    lineHeight: 26,
    flex: 1,
    padding: 0,
    fontWeight: '400',
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