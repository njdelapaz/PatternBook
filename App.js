import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENAI_API_KEY } from '@env';

// Import Carbon icons
import SearchIcon from './assets/carbon-icons/carbon--search.svg';
import ChatIcon from './assets/carbon-icons/carbon--chat.svg';
import MicrophoneIcon from './assets/carbon-icons/carbon--microphone-filled.svg';
import PenIcon from './assets/carbon-icons/carbon--pen.svg';
import KeyboardIcon from './assets/carbon-icons/carbon--keyboard.svg';

// Storage key for notes
const NOTES_STORAGE_KEY = '@patternbook_notes';

// OpenAI API Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Simple Markdown Text Component
function MarkdownText({ children, style }) {
  const parseMarkdown = (text) => {
    if (!text) return [];

    const lines = text.split('\n');
    const elements = [];

    lines.forEach((line, index) => {
      // Parse line for inline formatting
      const parts = [];
      let currentText = '';
      let i = 0;

      while (i < line.length) {
        // Bold (**text**)
        if (line[i] === '*' && line[i + 1] === '*') {
          if (currentText) {
            parts.push({ text: currentText, bold: false });
            currentText = '';
          }
          i += 2;
          let boldText = '';
          while (i < line.length && !(line[i] === '*' && line[i + 1] === '*')) {
            boldText += line[i];
            i++;
          }
          parts.push({ text: boldText, bold: true });
          i += 2;
        }
        // Italic (*text*)
        else if (line[i] === '*' && line[i + 1] !== '*') {
          if (currentText) {
            parts.push({ text: currentText, bold: false });
            currentText = '';
          }
          i += 1;
          let italicText = '';
          while (i < line.length && line[i] !== '*') {
            italicText += line[i];
            i++;
          }
          parts.push({ text: italicText, italic: true });
          i += 1;
        } else {
          currentText += line[i];
          i++;
        }
      }

      if (currentText) {
        parts.push({ text: currentText, bold: false });
      }

      // Check if line is a heading
      const isHeading = line.match(/^(#{1,3})\s+(.+)$/);
      const isBullet = line.match(/^[-*]\s+(.+)$/);
      const isNumbered = line.match(/^\d+\.\s+(.+)$/);

      if (isHeading) {
        const level = isHeading[1].length;
        elements.push(
          <Text key={index} style={[style, styles.markdownHeading, level === 1 && styles.markdownH1, level === 2 && styles.markdownH2, level === 3 && styles.markdownH3]}>
            {isHeading[2]}
          </Text>
        );
      } else if (isBullet) {
        elements.push(
          <View key={index} style={styles.markdownListItem}>
            <Text style={[style, styles.markdownBullet]}>• </Text>
            <Text style={style}>{isBullet[1]}</Text>
          </View>
        );
      } else if (isNumbered) {
        elements.push(
          <View key={index} style={styles.markdownListItem}>
            <Text style={[style, styles.markdownBullet]}>{isNumbered[0].match(/^\d+\./)[0]} </Text>
            <Text style={style}>{isNumbered[1]}</Text>
          </View>
        );
      } else if (parts.length > 0) {
        elements.push(
          <Text key={index} style={style}>
            {parts.map((part, partIndex) => (
              <Text
                key={partIndex}
                style={[
                  part.bold && styles.markdownBold,
                  part.italic && styles.markdownItalic,
                ]}
              >
                {part.text}
              </Text>
            ))}
            {'\n'}
          </Text>
        );
      } else {
        elements.push(<Text key={index} style={style}>{'\n'}</Text>);
      }
    });

    return elements;
  };

  return <View>{parseMarkdown(children)}</View>;
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
  const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;

  // Today
  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return `Today ${timeStr}`;
  }

  // Yesterday
  if (diffDays === 1 || (diffDays === 0 && date.getDate() === now.getDate() - 1)) {
    return `Yesterday ${timeStr}`;
  }

  // Last 7 days - show day of week
  if (diffDays < 7) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]} ${timeStr}`;
  }

  // This year - show month and day
  if (date.getFullYear() === now.getFullYear()) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()} ${timeStr}`;
  }

  // Over a year - show full date with year
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()} ${timeStr}`;
}

// AsyncStorage functions
async function loadNotes() {
  try {
    const notesJson = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    return notesJson ? JSON.parse(notesJson) : [];
  } catch (error) {
    console.error('Error loading notes:', error);
    return [];
  }
}

async function saveNotes(notes) {
  try {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Error saving notes:', error);
  }
}

// Note Editor Screen Component
function NoteEditor({ note, onBack, onSave }) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(note?.title || 'New Note');
  const [content, setContent] = useState(note?.content || '');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const saveTimeoutRef = useRef(null);

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

  // Auto-save with debouncing
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onSave(title, content);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content]);

  // Handle keyboard toggle
  const handleKeyboardToggle = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      // Focus on content input to show keyboard
      contentInputRef.current?.focus();
    }
  };

  // Handle chat button - summarize note with ChatGPT
  const handleSummarizeNote = async () => {
    if (!content.trim() && !title.trim()) {
      alert('Note is empty. Please add some content first.');
      return;
    }

    setIsLoadingSummary(true);
    setShowSummary(true);
    setSummary('');

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that summarizes notes concisely and clearly.',
            },
            {
              role: 'user',
              content: `Please summarize the following note:\n\nTitle: ${title}\n\nContent: ${content}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get summary');
      }

      const data = await response.json();
      const summaryText = data.choices[0]?.message?.content || 'No summary available';
      setSummary(summaryText);
    } catch (error) {
      console.error('Error summarizing note:', error);
      setSummary(`Error: ${error.message}`);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const contentInputRef = useRef(null);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={{ paddingTop: insets.top, flex: 1 }}>
          {/* Header with back button */}
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Editor Content */}
          <View style={styles.editorContent}>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Note Title"
              placeholderTextColor="#666666"
            />

            <TextInput
              ref={contentInputRef}
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Start typing your note..."
              placeholderTextColor="#666666"
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Footer with action buttons */}
        <View style={[styles.editorFooter, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity style={styles.editorFooterButton} onPress={handleSummarizeNote}>
            <ChatIcon width={20} height={20} color="#999999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editorFooterButton}>
            <MicrophoneIcon width={20} height={20} color="#999999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editorFooterButton} onPress={handleKeyboardToggle}>
            <KeyboardIcon width={20} height={20} color="#999999" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Summary Modal */}
      <Modal
        visible={showSummary}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSummary(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSummary(false)}
        >
          <Pressable style={styles.summaryModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>AI Summary</Text>
              <TouchableOpacity onPress={() => setShowSummary(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.summaryContent}>
              {isLoadingSummary ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Generating summary...</Text>
                </View>
              ) : (
                <MarkdownText style={styles.summaryText}>{summary}</MarkdownText>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Main Screen Component
function MainScreen({ notes, onNotePress, onCreateNote, onDeleteNote }) {
  const insets = useSafeAreaInsets();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  const handleLongPress = (note) => {
    setNoteToDelete(note);
    setDeleteModalVisible(true);
  };

  const handleDelete = () => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete.id);
      setDeleteModalVisible(false);
      setNoteToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setNoteToDelete(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Main Content with proper top spacing */}
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: 20 }}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Today</Text>
            <View style={styles.sortButton}>
              <Text style={styles.sortText}>⇅ Updated</Text>
            </View>
          </View>

          {/* Notes List */}
          <View style={styles.notesList}>
            {notes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.noteCard}
                onPress={() => onNotePress(note)}
                onLongPress={() => handleLongPress(note)}
                delayLongPress={500}
              >
                <Text style={styles.noteTime}>{formatTimestamp(note.updatedAt)}</Text>
                <Text style={styles.noteText}>{note.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.navButton}>
          <SearchIcon width={24} height={24} color="#999999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <ChatIcon width={24} height={24} color="#999999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <MicrophoneIcon width={24} height={24} color="#999999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onCreateNote}>
          <PenIcon width={24} height={24} color="#999999" />
        </TouchableOpacity>
      </View>

      {/* Delete Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCancelDelete}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
              <Text style={styles.deleteText}>Delete note</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// Main App Component
export default function App() {
  const [notes, setNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('main');
  const [selectedNoteId, setSelectedNoteId] = useState(null);

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
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    setCurrentScreen('editor');
  };

  // Handle opening an existing note
  const handleNotePress = (note) => {
    setSelectedNoteId(note.id);
    setCurrentScreen('editor');
  };

  // Handle saving note changes
  const handleSaveNote = (title, content) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === selectedNoteId
          ? { ...note, title, content, updatedAt: Date.now() }
          : note
      )
    );
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
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
  };

  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  return (
    <SafeAreaProvider>
      {currentScreen === 'main' ? (
        <MainScreen
          notes={notes}
          onNotePress={handleNotePress}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
        />
      ) : (
        <NoteEditor
          note={selectedNote}
          onBack={handleBack}
          onSave={handleSaveNote}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sortText: {
    fontSize: 16,
    color: '#999999',
  },
  notesList: {
    marginTop: 10,
  },
  noteCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  noteTime: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 24,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  navButton: {
    padding: 8,
  },
  navIcon: {
    fontSize: 24,
  },
  // Editor styles
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  editorContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    padding: 0,
  },
  contentInput: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    flex: 1,
    padding: 0,
  },
  editorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  editorFooterButton: {
    padding: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  // Delete Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
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
  // Summary Modal styles
  summaryModal: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 100,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999999',
    fontWeight: '300',
  },
  summaryContent: {
    padding: 20,
    maxHeight: '100%',
  },
  summaryText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999999',
  },
  // Markdown styles
  markdownBold: {
    fontWeight: 'bold',
  },
  markdownItalic: {
    fontStyle: 'italic',
  },
  markdownHeading: {
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  markdownH1: {
    fontSize: 24,
  },
  markdownH2: {
    fontSize: 20,
  },
  markdownH3: {
    fontSize: 18,
  },
  markdownListItem: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  markdownBullet: {
    marginRight: 8,
  },
});
