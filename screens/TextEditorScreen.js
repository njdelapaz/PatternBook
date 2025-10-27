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
  Keyboard
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '../utils/constants';
import { FormattingToolbar, MarkdownText } from '../utils/components';

// Text Editor Screen Component
export default function TextEditorScreen({ isDarkMode, onBack, onSave, initialContent = '', initialTitle = '' }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [title, setTitle] = useState(initialTitle);
  // Store content as lines with individual formatting
  const [lines, setLines] = useState([{ 
    text: initialContent || '', 
    bold: false, 
    italic: false, 
    header: 0, 
    listType: null,
    quote: false 
  }]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  
  // Current formatting state - what gets applied to new text
  const [currentFormat, setCurrentFormat] = useState({
    bold: false,
    italic: false,
    header: 0,
    listType: null, // 'bullet', 'number', or null
    quote: false
  });
  
  const contentInputRef = useRef(null);

  // Ensure lines are always in the correct format
  useEffect(() => {
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      setLines([{ 
        text: initialContent || '', 
        bold: false, 
        italic: false, 
        header: 0, 
        listType: null,
        quote: false 
      }]);
    }
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

  // Convert lines array to plain text for saving and display
  const getPlainTextContent = () => {
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return '';
    }
    try {
      return lines.map(line => line?.text || '').join('\n');
    } catch (error) {
      console.error('Error getting plain text content:', error);
      return '';
    }
  };

  // Get current line being edited based on cursor position
  const getCurrentLineIndex = (text, cursorPosition) => {
    if (!text) return 0;
    const textUpToCursor = text.substring(0, cursorPosition);
    const lineBreaks = (textUpToCursor.match(/\n/g) || []).length;
    return Math.min(lineBreaks, lines.length - 1);
  };

  // Handle text changes with automatic list continuation
  const handleTextChange = (newText) => {
    const oldText = getPlainTextContent();
    
    // Check if user pressed enter (new line added)
    if (newText.length > oldText.length && newText.includes('\n')) {
      const textLines = newText.split('\n');
      
      // Find where the new line was inserted
      const oldLines = oldText.split('\n');
      
      // Check if we're in list mode and a new line was added
      if (currentFormat.listType === 'bullet') {
        // Find the line that ends with a newline and add bullet
        for (let i = 0; i < textLines.length; i++) {
          if (i >= oldLines.length || textLines[i] !== oldLines[i]) {
            // This is where the new content starts
            if (textLines[i] === '' && i > 0) {
              // Get indentation from previous line
              const prevLine = textLines[i - 1];
              const bulletMatch = prevLine.match(/^(\s*)•\s/);
              const indent = bulletMatch ? bulletMatch[1] : '';
              // Empty new line, add bullet with same indentation
              textLines[i] = `${indent}• `;
              const finalText = textLines.join('\n');
              updateTextAndCursor(finalText, finalText.length);
              return;
            }
          }
        }
      }
      else if (currentFormat.listType === 'number') {
        // Find the line that ends with a newline and add next number
        for (let i = 0; i < textLines.length; i++) {
          if (i >= oldLines.length || textLines[i] !== oldLines[i]) {
            // This is where the new content starts
            if (textLines[i] === '' && i > 0) {
              // Find the previous line's number and indentation
              const prevLine = textLines[i - 1];
              const match = prevLine.match(/^(\s*)(\d+)\./);
              if (match) {
                const indent = match[1];
                const num = parseInt(match[2]) + 1;
                textLines[i] = `${indent}${num}. `;
                const finalText = textLines.join('\n');
                updateTextAndCursor(finalText, finalText.length);
                return;
              }
            }
          }
        }
      }
    }

    // Regular text change
    const newLines = [...lines];
    if (newLines.length > 0) {
      newLines[0] = {
        ...newLines[0],
        text: newText || ''
      };
    } else {
      newLines.push({
        text: newText || '',
        bold: false,
        italic: false,
        header: 0,
        listType: null,
        quote: false
      });
    }
    setLines(newLines);
  };

  // Helper function to update text and set cursor position
  const updateTextAndCursor = (text, cursorPosition) => {
    const newLines = [...lines];
    if (newLines.length > 0) {
      newLines[0] = {
        ...newLines[0],
        text: text || ''
      };
    } else {
      newLines.push({
        text: text || '',
        bold: false,
        italic: false,
        header: 0,
        listType: null,
        quote: false
      });
    }
    setLines(newLines);
    
    // Set cursor position
    setTimeout(() => {
      if (contentInputRef.current) {
        contentInputRef.current.setNativeProps({
          selection: { start: cursorPosition, end: cursorPosition }
        });
      }
    }, 50);
  };

  // Handle nested list toggle (switching between bullet and number creates indented sub-lists)
  const handleNestedListToggle = (newListType) => {
    const currentText = getPlainTextContent();
    const textLines = currentText.split('\n');
    
    // Find the current cursor position to determine which line we're on
    setTimeout(() => {
      if (contentInputRef.current) {
        contentInputRef.current._lastNativeSelection = contentInputRef.current._lastNativeSelection || { start: 0 };
        const cursorPos = contentInputRef.current._lastNativeSelection.start || 0;
        const textBeforeCursor = currentText.substring(0, cursorPos);
        const currentLineIndex = (textBeforeCursor.match(/\n/g) || []).length;
        
        if (currentLineIndex < textLines.length) {
          const currentLine = textLines[currentLineIndex];
          let newLine = '';
          
          // Determine indentation and new list marker
          if (newListType === 'bullet') {
            // Converting number to bullet - add indentation
            if (/^\s*\d+\.\s/.test(currentLine)) {
              const match = currentLine.match(/^(\s*)\d+\.\s(.*)$/);
              if (match) {
                const [, indent, content] = match;
                newLine = `${indent}  • ${content}`; // Add 2 spaces for nesting
              }
            } else {
              // Add bullet to current line
              newLine = `  • ${currentLine.trim()}`; // Add 2 spaces for nesting
            }
          } else if (newListType === 'number') {
            // Converting bullet to number - add indentation
            if (/^\s*•\s/.test(currentLine)) {
              const match = currentLine.match(/^(\s*)•\s(.*)$/);
              if (match) {
                const [, indent, content] = match;
                newLine = `${indent}  1. ${content}`; // Add 2 spaces for nesting
              }
            } else {
              // Add number to current line
              newLine = `  1. ${currentLine.trim()}`; // Add 2 spaces for nesting
            }
          }
          
          // Replace the current line with the nested version
          const newTextLines = [...textLines];
          newTextLines[currentLineIndex] = newLine;
          const finalText = newTextLines.join('\n');
          
          handleTextChange(finalText);
          
          // Position cursor at end of new line
          setTimeout(() => {
            const newCursorPos = newTextLines.slice(0, currentLineIndex + 1).join('\n').length;
            if (contentInputRef.current) {
              contentInputRef.current.setNativeProps({
                selection: { start: newCursorPos, end: newCursorPos }
              });
            }
          }, 100);
        }
      }
    }, 50);
  };

  // Keyboard visibility listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  // Save the note
  const handleSave = () => {
    const plainText = getPlainTextContent();
    if (plainText.trim() || title.trim()) {
      const noteTitle = title.trim() || plainText.split(' ').slice(0, 5).join(' ') || 'New Note';
      onSave(noteTitle, plainText.trim());
      onBack();
    }
  };

  // Auto-save when content changes
  useEffect(() => {
    const plainText = getPlainTextContent();
    if (plainText.trim() || title.trim()) {
      // Could implement auto-save here if needed
    }
  }, [lines, title]);

  // Get appropriate placeholder text based on current format
  const getPlaceholderText = () => {
    if (currentFormat.listType === 'bullet') return '• Start your bullet point...';
    if (currentFormat.listType === 'number') return '1. Start your numbered list...';
    if (currentFormat.quote) return 'Start your quote...';
    if (currentFormat.header === 1) return 'Header 1';
    if (currentFormat.header === 2) return 'Header 2';
    if (currentFormat.header === 3) return 'Header 3';
    return 'Start typing your note...';
  };

  // Get placeholder for empty lines
  const getPlaceholder = () => {
    if (currentFormat.listType === 'bullet') return 'Start your bullet point...';
    if (currentFormat.listType === 'number') return 'Start your numbered list...';
    if (currentFormat.quote) return 'Start your quote...';
    if (currentFormat.header === 1) return 'Header 1';
    if (currentFormat.header === 2) return 'Header 2';
    if (currentFormat.header === 3) return 'Header 3';
    return 'Start typing your note...';
  };

  // Handle formatting button presses - toggle formatting state like Google Docs
  const handleFormatToggle = (button) => {
    const { id } = button;
    
    if (id === 'bold') {
      setCurrentFormat(prev => ({ ...prev, bold: !prev.bold }));
    } else if (id === 'italic') {
      setCurrentFormat(prev => ({ ...prev, italic: !prev.italic }));
    } else if (id.startsWith('h')) {
      const headerLevel = parseInt(id.charAt(1));
      setCurrentFormat(prev => ({ 
        ...prev, 
        header: prev.header === headerLevel ? 0 : headerLevel,
        listType: null, // Clear list when setting header
        quote: false // Clear quote when setting header
      }));
    } else if (id === 'bullet') {
      const wasActive = currentFormat.listType === 'bullet';
      const wasNumber = currentFormat.listType === 'number';
      
      setCurrentFormat(prev => ({ 
        ...prev, 
        listType: wasActive ? null : 'bullet',
        header: 0, // Clear header when setting list
        quote: false // Clear quote when setting list
      }));
      
      // If switching from number to bullet (create nested list)
      if (wasNumber) {
        handleNestedListToggle('bullet');
      }
      // If activating bullet list from scratch
      else if (!wasActive) {
        const currentText = getPlainTextContent();
        if (!currentText.startsWith('• ')) {
          const newText = currentText ? '• ' + currentText : '• ';
          handleTextChange(newText);
          // Position cursor after bullet
          setTimeout(() => {
            if (contentInputRef.current) {
              contentInputRef.current.setNativeProps({
                selection: { start: 2, end: 2 }
              });
            }
          }, 50);
        }
      }
    } else if (id === 'number') {
      const wasActive = currentFormat.listType === 'number';
      const wasBullet = currentFormat.listType === 'bullet';
      
      setCurrentFormat(prev => ({ 
        ...prev, 
        listType: wasActive ? null : 'number',
        header: 0, // Clear header when setting list
        quote: false // Clear quote when setting list
      }));
      
      // If switching from bullet to number (create nested list)
      if (wasBullet) {
        handleNestedListToggle('number');
      }
      // If activating numbered list from scratch
      else if (!wasActive) {
        const currentText = getPlainTextContent();
        if (!currentText.startsWith('1. ')) {
          const newText = currentText ? '1. ' + currentText : '1. ';
          handleTextChange(newText);
          // Position cursor after number
          setTimeout(() => {
            if (contentInputRef.current) {
              contentInputRef.current.setNativeProps({
                selection: { start: 3, end: 3 }
              });
            }
          }, 50);
        }
      }
    } else if (id === 'quote') {
      setCurrentFormat(prev => ({ 
        ...prev, 
        quote: !prev.quote,
        header: 0, // Clear header when setting quote
        listType: null // Clear list when setting quote
      }));
    }
    
    // Keep focus on the input after toggling format
    setTimeout(() => {
      if (contentInputRef.current) {
        contentInputRef.current.focus();
      }
    }, 10);
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
          <View style={[styles.editorHeader, { borderBottomColor: theme.borderColor }]}>
            <TouchableOpacity onPress={onBack} style={styles.todayButton}>
              <Text style={[styles.todayButtonText, { color: theme.accentColor }]}>← Back</Text>
            </TouchableOpacity>
            
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
                <TouchableOpacity 
                  style={styles.titleDisplay}
                  onPress={() => setIsEditingTitle(true)}
                >
                  <Text style={[styles.titleText, { color: theme.textColor }]}>
                    {title || 'New Note'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.editorActions}>
              {(getPlainTextContent().trim() || title.trim()) && (
                <TouchableOpacity 
                  onPress={handleSave}
                  style={[styles.modernSaveButton, { backgroundColor: theme.accentColor }]}
                >
                  <Text style={[styles.modernSaveButtonText, { color: '#fff' }]}>Save</Text>
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
                  // Apply current formatting to make text and cursor match
                  currentFormat.bold && styles.boldText,
                  currentFormat.italic && styles.italicText,
                  currentFormat.header === 1 && styles.header1Text,
                  currentFormat.header === 2 && styles.header2Text,
                  currentFormat.header === 3 && styles.header3Text,
                  currentFormat.quote && [styles.quoteInputStyle, { borderLeftColor: theme.accentColor }],
                ]}
                value={getPlainTextContent()}
                onChangeText={handleTextChange}
                placeholder={getPlaceholderText()}
                placeholderTextColor={theme.placeholderColor}
                multiline
                textAlignVertical="top"
                autoCorrect
                autoCapitalize="sentences"
                selectionColor={theme.accentColor}
              />
              
              {/* Formatting Status Indicator */}
              {(currentFormat.bold || currentFormat.italic || currentFormat.header > 0 || currentFormat.listType || currentFormat.quote) && (
                <View style={styles.formatStatus}>
                  <Text style={[styles.formatStatusText, { color: theme.secondaryTextColor }]}>
                    {currentFormat.bold && '**Bold** '}
                    {currentFormat.italic && '*Italic* '}
                    {currentFormat.header > 0 && `H${currentFormat.header} `}
                    {currentFormat.listType === 'bullet' && '• Bullet List '}
                    {currentFormat.listType === 'number' && '1. Numbered List '}
                    {currentFormat.quote && '"> Quote '}
                    formatting active
                  </Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>

          {/* Formatting Toolbar */}
          <FormattingToolbar
            onInsertFormat={handleFormatToggle}
            isDarkMode={isDarkMode}
            isKeyboardVisible={isKeyboardVisible}
            currentFormat={currentFormat}
          />

          {/* Footer */}
          {!isKeyboardVisible && (
            <View style={[styles.textEditorFooter, { 
              paddingBottom: insets.bottom, 
              backgroundColor: theme.navBackground, 
              borderTopColor: theme.borderColor 
            }]}>
              <Text style={[styles.textEditorHint, { color: theme.secondaryTextColor }]}>
                Use formatting toolbar • Bold/Italic toggle on/off • Headers apply to new text
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
    letterSpacing: -0.2,
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
    fontSize: 17,
    lineHeight: 26,
    flex: 1,
    padding: 0,
    fontWeight: '400',
  },

  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  header1Text: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  header2Text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 6,
  },
  header3Text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  styledInput: {
    fontSize: 17,
    lineHeight: 26,
    flex: 1,
    padding: 0,
    fontWeight: '400',
    backgroundColor: 'transparent',
  },

  quoteBar: {
    width: 4,
    marginRight: 12,
    borderRadius: 2,
    minHeight: 26,
  },
  quoteText: {
    fontStyle: 'italic',
    color: '#666',
  },
  quoteInputStyle: {
    fontStyle: 'italic',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent', // Will be set by theme
    paddingLeft: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    paddingVertical: 8,
    borderRadius: 4,
  },
  formatStatus: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    marginTop: 8,
  },
  formatStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quoteContainer: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginVertical: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    paddingVertical: 8,
    borderRadius: 4,
  },
  quoteText: {
    fontStyle: 'italic',
  },
  listContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingLeft: 8,
  },
  bulletPoint: {
    marginRight: 8,
    fontWeight: '600',
  },
  listText: {
    flex: 1,
  },
  contentInput: {
    fontSize: 17,
    lineHeight: 26,
    flex: 1,
    padding: 0,
    fontWeight: '400',
  },
  // Modern save button styles (from MainScreen)
  modernSaveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 120,
  },
  modernSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
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