import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENAI_API_KEY } from '@env';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio as AVAudio } from 'expo-av';
import { useDeviceType } from './hooks/useDeviceType';

// Import Screen Components
import LoginScreen from './screens/LoginScreen';
import EmailLoginScreen from './screens/EmailLoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PersonaSelectionScreen from './screens/PersonaSelectionScreen';
import MainScreen from './screens/MainScreen';
import SettingsScreen from './screens/SettingsScreen';
import RecentlyDeletedScreen from './screens/RecentlyDeletedScreen';
import TextEditorScreen from './screens/TextEditorScreen';
import VoiceRecordingScreen from './screens/VoiceRecordingScreen';
import GlobalChatScreen from './screens/GlobalChatScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';

// Import Utilities
import { loadNotes, saveNotes } from './utils/storage';
import { darkTheme, lightTheme, RETRIEVAL_CONFIG, PERSONA_SELECTED_KEY } from './utils/constants';
import { transcribeAudioWithDeepgram, isDeepgramConfigured } from './utils/deepgram';
import { MarkdownText, formatTimestamp } from './utils/components';
import { buildChatMessages, getDefaultChatModel, getDefaultMaxTokens, getDefaultTemperature } from './utils/chat';
import { loadChatHistory, saveChatHistory } from './utils/chatStorage';
import { buildNoteChatContext } from './utils/contextBuilder';
import { getCurrentUser, setCurrentUser, clearCurrentUser } from './utils/userStorage';

// Import LLM Service
import { callLLM } from './services/llmService';
import retrievalService from './services/noteRetrievalService';
import ragLogger from './services/ragLogger';
import { loadPersonaSnapshot } from './services/personaService';

// Import Carbon icons (for remaining components)
import KeyboardIcon from './assets/carbon-icons/carbon--keyboard.svg';
import UndoIcon from './assets/carbon-icons/carbon--undo.svg';
import RedoIcon from './assets/carbon-icons/carbon--redo.svg';
import MicrophoneIcon from './assets/carbon-icons/carbon--microphone-filled.svg';
import ChatIcon from './assets/carbon-icons/carbon--chat.svg';

// OpenAI API Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Generate title from content using LLM
async function generateTitle(content) {
  try {
    const result = await callLLM({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, clear titles for journal entries. Keep titles under 8 words.',
        },
        {
          role: 'user',
          content: `Generate a short, descriptive title for this journal entry:\n\n${content.slice(0, 500)}`,
        },
      ],
      temperature: 0.7,
      maxTokens: 50,
    });

    if (result.success && result.data && result.data.content) {
      return result.data.content.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
    }

    // Fallback to first few words
    return content.split(' ').slice(0, 5).join(' ') || 'Untitled Note';
  } catch (error) {
    // Fallback to first few words
    return content.split(' ').slice(0, 5).join(' ') || 'Untitled Note';
  }
}

