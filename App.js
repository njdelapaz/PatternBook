import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';

// Import Screen Components
import LoginScreen from './screens/LoginScreen';
import EmailLoginScreen from './screens/EmailLoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MainScreen from './screens/MainScreen';
import SettingsScreen from './screens/SettingsScreen';
import RecentlyDeletedScreen from './screens/RecentlyDeletedScreen';
import TextEditorScreen from './screens/TextEditorScreen';
import VoiceRecordingScreen from './screens/VoiceRecordingScreen';

// Import Components
import ChatModal from './components/ChatModal';

// Import Hooks
import { useRecording } from './hooks/useRecording';
import { useDebouncedSave } from './hooks/useDebouncedSave';
import { useNoteChat } from './hooks/useNoteChat';

// Import Utilities
import { loadNotes, saveNotes } from './utils/storage';
import { darkTheme, lightTheme } from './utils/constants';
import { generateTitleFromContent } from './utils/noteUtils';
import { createOrUpdateNoteWithSummary, updateNoteSummary } from './utils/summaryOrchestration';
import { editorHeaderStyles, modernSaveButtonStyles } from './utils/sharedStyles';

// Import Carbon icons (for remaining components)
import KeyboardIcon from './assets/carbon-icons/carbon--keyboard.svg';
import UndoIcon from './assets/carbon-icons/carbon--undo.svg';
import RedoIcon from './assets/carbon-icons/carbon--redo.svg';
import MicrophoneIcon from './assets/carbon-icons/carbon--microphone-filled.svg';
import ChatIcon from './assets/carbon-icons/carbon--chat.svg';

// Note Editor Screen Component
function NoteEditor({ note, onBack, onSave, isDarkMode }) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(note?.title || 'New Note');
  const [content, setContent] = useState(note?.content || '');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const contentInputRef = useRef(null);

  // Use custom hooks
  const { chatMessages, chatInput, setChatInput, isLoadingChat, handleSendChatMessage } = useNoteChat(title, content);
  const { isRecording, isTranscribing, startRecording, stopAndTranscribe } = useRecording({
    onTranscriptionComplete: (transcription) => {
      setContent(prev => (prev ? prev + (prev.endsWith('\n') ? '' : '\n') + transcription : transcription));
    },
  });
  
  // Use debounced save hook
  useDebouncedSave(() => {
    onSave(title, content);
  }, [title, content], 500);

  // Track keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Add to history when content changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newState = { title, content };
      const currentState = history[historyIndex];
      
      // Only add to history if content actually changed
      if (!currentState || JSON.stringify(currentState) !== JSON.stringify(newState)) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [title, content]);

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setTitle(prevState.title);
      setContent(prevState.content);
      setHistoryIndex(historyIndex - 1);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTitle(nextState.title);
      setContent(nextState.content);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Handle keyboard toggle
  const handleKeyboardToggle = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      // Focus on content input to show keyboard
      contentInputRef.current?.focus();
    }
  };

  // Handle tap outside to dismiss keyboard
  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Handle chat button - open chat about the note
  const handleOpenChat = () => {
    if (!content.trim() && !title.trim()) {
      alert('Note is empty. Please add some content first.');
      return;
    }

    setShowChat(true);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={{ paddingTop: insets.top, flex: 1 }}>
          {/* Header with Today button, centered title, and undo/redo */}
          <View style={[editorHeaderStyles.editorHeader, { borderBottomColor: theme.borderColor }]}>
            <TouchableOpacity onPress={onBack} style={editorHeaderStyles.todayButton}>
              <Text style={[editorHeaderStyles.todayButtonText, { color: theme.accentColor }]}>← Today</Text>
            </TouchableOpacity>

            <View style={editorHeaderStyles.titleContainer}>
              {isEditingTitle ? (
                <TextInput
                  style={[editorHeaderStyles.titleInputInline, { color: theme.textColor }]}
                  value={title}
                  onChangeText={setTitle}
                  onBlur={() => setIsEditingTitle(false)}
                  autoFocus
                />
              ) : (
                <TouchableOpacity
                  style={styles.titleDisplay}
                  onPress={() => setIsEditingTitle(true)}
                >
                  <Text style={[editorHeaderStyles.titleText, { color: theme.textColor }]}>{title}</Text>
                  <Text style={[styles.renameArrow, { color: theme.secondaryTextColor }]}>⌄</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={editorHeaderStyles.editorActions}>
              <TouchableOpacity
                onPress={handleUndo}
                style={[styles.actionButton, { backgroundColor: theme.cardBackground, opacity: historyIndex > 0 ? 1 : 0.3 }]}
                disabled={historyIndex <= 0}
              >
                <UndoIcon width={20} height={20} color={theme.textColor} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRedo}
                style={[styles.actionButton, { backgroundColor: theme.cardBackground, opacity: historyIndex < history.length - 1 ? 1 : 0.3 }]}
                disabled={historyIndex >= history.length - 1}
              >
                <RedoIcon width={20} height={20} color={theme.textColor} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Editor Content */}
          <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
            <View style={styles.editorContent}>
              <TextInput
                ref={contentInputRef}
                style={[styles.contentInput, { color: theme.textColor, fontFamily: 'Times New Roman' }]}
                value={content}
                onChangeText={setContent}
                placeholder="Start typing your note..."
                placeholderTextColor={theme.placeholderColor}
                multiline
                textAlignVertical="top"
              />
            </View>
          </TouchableWithoutFeedback>
        </View>

        {/* Footer with action buttons */}
        <View style={[styles.editorFooter, { paddingBottom: insets.bottom, backgroundColor: theme.navBackground, borderTopColor: theme.borderColor }]}>
          <TouchableOpacity style={[styles.editorFooterButton, { backgroundColor: theme.cardBackground }]} onPress={handleOpenChat}>
            <ChatIcon width={20} height={20} color={theme.iconColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editorFooterButton, { backgroundColor: isRecording ? '#ff3b30' : theme.cardBackground }]}
            onPress={() => {
              if (isRecording) {
                stopAndTranscribe();
              } else {
                startRecording();
              }
            }}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={theme.iconColor} />
            ) : (
              <MicrophoneIcon width={20} height={20} color={theme.iconColor} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.editorFooterButton, { backgroundColor: theme.cardBackground }]} onPress={handleKeyboardToggle}>
            <KeyboardIcon width={20} height={20} color={theme.iconColor} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Chat Modal */}
      <ChatModal
        visible={showChat}
        onClose={() => setShowChat(false)}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isLoadingChat={isLoadingChat}
        onSendMessage={handleSendChatMessage}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}

