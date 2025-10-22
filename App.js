import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENAI_API_KEY, DEEPGRAM_API_KEY, TRANSCRIBE_PROVIDER } from '@env';
import * as FileSystem from 'expo-file-system';
import { Audio as AVAudio } from 'expo-av';

// Import Carbon icons
import SearchIcon from './assets/carbon-icons/carbon--search.svg';
import ChatIcon from './assets/carbon-icons/carbon--chat.svg';
import MicrophoneIcon from './assets/carbon-icons/carbon--microphone-filled.svg';
import PenIcon from './assets/carbon-icons/carbon--pen.svg';
import KeyboardIcon from './assets/carbon-icons/carbon--keyboard.svg';
import UndoIcon from './assets/carbon-icons/carbon--undo.svg';
import RedoIcon from './assets/carbon-icons/carbon--redo.svg';

// Storage key for notes
const NOTES_STORAGE_KEY = '@patternbook_notes';

// OpenAI API Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Theme definitions
const darkTheme = {
  backgroundColor: '#1a1a1a',
  cardBackground: '#2a2a2a',
  textColor: '#ffffff',
  secondaryTextColor: '#999999',
  placeholderColor: '#666666',
  accentColor: '#007AFF',
  iconColor: '#999999',
  navBackground: '#0a0a0a',
  borderColor: '#333333',
};