// Note Editor Screen Component
function NoteEditor({ note, notes, onBack, onSave, isDarkMode, userId }) {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useDeviceType();
  const [title, setTitle] = useState(note?.title || 'New Note');
  const [content, setContent] = useState(note?.content || '');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const saveTimeoutRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [referencedNotes, setReferencedNotes] = useState([]);
  const recordingRef = useRef(null);
  const isStartingRef = useRef(false);
  const titleGeneratedRef = useRef(note?.titleGenerated || false);

  // Auto-generate title when content reaches threshold (only once)
  useEffect(() => {
    const generateTitleForNote = async () => {
      // Only auto-generate if:
      // 1. Title is still "New Note"
      // 2. Content has some substance (at least 20 characters)
      // 3. Title hasn't been auto-generated yet
      if (
        title === 'New Note' &&
        content.trim().length >= 20 &&
        !titleGeneratedRef.current
      ) {
        titleGeneratedRef.current = true;
        const generatedTitle = await generateTitle(content);
        setTitle(generatedTitle);
      }
    };

    // Debounce to avoid generating too frequently while typing
    const timeoutId = setTimeout(generateTitleForNote, 2000);
    return () => clearTimeout(timeoutId);
  }, [content]);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (note && note.id) {
        try {
          const history = await loadChatHistory(note.id, userId);
          setChatMessages(history);
        } catch (error) {
          console.error('[NoteEditor] Error loading chat history:', error);
        }
      }
    };
    loadHistory();
  }, [note?.id, userId]);

  // Save chat history when messages change
  useEffect(() => {
    const saveHistory = async () => {
      if (note && note.id && chatMessages.length > 0) {
        try {
          await saveChatHistory(note.id, chatMessages, userId);
        } catch (error) {
          console.error('[NoteEditor] Error saving chat history:', error);
        }
      }
    };
    saveHistory();
  }, [chatMessages, note?.id, userId]);

  // Index notes for retrieval when notes change
  useEffect(() => {
    if (notes && notes.length > 0) {
      const startTime = Date.now();
      retrievalService.indexNotes(notes);
      const executionTime = Date.now() - startTime;
      
      // Log index building
      const stats = retrievalService.getStats();
      ragLogger.logIndexBuild({
        noteCount: stats.noteCount,
        chunkCount: stats.chunkCount,
        executionTime,
      });
    }
  }, [notes]);

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

  // Auto-dismiss keyboard when rotating to landscape
  useEffect(() => {
    if (isLandscape && isKeyboardVisible) {
      Keyboard.dismiss();
    }
  }, [isLandscape]);

  // Auto-save with debouncing
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onSave(title, content, titleGeneratedRef.current);
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

  // Handle chat button - open chat about the note
  const handleOpenChat = () => {
    if (!content.trim() && !title.trim()) {
      alert('Note is empty. Please add some content first.');
      return;
    }

    setShowChat(true);
  };

  // Handle sending a chat message with OpenAI API integration and RAG
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userInput = chatInput.trim();
    setChatInput('');
    setIsLoadingChat(true);

    // Add user message to UI
    const newUserMessage = {
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    };
    
    const updatedMessages = [...chatMessages, newUserMessage];
    setChatMessages(updatedMessages);

    try {
      // Log chat query
      await ragLogger.logChatQuery({
        query: userInput,
        chatType: 'note',
        noteId: note?.id,
        noteTitle: title,
        retrievedChunksCount: 0, // Will update after retrieval
      });

      // Retrieve relevant note chunks (excluding current note)
      const startTime = Date.now();
      const retrievedChunks = retrievalService.retrieve(userInput, {
        topK: RETRIEVAL_CONFIG.TOP_K,
        minScore: RETRIEVAL_CONFIG.MIN_SCORE,
        excludeNoteId: note?.id,
      });
      const executionTime = Date.now() - startTime;

      // Log retrieval
      await ragLogger.logRetrieval({
        query: userInput,
        resultsCount: retrievedChunks.length,
        results: retrievedChunks,
        executionTime,
        excludeNoteId: note?.id,
      });

      console.log('[NoteEditor] Retrieved chunks:', retrievedChunks.length);

      // Build context with retrieval
      const contextResult = buildNoteChatContext(
        { title, content, id: note?.id },
        userInput,
        chatMessages, // Previous history (without current message)
        retrievedChunks
      );

      // Log context building
      await ragLogger.logContextBuild({
        chatType: 'note',
        ...contextResult.metadata,
      });

      // Store referenced notes for UI
      setReferencedNotes(contextResult.metadata.retrievedNotes);

      // Call LLM
      const result = await callLLM({
        model: getDefaultChatModel(),
        messages: contextResult.messages,
        temperature: getDefaultTemperature(),
        maxTokens: getDefaultMaxTokens(),
      });

      if (result.success && result.data && result.data.content) {
        // Add AI response to chat
        const aiMessage = { role: 'assistant', content: result.data.content };
        setChatMessages(prev => [...prev, aiMessage]);
      } else {
        // Handle API errors gracefully - silently remove the user message if API fails
        // Errors are logged but not shown to users (as per requirements)
        setChatMessages(prev => prev.slice(0, -1));
        console.error('[Chat] API error:', result.error);
      }
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      
      // Log error
      await ragLogger.logError({
        operation: 'note_chat_send',
        error,
        context: { noteId: note?.id, noteTitle: title, query: userInput },
      });
      
      // Remove user message on error
      setChatMessages(chatMessages);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Voice Recording: Start (API-based)
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
      
      // Use consistent recording configuration across platforms
      const recordingOptions = Platform.select({
        android: {
          extension: '.m4a',
          outputFormat: AVAudio.AndroidOutputFormat.MPEG_4,
          audioEncoder: AVAudio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: AVAudio.IOSOutputFormat.MPEG4AAC,
          audioQuality: AVAudio.IOSAudioQuality.MEDIUM,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      });
      
      console.log('Using recording options for platform:', Platform.OS, recordingOptions);
      
      try {
        await recording.prepareToRecordAsync(recordingOptions);
        await recording.startAsync();
        console.log('Recording started successfully with options:', recordingOptions);
      } catch (err) {
        console.log('First recording attempt failed, trying HIGH_QUALITY fallback...', err.message);
        // Fallback to HIGH_QUALITY preset if custom options fail
        try {
          await AVAudio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false });
          recording = new AVAudio.Recording();
          await recording.prepareToRecordAsync(AVAudio.RecordingOptionsPresets.HIGH_QUALITY);
          await recording.startAsync();
          console.log('Recording started with HIGH_QUALITY fallback');
        } catch (retryErr) {
          console.log('HIGH_QUALITY also failed, trying LOW_QUALITY...', retryErr.message);
          // Try LOW_QUALITY as last resort
          recording = new AVAudio.Recording();
          await recording.prepareToRecordAsync(AVAudio.RecordingOptionsPresets.LOW_QUALITY);
          await recording.startAsync();
          console.log('Recording started with LOW_QUALITY fallback');
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

  // Voice Recording: Stop and transcribe (API-based)
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
      
      // Check if Deepgram is configured
      if (!isDeepgramConfigured()) {
        Alert.alert(
          'Configuration Error',
          'Deepgram API key is not configured. Please check your .env file.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const transcription = await transcribeAudioWithDeepgram(uri);
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



  const contentInputRef = useRef(null);
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  // Add extra horizontal padding in landscape to avoid notch
  const horizontalPadding = isLandscape ? Math.max(insets.left, insets.right, 20) : 20;

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
          <View style={[styles.editorHeader, { borderBottomColor: theme.borderColor, paddingHorizontal: horizontalPadding }]}>
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
            <View style={[styles.editorContent, { paddingHorizontal: horizontalPadding }]}>
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
        <View style={[styles.editorFooter, { paddingBottom: insets.bottom, paddingHorizontal: horizontalPadding, backgroundColor: theme.navBackground, borderTopColor: theme.borderColor }]}>
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
      <Modal
        visible={showChat}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChat(false)}
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.chatModalContainer}>
          <KeyboardAvoidingView
            style={{ flex: 1, marginTop: 50 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={[styles.chatModal, { backgroundColor: theme.backgroundColor, marginTop: 0 }]}>
              {/* Chat Header */}
              <View style={[styles.chatHeader, { borderBottomColor: theme.borderColor, paddingTop: insets.top, paddingHorizontal: horizontalPadding }]}>
                <Text style={[styles.chatTitle, { color: theme.textColor }]}>Chat about your note</Text>
                <TouchableOpacity onPress={() => setShowChat(false)} style={styles.closeButton}>
                  <Text style={[styles.closeButtonText, { color: theme.secondaryTextColor }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Chat Messages */}
              <ScrollView style={styles.chatMessages} contentContainerStyle={[styles.chatMessagesContent, { paddingHorizontal: horizontalPadding }]}>
                {chatMessages.length === 0 && (
                  <View style={styles.chatEmptyState}>
                    <Text style={[styles.chatEmptyText, { color: theme.secondaryTextColor }]}>
                      Ask me anything about your note...
                    </Text>
                  </View>
                )}
                {chatMessages.map((message, index) => (
                  <View key={index}>
                    <View
                      style={[
                        styles.chatMessageBubble,
                        message.role === 'user' ? styles.userMessage : styles.aiMessage
                      ]}
                    >
                      <Text style={[
                        styles.chatMessageText,
                        { color: message.role === 'user' ? '#000' : theme.textColor }
                      ]}>
                        {message.content}
                      </Text>
                    </View>
                    {message.role === 'assistant' && message.retrievedNotes && message.retrievedNotes.length > 0 && (
                      <View style={styles.referencedNotesContainer}>
                        <Text style={[styles.referencedNotesLabel, { color: theme.secondaryTextColor }]}>
                          Referenced: {message.retrievedNotes.map(n => n.noteTitle).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {isLoadingChat && (
                  <View style={[styles.chatMessageBubble, styles.aiMessage]}>
                    <ActivityIndicator size="small" color={theme.textColor} />
                  </View>
                )}
              </ScrollView>

              {/* Chat Input */}
              <View style={[styles.chatInputContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.borderColor, paddingBottom: insets.bottom, paddingHorizontal: horizontalPadding }]}>
                <TextInput
                  style={[styles.chatInput, { color: theme.textColor }]}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Type your message..."
                  placeholderTextColor={theme.placeholderColor}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.chatSendButton, { backgroundColor: chatInput.trim() ? theme.accentColor : theme.borderColor }]}
                  onPress={handleSendChatMessage}
                  disabled={!chatInput.trim() || isLoadingChat}
                >
                  <Text style={styles.chatSendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// Main App Component
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [currentUser, setCurrentUserState] = useState(null); // Store current logged-in user
  const [notes, setNotes] = useState([]);
  const [deletedNotes, setDeletedNotes] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('main'); // 'main', 'editor', 'voice-record', 'text-editor', 'settings', 'recently-deleted', 'global-chat', 'admin-panel'
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
  const [hasSelectedPersona, setHasSelectedPersona] = useState(false);
  const [isLoadingPersona, setIsLoadingPersona] = useState(false);

  // Check for existing user session on app start
  useEffect(() => {
    async function checkUserSession() {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserState(user);
        setIsLoggedIn(true);
        setHasCompletedOnboarding(true);

        // Check if user has selected persona
        const personaSelected = await AsyncStorage.getItem(`${PERSONA_SELECTED_KEY}_${user.id}`);
        setHasSelectedPersona(personaSelected === 'true');

        // Load user's notes
        const userNotes = await loadNotes(user.id);
        setNotes(userNotes);

        // Migration: If user has existing notes but no persona flag, set it
        if (userNotes.length > 0 && personaSelected !== 'true') {
          await AsyncStorage.setItem(`${PERSONA_SELECTED_KEY}_${user.id}`, 'true');
          setHasSelectedPersona(true);
        }
      }
    }
    checkUserSession();
  }, []);

  // Save notes whenever they change (user-specific)
  useEffect(() => {
    if (currentUser && (notes.length > 0 || currentScreen === 'main')) {
      saveNotes(notes, currentUser.id);
    }
  }, [notes, currentUser]);

  // Handle creating a new note
  const handleCreateNote = () => {
    const newNote = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      titleGenerated: false,
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    setCurrentScreen('editor');
  };

  // Handle creating note from voice transcription
  const handleCreateNoteFromTranscription = async (transcription) => {
    const newNote = {
      id: Date.now().toString(),
      title: 'New Note',
      content: transcription,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      titleGenerated: false,
    };

    // Add note immediately
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    if (currentUser) {
      saveNotes(updatedNotes, currentUser.id);
    }

    // Navigate to the note editor
    setSelectedNoteId(newNote.id);
    setCurrentScreen('editor');
  };

  // Handle creating note from text editor
  const handleCreateNoteFromText = async (title, content) => {
    const newNote = {
      id: Date.now().toString(),
      title: title || 'New Note',
      content: content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      titleGenerated: false,
    };

    // Add note immediately
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    if (currentUser) {
      saveNotes(updatedNotes, currentUser.id);
    }
  };

  // Navigate to voice recording screen
  const handleNavigateToVoiceRecord = () => {
    setCurrentScreen('voice-record');
  };

  // Navigate to text editor screen
  const handleNavigateToTextEditor = () => {
    setCurrentScreen('text-editor');
  };

  // Navigate to global chat screen
  const handleNavigateToGlobalChat = () => {
    setCurrentScreen('global-chat');
  };

  // Navigate to admin panel screen
  const handleNavigateToAdminPanel = () => {
    setCurrentScreen('admin-panel');
  };

  // Handle importing test notes from test_data_notes_only.json
  const handleImportTestNotes = async (count, onProgress) => {
    try {
      // Load test data
      const testData = require('./test_data_notes_only.json');
      
      // Limit to requested count
      const notesToImport = Math.min(count, testData.length);
      
      let importedCount = 0;

      // Process notes one by one
      for (let i = 0; i < notesToImport; i++) {
        const testNote = testData[i];
        
        // Create note with just the body content
        const newNote = {
          id: Date.now().toString() + '-' + i, // Ensure unique IDs
          title: 'Generating title...',
          content: testNote.content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pinned: false,
          titleGenerated: false,
        };

        // Add note to state
        setNotes(prevNotes => [newNote, ...prevNotes]);

        // Generate title (simulating the auto-generation process)
        try {
          const generatedTitle = await generateTitle(testNote.content);
          newNote.title = generatedTitle;
          newNote.titleGenerated = true;
          
          // Update the note with generated title
          setNotes(prevNotes => {
            const updated = prevNotes.map(n => 
              n.id === newNote.id ? { ...n, title: generatedTitle, titleGenerated: true } : n
            );
            saveNotes(updated);
            return updated;
          });
        } catch (error) {
          console.error('[ImportTestNotes] Error generating title:', error);
          // Use a fallback title
          newNote.title = `Note ${i + 1}`;
          setNotes(prevNotes => {
            const updated = prevNotes.map(n => 
              n.id === newNote.id ? { ...n, title: `Note ${i + 1}` } : n
            );
            saveNotes(updated);
            return updated;
          });
        }

        importedCount++;
        if (onProgress) {
          onProgress(importedCount, notesToImport);
        }

        // Small delay between notes to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return { success: true, count: importedCount };
    } catch (error) {
      console.error('[ImportTestNotes] Error importing test notes:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle opening an existing note
  const handleNotePress = (note) => {
    setSelectedNoteId(note.id);
    setCurrentScreen('editor');
  };

  // Handle saving note changes (called from NoteEditor)
  const handleSaveNote = async (title, content, titleGenerated = false) => {
    const updatedNote = {
      title,
      content,
      updatedAt: Date.now(),
      titleGenerated: titleGenerated,
    };

    // Update note
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === selectedNoteId
          ? { ...note, ...updatedNote }
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

  const handleLogin = async (user) => {
    // Save user session
    await setCurrentUser(user);
    setCurrentUserState(user);
    setIsLoggedIn(true);

    // Check if user has already selected persona and completed onboarding
    const personaSelected = await AsyncStorage.getItem(`${PERSONA_SELECTED_KEY}_${user.id}`);
    setHasSelectedPersona(personaSelected === 'true');

    // Load user's notes
    const userNotes = await loadNotes(user.id);
    setNotes(userNotes);

    // If user has existing notes, mark both persona and onboarding as complete (migration)
    if (userNotes.length > 0) {
      if (personaSelected !== 'true') {
        await AsyncStorage.setItem(`${PERSONA_SELECTED_KEY}_${user.id}`, 'true');
        setHasSelectedPersona(true);
      }
      setHasCompletedOnboarding(true);
    }

    // Update settings with user's email
    setSettings(prev => ({
      ...prev,
      profile: { name: user.email }
    }));
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

  const handleSelectPersona = async (personaType) => {
    if (!currentUser) {
      console.error('[App] No current user when selecting persona');
      return;
    }

    console.log('[App] Loading persona:', personaType);
    setIsLoadingPersona(true);

    try {
      // Load persona notes
      const personaNotes = await loadPersonaSnapshot(personaType);
      console.log('[App] Loaded', personaNotes.length, 'notes for persona:', personaType);

      // Save notes to user's storage
      setNotes(personaNotes);
      await saveNotes(personaNotes, currentUser.id);

      // Pre-index notes for RAG (if not blank slate)
      if (personaNotes.length > 0) {
        console.log('[App] Pre-indexing notes for RAG');
        retrievalService.indexNotes(personaNotes);
      }

      // Mark persona as selected
      await AsyncStorage.setItem(`${PERSONA_SELECTED_KEY}_${currentUser.id}`, 'true');
      setHasSelectedPersona(true);

      console.log('[App] Persona selection complete');
    } catch (error) {
      console.error('[App] Error loading persona:', error);
      Alert.alert('Error', 'Failed to load persona notes. Please try again.');
    } finally {
      setIsLoadingPersona(false);
    }
  };

  const handleLogout = async () => {
    // Clear user session
    await clearCurrentUser();
    setCurrentUserState(null);

    // Clear app state
    setIsLoggedIn(false);
    setShowEmailLogin(false);
    setHasCompletedOnboarding(false);
    setHasSelectedPersona(false); // Reset persona selection
    setCurrentScreen('main');
    setSelectedNoteId(null);
    setNotes([]);
    setDeletedNotes([]);
    setSearchQuery('');
    setShowSearch(false);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <View style={[styles.appRoot, { backgroundColor: theme.backgroundColor }]}>
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
        </View>
      </SafeAreaProvider>
    );
  }

  // Show persona selection screen if not yet selected (happens first, right after login)
  if (!hasSelectedPersona) {
    return (
      <SafeAreaProvider>
        <View style={[styles.appRoot, { backgroundColor: theme.backgroundColor }]}>
          <PersonaSelectionScreen
            onSelectPersona={handleSelectPersona}
            isDarkMode={isDarkMode}
            isLoading={isLoadingPersona}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  // Show onboarding screen if not completed (happens after persona selection)
  if (!hasCompletedOnboarding) {
    return (
      <SafeAreaProvider>
        <View style={[styles.appRoot, { backgroundColor: theme.backgroundColor }]}>
          <OnboardingScreen onComplete={handleCompleteOnboarding} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={[styles.appRoot, { backgroundColor: theme.backgroundColor }]}>
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
            onNavigateToGlobalChat={handleNavigateToGlobalChat}
          />
        ) : currentScreen === 'editor' ? (
          <NoteEditor
            note={selectedNote}
            notes={notes}
            onBack={handleBack}
            onSave={handleSaveNote}
            isDarkMode={isDarkMode}
            userId={currentUser?.id}
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
            onNavigateToAdminPanel={handleNavigateToAdminPanel}
            onImportTestNotes={handleImportTestNotes}
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
        ) : currentScreen === 'global-chat' ? (
          <GlobalChatScreen
            isDarkMode={isDarkMode}
            onBack={handleNavigateBack}
            notes={notes}
            onNotePress={handleNotePress}
            userId={currentUser?.id}
          />
        ) : currentScreen === 'admin-panel' ? (
          <AdminPanelScreen
            isDarkMode={isDarkMode}
            onBack={handleNavigateBack}
          />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
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
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderColor: '#C8D5B9',
    borderRadius: 12,
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
  // Chat Modal styles
  chatModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  chatModal: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  chatTitle: {
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
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    paddingVertical: 20,
    flexGrow: 1,
  },
  chatEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  chatEmptyText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  chatMessageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#C8D5B9',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a2a',
  },
  chatMessageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  referencedNotesContainer: {
    marginLeft: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  referencedNotesLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  chatInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  chatSendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chatSendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
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
  // Modern save button styles (Lightpage-inspired)
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
