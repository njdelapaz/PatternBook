import { StyleSheet } from 'react-native';

/**
 * Shared Styles
 * Common styles used across multiple screens to avoid duplication
 */

// Editor Header Styles (used in NoteEditor, TextEditorScreen, VoiceRecordingScreen)
export const editorHeaderStyles = StyleSheet.create({
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
  titleText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  titleDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  titleInputInline: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#C8D5B9',
    borderRadius: 12,
    minWidth: 200,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
});

// Modern Save Button Styles (used in TextEditorScreen, VoiceRecordingScreen, App.js)
export const modernSaveButtonStyles = StyleSheet.create({
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
});