const lightTheme = {
  backgroundColor: '#ffffff',
  cardBackground: '#f8f9fa',
  textColor: '#000000',
  secondaryTextColor: '#666666',
  placeholderColor: '#999999',
  accentColor: '#007AFF',
  iconColor: '#666666',
  navBackground: '#f8f9fa',
  borderColor: '#e1e5e9',
};

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
function NoteEditor({ note, onBack, onSave, isDarkMode }) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(note?.title || 'New Note');
  const [content, setContent] = useState(note?.content || '');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [summary, setSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const saveTimeoutRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef(null);
  const isStartingRef = useRef(false);

  // Initialize audio mode on mount for iOS (expo-av)
  useEffect(() => {
    const setupAudioMode = async () => {
      if (Platform.OS === 'ios') {
        try {
          await AVAudio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });
        } catch (e) {
          console.error('Failed to set AV audio mode', e);
        }
      }
    };
    setupAudioMode();

    return () => {
      // Cleanup any ongoing recording on unmount
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

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

  // Voice Recording: Start
  const startRecording = async () => {
    try {
      console.log('=== START RECORDING CALLED ===', new Date().toISOString());
      if (isStartingRef.current) return; // prevent re-entrancy
      isStartingRef.current = true;
      if (Platform.OS === 'web') {
        alert('Voice recording is not supported on web in this MVP. Use the keyboard mic on mobile.');
        return;
      }

      const perm = await AVAudio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        alert('Microphone permission is required to record.');
        return;
      }

      // Ensure audio mode is set for recording
      await AVAudio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Stop and discard any previous recording
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {}
        recordingRef.current = null;
      }

      let recording = new AVAudio.Recording();
      try {
        await recording.prepareToRecordAsync(AVAudio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        console.log('Recording started successfully');
      } catch (err) {
        // Retry once if iOS reports recording disabled
        const msg = String(err?.message || err);
        if (msg.includes('RecordingDisabled') || msg.includes('Recording not allowed')) {
          try {
            await AVAudio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false });
            recording = new AVAudio.Recording();
            await recording.prepareToRecordAsync(AVAudio.RecordingOptionsPresets.HIGH_QUALITY);
            await recording.startAsync();
          } catch (retryErr) {
            throw retryErr;
          }
        } else {
          throw err;
        }
      }
      recordingRef.current = recording;
      setIsRecording(true);
      console.log('Recording state set to true');
    } catch (e) {
      console.error('Failed to start recording', e);
      alert('Failed to start recording: ' + e.message);
    }
    finally {
      isStartingRef.current = false;
    }
  };

  // Voice Recording: Stop and transcribe
  const stopAndTranscribe = async () => {
    try {
      console.log('=== STOP RECORDING CALLED ===', new Date().toISOString());
      
      // Wait for recording to actually start if it's still initializing
      let attempts = 0;
      while (isStartingRef.current && attempts < 50) {
        console.log('Waiting for recording to start...', attempts);
        await new Promise(resolve => setTimeout(resolve, 20));
        attempts++;
      }
      
      if (!recordingRef.current) {
        console.log('No recording to stop');
        return;
      }

      setIsRecording(false);
      const status = await recordingRef.current.getStatusAsync();
      console.log('Recording status before stop:', status);
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      console.log('Recording stopped, URI:', uri);
      if (!uri) return;

      setIsTranscribing(true);
  const transcription = await transcribeAudio(uri);
      if (transcription) {
        setContent(prev => (prev ? prev + (prev.endsWith('\n') ? '' : '\n') + transcription : transcription));
      }
    } catch (e) {
      console.error('Failed to stop or transcribe', e);
      alert('Failed to transcribe recording: ' + e.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Provider-agnostic transcription
  const transcribeAudio = async (fileUri) => {
    const provider = (TRANSCRIBE_PROVIDER || 'openai').toLowerCase();
    
    // Debug logging
    console.log('=== TRANSCRIPTION DEBUG ===');
    console.log('TRANSCRIBE_PROVIDER env var:', TRANSCRIBE_PROVIDER);
    console.log('Provider (computed):', provider);
    console.log('OPENAI_API_KEY exists:', !!OPENAI_API_KEY);
    console.log('DEEPGRAM_API_KEY exists:', !!DEEPGRAM_API_KEY);
    console.log('DEEPGRAM_API_KEY value:', DEEPGRAM_API_KEY ? DEEPGRAM_API_KEY.substring(0, 10) + '...' : 'NOT SET');
    
    if (provider === 'deepgram') {
      console.log('Using Deepgram as primary provider');
      const dg = await transcribeWithDeepgram(fileUri);
      // Only fallback to OpenAI if Deepgram had an actual error (returns null), not empty transcript
      if (dg !== null) return dg;
      // Fallback to OpenAI if Deepgram failed and OpenAI key exists
      console.log('Deepgram failed, trying OpenAI fallback');
      if (OPENAI_API_KEY) return await transcribeWithOpenAI(fileUri);
      return '';
    } else {
      console.log('Using OpenAI as primary provider');
      const oi = await transcribeWithOpenAI(fileUri);
      // Only fallback to Deepgram if OpenAI had an actual error (returns null), not empty transcript
      if (oi !== null) return oi;
      // If OpenAI failed due to quota but Deepgram key exists, try Deepgram
      console.log('OpenAI failed, trying Deepgram fallback');
      if (DEEPGRAM_API_KEY) return await transcribeWithDeepgram(fileUri);
      return '';
    }
  };

  // OpenAI Whisper transcription
  const transcribeWithOpenAI = async (fileUri) => {
    try {
      if (!OPENAI_API_KEY) {
        // No key; skip
        return '';
      }
      // Use FormData with file URI for React Native
      const formData = new FormData();
      formData.append('model', 'whisper-1');
      formData.append('file', {
        uri: fileUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      });

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errTxt = await response.text();
        // Surface quota errors in UI and return null to allow fallback
        try {
          const errJson = JSON.parse(errTxt);
          if (errJson?.error?.code === 'insufficient_quota') {
            alert('OpenAI quota exceeded for transcription. Trying alternate provider...');
            return null; // Trigger fallback to Deepgram
          }
        } catch {}
        throw new Error(errTxt);
      }
      const data = await response.json();
      return data.text || '';
    } catch (err) {
      console.error('Transcription error', err);
      return null; // Return null on actual errors to trigger fallback
    }
  };

  // Deepgram transcription (fallback or primary)
  const transcribeWithDeepgram = async (fileUri) => {
    try {
      if (!DEEPGRAM_API_KEY) {
        console.log('Deepgram: No API key found');
        return '';
      }
      console.log('Deepgram: Preparing request for', fileUri);
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      });
      console.log('Deepgram: Sending request to API...');
      // model can be tuned; nova-2 is a good general English model
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        },
        body: formData,
      });
      console.log('Deepgram: Response status:', response.status, response.ok);
      if (!response.ok) {
        const errTxt = await response.text();
        console.error('Deepgram: API error response:', errTxt);
        throw new Error(errTxt);
      }
      const data = await response.json();
      console.log('Deepgram: Response data:', JSON.stringify(data, null, 2));
      // Parse transcript
      const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      const duration = data?.metadata?.duration || 0;
      console.log('Deepgram: Extracted transcript:', transcript);
      console.log('Deepgram: Audio duration:', duration, 'seconds');
      
      if (!transcript && duration < 0.5) {
        console.log('Deepgram: Recording too short, returning empty');
        alert('Recording too short. Please hold the mic button longer while speaking.');
      }
      
      return transcript;
    } catch (err) {
      console.error('Deepgram transcription error', err);
      console.error('Deepgram error message:', err.message);
      console.error('Deepgram error stack:', err.stack);
      return null; // Return null on actual errors to trigger fallback
    }
  };

  const contentInputRef = useRef(null);
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
          <View style={[styles.editorHeader, { borderBottomColor: theme.borderColor }]}>
            <TouchableOpacity onPress={onBack} style={styles.todayButton}>
              <Text style={[styles.todayButtonText, { color: theme.accentColor }]}>← Today</Text>
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              {isEditingTitle ? (
                <TextInput
                  style={[styles.titleInputInline, { color: theme.textColor }]}
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
                  <Text style={[styles.titleText, { color: theme.textColor }]}>{title}</Text>
                  <Text style={[styles.renameArrow, { color: theme.secondaryTextColor }]}>⌄</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.editorActions}>
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
        <View style={[styles.editorFooter, { paddingBottom: insets.bottom, backgroundColor: theme.navBackground }]}>
          <TouchableOpacity style={[styles.editorFooterButton, { backgroundColor: theme.cardBackground }]} onPress={handleSummarizeNote}>
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
          <Pressable style={[styles.summaryModal, { backgroundColor: theme.cardBackground }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.summaryHeader, { borderBottomColor: theme.borderColor }]}>
              <Text style={[styles.summaryTitle, { color: theme.textColor }]}>AI Summary</Text>
              <TouchableOpacity onPress={() => setShowSummary(false)} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.secondaryTextColor }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.summaryContent}>
              {isLoadingSummary ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: theme.secondaryTextColor }]}>Generating summary...</Text>
                </View>
              ) : (
                <MarkdownText style={[styles.summaryText, { color: theme.textColor }]}>{summary}</MarkdownText>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Main Screen Component
function MainScreen({ notes, onNotePress, onCreateNote, onDeleteNote, onTogglePin, isDarkMode, onToggleTheme, searchQuery, onSearchChange, showSearch, onToggleSearch, sortBy, onSortChange, showThreeDotsMenu, onToggleThreeDotsMenu, onNavigateToSettings, onNavigateToRecentlyDeleted }) {
  const insets = useSafeAreaInsets();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [noteToPin, setNoteToPin] = useState(null);

  const handleLongPress = (note) => {
    setNoteToDelete(note);
    setNoteToPin(note);
    setDeleteModalVisible(true);
  };

  const handleDelete = () => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete.id);
      setDeleteModalVisible(false);
      setNoteToDelete(null);
      setNoteToPin(null);
    }
  };

  const handleTogglePin = () => {
    if (noteToPin) {
      onTogglePin(noteToPin.id);
      setDeleteModalVisible(false);
      setNoteToDelete(null);
      setNoteToPin(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setNoteToDelete(null);
    setNoteToPin(null);
  };

  // Filter and sort notes
  const filteredAndSortedNotes = notes
    .filter(note => 
      searchQuery === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return b.updatedAt - a.updatedAt;
        case 'old-to-new':
          return a.updatedAt - b.updatedAt;
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

  // Group notes by date sections
  const groupNotesByDate = (notes) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const sections = {
      pinned: [],
      today: [],
      yesterday: [],
      past: []
    };
    
    notes.forEach(note => {
      if (note.pinned) {
        sections.pinned.push(note);
      } else {
        const noteDate = new Date(note.updatedAt);
        const noteDateOnly = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());
        
        if (noteDateOnly.getTime() === today.getTime()) {
          sections.today.push(note);
        } else if (noteDateOnly.getTime() === yesterday.getTime()) {
          sections.yesterday.push(note);
        } else {
          sections.past.push(note);
        }
      }
    });
    
    return sections;
  };

  const noteSections = groupNotesByDate(filteredAndSortedNotes);

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Main Content with proper top spacing */}
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: 20 }}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerLeft} />
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={onToggleThreeDotsMenu} style={styles.threeDotsButton}>
                <Text style={[styles.threeDotsText, { color: theme.textColor }]}>⋯</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onToggleTheme} style={styles.themeToggle}>
                <Text style={[styles.themeToggleText, { color: theme.textColor }]}>
                  {isDarkMode ? '☀️' : '🌙'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          {showSearch && (
            <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
              <TextInput
                style={[styles.searchInput, { color: theme.textColor }]}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search notes..."
                placeholderTextColor={theme.placeholderColor}
                autoFocus
              />
            </View>
          )}

          {/* Sort Options */}
          <View style={styles.sortContainer}>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'updated' && styles.sortButtonActive]}
              onPress={() => onSortChange('updated')}
            >
              <Text style={[styles.sortText, { color: sortBy === 'updated' ? theme.accentColor : theme.textColor }]}>
                ⇅ Updated
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'old-to-new' && styles.sortButtonActive]}
              onPress={() => onSortChange('old-to-new')}
            >
              <Text style={[styles.sortText, { color: sortBy === 'old-to-new' ? theme.accentColor : theme.textColor }]}>
                ⇅ Old-to-New
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'alphabetical' && styles.sortButtonActive]}
              onPress={() => onSortChange('alphabetical')}
            >
              <Text style={[styles.sortText, { color: sortBy === 'alphabetical' ? theme.accentColor : theme.textColor }]}>
                A-Z
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes List with Date Sections */}
          <View style={styles.notesList}>
            {/* Pinned Section */}
            {noteSections.pinned.length > 0 && (
              <View style={styles.dateSection}>
                <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Pinned</Text>
                {noteSections.pinned.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => onNotePress(note)}
                    onLongPress={() => handleLongPress(note)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>{formatTimestamp(note.updatedAt)}</Text>
                    <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={3}>
                      {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Today Section */}
            {noteSections.today.length > 0 && (
              <View style={styles.dateSection}>
                <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Today</Text>
                {noteSections.today.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => onNotePress(note)}
                    onLongPress={() => handleLongPress(note)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>{formatTimestamp(note.updatedAt)}</Text>
                    <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={3}>
                      {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Yesterday Section */}
            {noteSections.yesterday.length > 0 && (
              <View style={styles.dateSection}>
                <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Yesterday</Text>
                {noteSections.yesterday.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => onNotePress(note)}
                    onLongPress={() => handleLongPress(note)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>{formatTimestamp(note.updatedAt)}</Text>
                    <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={3}>
                      {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Past Section */}
            {noteSections.past.length > 0 && (
              <View style={styles.dateSection}>
                <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Past</Text>
                {noteSections.past.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => onNotePress(note)}
                    onLongPress={() => handleLongPress(note)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>{formatTimestamp(note.updatedAt)}</Text>
                    <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={3}>
                      {note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.navBackground, borderTopColor: theme.borderColor }]}>
        <TouchableOpacity style={styles.navButton} onPress={onToggleSearch}>
          <SearchIcon width={24} height={24} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <ChatIcon width={24} height={24} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <MicrophoneIcon width={24} height={24} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onCreateNote}>
          <PenIcon width={24} height={24} color={theme.iconColor} />
        </TouchableOpacity>
      </View>

      {/* Three Dots Menu */}
      {showThreeDotsMenu && (
        <Modal
          visible={showThreeDotsMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={onToggleThreeDotsMenu}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={onToggleThreeDotsMenu}
          >
            <View style={[styles.threeDotsMenu, { backgroundColor: theme.cardBackground }]}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onToggleThreeDotsMenu();
                  onNavigateToRecentlyDeleted();
                }}
              >
                <Text style={[styles.menuItemText, { color: theme.textColor }]}>Recently deleted</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onToggleThreeDotsMenu();
                  onNavigateToSettings();
                }}
              >
                <Text style={[styles.menuItemText, { color: theme.textColor }]}>Settings</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

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
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleTogglePin}
            >
              <Text style={[styles.actionIcon, { color: theme.textColor }]}>
                {noteToPin?.pinned ? '📌' : '📍'}
              </Text>
              <Text style={[styles.actionText, { color: theme.textColor }]}>
                {noteToPin?.pinned ? 'Unpin note' : 'Pin note'}
              </Text>
            </TouchableOpacity>
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

// Settings Screen Component
function SettingsScreen({ settings, onSettingsChange, isDarkMode, onBack }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [isMicChecking, setIsMicChecking] = useState(false);
  const [micCheckResult, setMicCheckResult] = useState('');

  const handleNameChange = (name) => {
    onSettingsChange({
      ...settings,
      profile: { ...settings.profile, name }
    });
  };

  const handleNotificationToggle = (key) => {
    onSettingsChange({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key]
      }
    });
  };

  const handleTimeChange = (time) => {
    onSettingsChange({
      ...settings,
      notifications: {
        ...settings.notifications,
        reminderTime: time
      }
    });
  };

  const handleMicPreflight = async () => {
    try {
      setIsMicChecking(true);
      setMicCheckResult('');
      const perm = await AVAudio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        alert('Microphone permission is required. Please enable it in Settings.');
        return;
      }
      // Ensure audio mode is set for iOS
      await AVAudio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Start a short recording
      const recording = new AVAudio.Recording();
      await recording.prepareToRecordAsync(AVAudio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      await new Promise((res) => setTimeout(res, 1000));
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Optionally delete the temp file
      if (uri) {
        try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
      }

      setMicCheckResult('Mic preflight succeeded. Recording and permissions look good.');
      alert('Mic preflight succeeded.');
    } catch (e) {
      console.error('Mic preflight failed', e);
      setMicCheckResult(`Mic preflight failed: ${e.message || e}`);
      alert(`Mic preflight failed: ${e.message || e}`);
    } finally {
      setIsMicChecking(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.accentColor }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.settingsTitle, { color: theme.textColor }]}>Settings</Text>
        </View>

        <ScrollView style={styles.settingsContent}>
          {/* Profile Section */}
          <View style={[styles.settingsCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.textColor }]}>Profile</Text>
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: theme.textColor }]}>Name</Text>
              <TextInput
                style={[styles.settingsInput, { color: theme.textColor, borderColor: theme.borderColor }]}
                value={settings.profile.name}
                onChangeText={handleNameChange}
                placeholder="Enter your name"
                placeholderTextColor={theme.placeholderColor}
              />
            </View>
          </View>

          {/* Notifications Section */}
          <View style={[styles.settingsCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.textColor }]}>Notifications</Text>
            
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: theme.textColor }]}>Weekly Letter</Text>
              <TouchableOpacity
                style={[styles.toggle, { backgroundColor: settings.notifications.weeklyLetter ? '#4CAF50' : '#ccc' }]}
                onPress={() => handleNotificationToggle('weeklyLetter')}
              >
                <View style={[styles.toggleThumb, { 
                  transform: [{ translateX: settings.notifications.weeklyLetter ? 20 : 2 }] 
                }]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: theme.textColor }]}>Daily reminder</Text>
              <TouchableOpacity
                style={[styles.toggle, { backgroundColor: settings.notifications.dailyReminder ? '#4CAF50' : '#ccc' }]}
                onPress={() => handleNotificationToggle('dailyReminder')}
              >
                <View style={[styles.toggleThumb, { 
                  transform: [{ translateX: settings.notifications.dailyReminder ? 20 : 2 }] 
                }]} />
              </TouchableOpacity>
            </View>

            {settings.notifications.dailyReminder && (
              <View style={styles.settingsRow}>
                <Text style={[styles.settingsLabel, { color: theme.textColor }]}>Reminder time</Text>
                <TextInput
                  style={[styles.timeInput, { color: theme.textColor, borderColor: theme.borderColor }]}
                  value={settings.notifications.reminderTime}
                  onChangeText={handleTimeChange}
                  placeholder="09:00"
                  placeholderTextColor={theme.placeholderColor}
                />
              </View>
            )}
          </View>

          {/* Audio / Diagnostics Section */}
          <View style={[styles.settingsCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.textColor }]}>Audio</Text>
            <Text style={[styles.settingsLabel, { color: theme.secondaryTextColor, marginBottom: 8 }]}>Run a 1-second test recording to verify mic permissions and audio session.</Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.accentColor }]}
              onPress={handleMicPreflight}
              disabled={isMicChecking}
            >
              {isMicChecking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.testButtonText}>Run mic preflight</Text>
              )}
            </TouchableOpacity>
            {micCheckResult ? (
              <Text style={[styles.noteTime, { color: theme.secondaryTextColor, marginTop: 8 }]}>{micCheckResult}</Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// Recently Deleted Screen Component
function RecentlyDeletedScreen({ deletedNotes, onRestoreNote, onPermanentlyDeleteNote, isDarkMode, onBack }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.accentColor }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.settingsTitle, { color: theme.textColor }]}>Recently Deleted</Text>
        </View>

        <ScrollView style={styles.settingsContent}>
          {deletedNotes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: theme.secondaryTextColor }]}>
                No deleted notes
              </Text>
            </View>
          ) : (
            deletedNotes.map((note) => (
              <View key={note.id} style={[styles.settingsCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>
                  Deleted {formatTimestamp(note.deletedAt)}
                </Text>
                <View style={styles.noteActions}>
                  <TouchableOpacity
                    style={[styles.restoreButton, { backgroundColor: theme.accentColor }]}
                    onPress={() => onRestoreNote(note.id)}
                  >
                    <Text style={styles.restoreButtonText}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: '#ff3b30' }]}
                    onPress={() => onPermanentlyDeleteNote(note.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete Forever</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// Main App Component
export default function App() {
  const [notes, setNotes] = useState([]);
  const [deletedNotes, setDeletedNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('main'); // 'main', 'editor', 'settings', 'recently-deleted'
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState('updated'); // 'updated', 'old-to-new', 'alphabetical'
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
        />
      ) : currentScreen === 'editor' ? (
        <NoteEditor
          note={selectedNote}
          onBack={handleBack}
          onSave={handleSaveNote}
          isDarkMode={isDarkMode}
        />
      ) : currentScreen === 'settings' ? (
        <SettingsScreen
          settings={settings}
          onSettingsChange={handleSettingsChange}
          isDarkMode={isDarkMode}
          onBack={handleNavigateBack}
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
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
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    fontSize: 16,
    padding: 0,
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
    backgroundColor: '#007AFF20',
    borderColor: '#007AFF',
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
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 12,
  },
  noteCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  noteTime: {
    fontSize: 14,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 8,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
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
    justifyContent: 'space-between',
  },
  todayButton: {
    padding: 8,
  },
  todayButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  renameArrow: {
    fontSize: 16,
  },
  titleInputInline: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    minWidth: 200,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  contentInput: {
    fontSize: 18,
    lineHeight: 28,
    flex: 1,
    padding: 0,
  },
  editorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 24,
  },
  editorFooterButton: {
    padding: 8,
    borderRadius: 8,
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
  // Summary Modal styles
  summaryModal: {
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
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '300',
  },
  summaryContent: {
    padding: 20,
    maxHeight: '100%',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
    borderBottomColor: '#333333',
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
});
