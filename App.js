import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for notes
const NOTES_STORAGE_KEY = '@patternbook_notes';

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
  const saveTimeoutRef = useRef(null);

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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

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
    </View>
  );
}

// Main Screen Component
function MainScreen({ notes, onNotePress, onCreateNote }) {
  const insets = useSafeAreaInsets();

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
          <Text style={styles.navIcon}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navIcon}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navIcon}>🎤</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onCreateNote}>
          <Text style={styles.navIcon}>✏️</Text>
        </TouchableOpacity>
      </View>
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
    setCurrentScreen('main');
    setSelectedNoteId(null);
  };

  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  return (
    <SafeAreaProvider>
      {currentScreen === 'main' ? (
        <MainScreen
          notes={notes}
          onNotePress={handleNotePress}
          onCreateNote={handleCreateNote}
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
});