// Main App Component
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [notes, setNotes] = useState([]);
  const [deletedNotes, setDeletedNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('main'); // 'main', 'editor', 'voice-record', 'text-editor', 'settings', 'recently-deleted'
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState('updated'); // 'updated', 'old-to-new'
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);
  const [settings, setSettings] = useState({
    profile: { name: 'User' },
    notifications: {
      weeklyLetter: false,
      dailyReminder: false,
      reminderTime: '09:00'
    }
  });

  // Load notes on app start
  useEffect(() => {
    loadNotes().then((loadedNotes) => {
      setNotes(loadedNotes);
    });
  }, []);

  // Save notes whenever they change
  useEffect(() => {
    if (notes.length > 0 || currentScreen === 'main') {
      saveNotes(notes);
    }
  }, [notes]);

  // Handle creating a new note
  const handleCreateNote = () => {
    const newNote = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    setCurrentScreen('editor');
  };

  // Handle creating note from voice transcription
  const handleCreateNoteFromTranscription = async (transcription) => {
    const noteData = {
      id: Date.now().toString(),
      title: generateTitleFromContent(transcription),
      content: transcription,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };

    // Use centralized summary orchestration
    await createOrUpdateNoteWithSummary(noteData, notes, setNotes, { immediateSummary: true });

    // For demo: Navigate to the note editor instead of going back to dashboard
    setSelectedNoteId(noteData.id);
    setCurrentScreen('editor');
  };

  // Handle creating note from text editor
  const handleCreateNoteFromText = async (title, content) => {
    const noteData = {
      id: Date.now().toString(),
      title: title || generateTitleFromContent(content),
      content: content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    
    // Use centralized summary orchestration
    await createOrUpdateNoteWithSummary(noteData, notes, setNotes, { immediateSummary: true });
  };

  // Navigate to voice recording screen
  const handleNavigateToVoiceRecord = () => {
    setCurrentScreen('voice-record');
  };

  // Navigate to text editor screen
  const handleNavigateToTextEditor = () => {
    setCurrentScreen('text-editor');
  };

  // Handle opening an existing note
  const handleNotePress = (note) => {
    setSelectedNoteId(note.id);
    setCurrentScreen('editor');
  };

  // Handle saving note changes
  const handleSaveNote = async (title, content) => {
    const currentNote = notes.find(note => note.id === selectedNoteId);
    if (!currentNote) return;

    const contentChanged = currentNote.content !== content;
    const titleChanged = currentNote.title !== title;

    if (contentChanged) {
      // Use centralized summary update function
      await updateNoteSummary(selectedNoteId, content, notes, setNotes);
      
      // Also update title if it changed
      if (titleChanged) {
        const updatedNotes = notes.map((note) =>
          note.id === selectedNoteId
            ? { ...note, title, updatedAt: Date.now() }
            : note
        );
        setNotes(updatedNotes);
        await saveNotes(updatedNotes);
      }
    } else if (titleChanged) {
      // Just save the title change without regenerating summary
      const updatedNotes = notes.map((note) =>
        note.id === selectedNoteId
          ? { ...note, title, updatedAt: Date.now() }
          : note
      );
      setNotes(updatedNotes);
      await saveNotes(updatedNotes);
    }
  };

  // Handle going back to main screen
  const handleBack = () => {
    // Check if current note is unedited and should be discarded
    const currentNote = notes.find((note) => note.id === selectedNoteId);
    if (currentNote && currentNote.title === 'New Note' && currentNote.content === '') {
      // Remove the unedited note
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== selectedNoteId));
    }

    setCurrentScreen('main');
    setSelectedNoteId(null);
  };

  // Handle deleting a note
  const handleDeleteNote = (noteId) => {
    const noteToDelete = notes.find(note => note.id === noteId);
    if (noteToDelete) {
      setDeletedNotes(prev => [...prev, { ...noteToDelete, deletedAt: Date.now() }]);
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
    }
  };

  // Handle pinning/unpinning a note
  const handleTogglePin = (noteId) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === noteId
          ? { ...note, pinned: !note.pinned }
          : note
      )
    );
  };

  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  // Handler functions
  const handleToggleTheme = () => setIsDarkMode(!isDarkMode);
  const handleSearchChange = (text) => setSearchQuery(text);
  const handleToggleSearch = () => setShowSearch(!showSearch);
  const handleSortChange = (sort) => setSortBy(sort);
  const handleToggleThreeDotsMenu = () => setShowThreeDotsMenu(!showThreeDotsMenu);
  const handleNavigateToSettings = () => setCurrentScreen('settings');
  const handleNavigateToRecentlyDeleted = () => setCurrentScreen('recently-deleted');
  const handleNavigateBack = () => setCurrentScreen('main');
  
  const handleClearAllData = async () => {
    // Reset all state to initial values
    setNotes([]);
    setDeletedNotes([]);
    setSettings({
      profile: { name: '' },
      notifications: { weeklyLetter: true, dailyReminder: false, reminderTime: '09:00' }
    });
    setSelectedNoteId(null);
    setCurrentScreen('main');
    setSearchQuery('');
    setShowSearch(false);
    setSortBy('newest');
    setShowThreeDotsMenu(false);
  };
  const handleSettingsChange = (newSettings) => setSettings(newSettings);
  const handleRestoreNote = (noteId) => {
    const noteToRestore = deletedNotes.find(note => note.id === noteId);
    if (noteToRestore) {
      setNotes(prev => [noteToRestore, ...prev]);
      setDeletedNotes(prev => prev.filter(note => note.id !== noteId));
    }
  };
  const handlePermanentlyDeleteNote = (noteId) => {
    setDeletedNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setHasCompletedOnboarding(true); // Skip onboarding for demo
    setCurrentScreen('main');
  };

  const handleNavigateToEmail = () => {
    setShowEmailLogin(true);
  };

  const handleBackFromEmail = () => {
    setShowEmailLogin(false);
  };

  const handleCompleteOnboarding = () => {
    setHasCompletedOnboarding(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowEmailLogin(false);
    setHasCompletedOnboarding(false);
    setCurrentScreen('main');
    setSelectedNoteId(null);
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        {showEmailLogin ? (
          <EmailLoginScreen
            onBack={handleBackFromEmail}
            onLogin={handleLogin}
          />
        ) : (
          <LoginScreen
            onLogin={handleLogin}
            onNavigateToEmail={handleNavigateToEmail}
          />
        )}
      </SafeAreaProvider>
    );
  }

  // Show onboarding screen if not completed
  if (!hasCompletedOnboarding) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={handleCompleteOnboarding} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {currentScreen === 'main' ? (
        <MainScreen
          notes={notes}
          onNotePress={handleNotePress}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onTogglePin={handleTogglePin}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          showSearch={showSearch}
          onToggleSearch={handleToggleSearch}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          showThreeDotsMenu={showThreeDotsMenu}
          onToggleThreeDotsMenu={handleToggleThreeDotsMenu}
          onNavigateToSettings={handleNavigateToSettings}
          onNavigateToRecentlyDeleted={handleNavigateToRecentlyDeleted}
          onNavigateToVoiceRecord={handleNavigateToVoiceRecord}
          onNavigateToTextEditor={handleNavigateToTextEditor}
        />
      ) : currentScreen === 'editor' ? (
        <NoteEditor
          note={selectedNote}
          onBack={handleBack}
          onSave={handleSaveNote}
          isDarkMode={isDarkMode}
        />
      ) : currentScreen === 'voice-record' ? (
        <VoiceRecordingScreen
          isDarkMode={isDarkMode}
          onBack={handleBack}
          onSave={handleCreateNoteFromTranscription}
        />
      ) : currentScreen === 'text-editor' ? (
        <TextEditorScreen
          isDarkMode={isDarkMode}
          onBack={handleBack}
          onSave={handleCreateNoteFromText}
        />
      ) : currentScreen === 'settings' ? (
        <SettingsScreen
          settings={settings}
          onSettingsChange={handleSettingsChange}
          isDarkMode={isDarkMode}
          onBack={handleNavigateBack}
          onClearAllData={handleClearAllData}
          onLogout={handleLogout}
        />
      ) : currentScreen === 'recently-deleted' ? (
        <RecentlyDeletedScreen
          deletedNotes={deletedNotes}
          onRestoreNote={handleRestoreNote}
          onPermanentlyDeleteNote={handlePermanentlyDeleteNote}
          isDarkMode={isDarkMode}
          onBack={handleNavigateBack}
        />
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggle: {
    padding: 8,
  },
  themeToggleText: {
    fontSize: 20,
  },
  searchContainer: {
    marginBottom: 20,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInput: {
    fontSize: 16,
    padding: 0,
    fontWeight: '400',
  },
  sortContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortButtonActive: {
    backgroundColor: 'rgba(200, 213, 185, 0.2)',
    borderColor: '#C8D5B9',
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesList: {
    marginTop: 10,
  },
  dateSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  noteCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noteTime: {
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '500',
  },
  noteText: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 8,
    fontWeight: '600',
  },
  notePreview: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.7,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 0.5,
  },
  navButton: {
    padding: 12,
    borderRadius: 12,
  },
  navIcon: {
    fontSize: 24,
  },
  // Editor styles
  titleDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  renameArrow: {
    fontSize: 14,
    opacity: 0.6,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
  editorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 32,
    borderTopWidth: 0.5,
  },
  editorFooterButton: {
    padding: 12,
    borderRadius: 12,
  },
  // Delete Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  deleteIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  deleteText: {
    fontSize: 18,
    color: '#ff3b30',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  // Three dots menu styles
  threeDotsButton: {
    padding: 8,
    marginRight: 8,
  },
  threeDotsText: {
    fontSize: 20,
    fontWeight: '600',
  },
  threeDotsMenu: {
    position: 'absolute',
    top: 100,
    right: 20,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Settings styles
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 16,
  },
  settingsContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  settingsCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  settingsInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 120,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 80,
    textAlign: 'center',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Recently deleted styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  restoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  restoreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Test button styles (settings)
  testButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Action button styles for modals
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Voice Recording Screen styles
  voiceRecordingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  recordingStatus: {
    alignItems: 'center',
    marginBottom: 60,
  },
  recordingDuration: {
    fontSize: 48,
    fontWeight: '300',
    marginBottom: 8,
  },
  recordingLabel: {
    fontSize: 18,
    fontWeight: '500',
  },
  recordingButtonContainer: {
    marginBottom: 60,
  },
  recordingButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  transcriptionContainer: {
    flex: 1,
    width: '100%',
    maxHeight: 300,
  },
  transcriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  transcriptionScroll: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Text Editor Screen styles
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
