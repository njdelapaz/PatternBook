import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENAI_API_KEY } from '@env';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio as AVAudio } from 'expo-av';

// Import Screen Components
import LoginScreen from './screens/LoginScreen';
import EmailLoginScreen from './screens/EmailLoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MainScreen from './screens/MainScreen';
import SettingsScreen from './screens/SettingsScreen';
import RecentlyDeletedScreen from './screens/RecentlyDeletedScreen';
import TextEditorScreen from './screens/TextEditorScreen';
import VoiceRecordingScreen from './screens/VoiceRecordingScreen';

// Import Utilities
import { loadNotes, saveNotes } from './utils/storage';
import { darkTheme, lightTheme } from './utils/constants';
import { transcribeAudioWithDeepgram, isDeepgramConfigured } from './utils/deepgram';
import { MarkdownText, formatTimestamp } from './utils/components';
import { buildChatMessages, getDefaultChatModel, getDefaultMaxTokens, getDefaultTemperature } from './utils/chat';
import { buildSecurePrompt, sanitizeInput, MAX_INPUT_LENGTHS } from './utils/llmGuardrails';
import { generateTextSummary } from './utils/textSummarization';

// Import LLM Service
import { callLLM } from './services/llmService';

// Import Carbon icons (for remaining components)
import KeyboardIcon from './assets/carbon-icons/carbon--keyboard.svg';
import UndoIcon from './assets/carbon-icons/carbon--undo.svg';
import RedoIcon from './assets/carbon-icons/carbon--redo.svg';
import MicrophoneIcon from './assets/carbon-icons/carbon--microphone-filled.svg';
import ChatIcon from './assets/carbon-icons/carbon--chat.svg';

// OpenAI API Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Demo user messages that auto-fill for easy presentation (development only)
const DEMO_USER_MESSAGES = __DEV__ ? {
  dream: [
    "What do you think this dream means?",
    "I'm not sure, maybe I've been thinking about nostalgia lately",
    "That makes sense"
  ],
  productivity: [
    "How can I actually make this change?",
    "Maybe I should focus on one thing at a time",
    "I think it means choosing projects that align with my values"
  ]
} : null;

// Canned chat responses for demo - organized by note content (development only)
// Note: These are only used as fallback if API fails
const CHAT_RESPONSES = __DEV__ ? {
  // For the "dream library" note (first voice recording)
  dream: [
    "That's a fascinating dream! The library of altered memories sounds like your subconscious exploring the malleability of memory. What do you think triggered this dream?",
    "It's interesting how dreams can reveal our deeper thoughts about identity and truth. The fact that each book was slightly different suggests you might be processing how perspective shapes our past.",
    "This reminds me of the concept of 'memory reconsolidation' - each time we recall something, we actually change it slightly. Your dream seems to be grappling with that very idea."
  ],
  // For the "productivity" note (second voice recording and beyond)
  productivity: [
    "That's a really mature insight about productivity culture. What do you think would help you shift from quantity to quality in practice?",
    "It sounds like you're recognizing the difference between being busy and being purposeful. Have you thought about what 'intentional' looks like for you specifically?",
    "This is such an important realization. Measuring worth by accomplishments can be exhausting. What would it look like to measure your worth differently?"
  ]
} : null;

// Generate title based on content (hard-coded for demo)
function generateTitleFromContent(content) {
  const lowerContent = content.toLowerCase();

  // Check for dream/library note
  if (lowerContent.includes('dream') && lowerContent.includes('library')) {
    return "Dream about an endless library";
  }

  // Check for productivity note
  if (lowerContent.includes('productivity') || lowerContent.includes('accomplish')) {
    return "Rethinking productivity and worth";
  }

  // Fallback to first few words
  return content.split(' ').slice(0, 5).join(' ') || 'Untitled Note';
}

// Summary prompt template
const SUMMARY_TEMPLATE = `You are a helpful assistant that creates concise, clear summaries. Keep summaries under 50 words and capture the main point.

Please summarize this note in 1-2 sentences:

{{content}}`;

// Generate AI summary for note content (internal function)
// Applies security guardrails: sanitization, PII detection, length validation
// Uses text-based fallback when AI API fails (after retries with exponential backoff)
async function generateSummary(content) {
  try {
    // Sanitize content with guardrails
    const contentSanitized = sanitizeInput(content || '', {
      maxLength: MAX_INPUT_LENGTHS.summary,
      sanitizePII: true,
      sanitizeInjection: true,
      truncate: true, // Truncate if too long
    });

    if (!contentSanitized.isValid) {
      // If validation fails, use text-based fallback
      return generateTextSummary(content);
    }

    // Build secure prompt using template
    const promptResult = buildSecurePrompt(SUMMARY_TEMPLATE, {
      content: contentSanitized.sanitized,
    }, {
      maxLength: MAX_INPUT_LENGTHS.summary,
      sanitizePII: true,
      sanitizeInjection: true,
    });

    if (!promptResult.isValid) {
      // Fallback if prompt building fails
      return generateTextSummary(contentSanitized.sanitized);
    }

    // Use callLLM service (includes retry logic with exponential backoff)
    const result = await callLLM({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise, clear summaries. Keep summaries under 50 words and capture the main point.',
        },
        {
          role: 'user',
          content: `Please summarize this note in 1-2 sentences:\n\n${promptResult.prompt}`,
        },
      ],
      temperature: 0.7,
      maxTokens: 100,
    });

    // If API call succeeded, return AI-generated summary
    if (result.success && result.data && result.data.content) {
      const aiSummary = result.data.content.trim();
      if (aiSummary.length > 0) {
        return aiSummary;
      }
    }

    // API failed after retries - use text-based fallback
    // This handles: rate limits, network errors, API errors, quota exceeded, etc.
    return generateTextSummary(contentSanitized.sanitized);
  } catch (error) {
    // Unexpected error - use text-based fallback
    // Silently handle error (no user-facing messages as per requirements)
    return generateTextSummary(content);
  }
}

// Get or generate AI summary with caching
async function getCachedSummary(note, notes, setNotes) {
  // Check if we already have a cached summary
  if (note.aiSummary) {
    return note.aiSummary;
  }

  // Generate new summary
  const summary = await generateSummary(note.content);
  
  // Cache the summary in the note object
  const updatedNotes = notes.map(n => 
    n.id === note.id ? { ...n, aiSummary: summary } : n
  );
  
  // Update state and persist to storage
  setNotes(updatedNotes);
  await saveNotes(updatedNotes);
  
  return summary;
}

// Note Editor Screen Component
function NoteEditor({ note, onBack, onSave, isDarkMode }) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(note?.title || 'New Note');
  const [content, setContent] = useState(note?.content || '');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessageCount, setChatMessageCount] = useState(0);
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

  // Handle chat button - open chat about the note
  const handleOpenChat = () => {
    if (!content.trim() && !title.trim()) {
      alert('Note is empty. Please add some content first.');
      return;
    }

    setShowChat(true);
  };

  // Handle sending a chat message with OpenAI API integration
  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    // Store user input and clear input field
    const userInput = chatInput.trim();
    const userMessage = { role: 'user', content: userInput };
    setChatInput('');
    setIsLoadingChat(true);

    // Build message history with note context BEFORE adding user message to UI
    // This ensures we don't duplicate the current message
    // Guardrails are applied: sanitization, PII detection, length validation
    const chatResult = buildChatMessages(
      title,
      content,
      chatMessages, // Previous conversation history (before current message)
      userInput // Current user message
    );

    // Add user message to chat UI
    setChatMessages(prev => [...prev, userMessage]);

    // Log warnings if any (PII detected, injection attempts, etc.)
    if (chatResult.warnings && chatResult.warnings.length > 0) {
      console.log('[Chat Guardrails] Warnings:', chatResult.warnings);
    }

    try {
      // Call OpenAI API with sanitized messages
      const result = await callLLM({
        model: getDefaultChatModel(),
        messages: chatResult.messages,
        temperature: getDefaultTemperature(),
        maxTokens: getDefaultMaxTokens(),
      });

      if (result.success && result.data && result.data.content) {
        // Add AI response to chat
        const aiMessage = { role: 'assistant', content: result.data.content };
        setChatMessages(prev => [...prev, aiMessage]);
      } else {
        // Handle API errors gracefully
        const isQuotaError = result.error && result.error.type === 'QuotaExceededError';
        const isAuthError = result.error && result.error.type === 'AuthError';
        
        // Gracefully handle error - use fallback response in development, otherwise silently fail
        if (__DEV__ && CHAT_RESPONSES) {
          const isDreamNote = content.toLowerCase().includes('dream') || content.toLowerCase().includes('library');
          const responseSet = isDreamNote ? CHAT_RESPONSES.dream : CHAT_RESPONSES.productivity;
          const noteType = isDreamNote ? 'dream' : 'productivity';
          
          if (responseSet && responseSet.length > 0) {
            const responseIndex = chatMessageCount % responseSet.length;
            const fallbackResponse = responseSet[responseIndex];
            const aiMessage = { role: 'assistant', content: fallbackResponse };
            setChatMessages(prev => [...prev, aiMessage]);
            setChatMessageCount(prev => prev + 1);
          } else {
            // Remove user message if we can't provide a response
            setChatMessages(prev => prev.slice(0, -1));
          }
        } else {
          // In production, silently remove the user message if API fails
          // Errors are logged but not shown to users (as per requirements)
          setChatMessages(prev => prev.slice(0, -1));
        }
      }
    } catch (error) {
      // Gracefully handle unexpected errors - no user-facing error messages
      console.error('[Chat] Error sending message:', error);
      
      // Use fallback in development, otherwise silently fail
      if (__DEV__ && CHAT_RESPONSES) {
        const isDreamNote = content.toLowerCase().includes('dream') || content.toLowerCase().includes('library');
        const responseSet = isDreamNote ? CHAT_RESPONSES.dream : CHAT_RESPONSES.productivity;
        const noteType = isDreamNote ? 'dream' : 'productivity';
        
        if (responseSet && responseSet.length > 0) {
          const responseIndex = chatMessageCount % responseSet.length;
          const fallbackResponse = responseSet[responseIndex];
          const aiMessage = { role: 'assistant', content: fallbackResponse };
          setChatMessages(prev => [...prev, aiMessage]);
          setChatMessageCount(prev => prev + 1);
        } else {
          setChatMessages(prev => prev.slice(0, -1));
        }
      } else {
        // Silently remove user message on error
        setChatMessages(prev => prev.slice(0, -1));
      }
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
      <Modal
        visible={showChat}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChat(false)}
      >
        <View style={styles.chatModalContainer}>
          <KeyboardAvoidingView
            style={{ flex: 1, marginTop: 50 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={[styles.chatModal, { backgroundColor: theme.backgroundColor, marginTop: 0 }]}>
              {/* Chat Header */}
              <View style={[styles.chatHeader, { borderBottomColor: theme.borderColor, paddingTop: insets.top }]}>
                <Text style={[styles.chatTitle, { color: theme.textColor }]}>Chat about your note</Text>
                <TouchableOpacity onPress={() => setShowChat(false)} style={styles.closeButton}>
                  <Text style={[styles.closeButtonText, { color: theme.secondaryTextColor }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Chat Messages */}
              <ScrollView style={styles.chatMessages} contentContainerStyle={styles.chatMessagesContent}>
                {chatMessages.length === 0 && (
                  <View style={styles.chatEmptyState}>
                    <Text style={[styles.chatEmptyText, { color: theme.secondaryTextColor }]}>
                      Ask me anything about your note...
                    </Text>
                  </View>
                )}
                {chatMessages.map((message, index) => (
                  <View
                    key={index}
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
                ))}
                {isLoadingChat && (
                  <View style={[styles.chatMessageBubble, styles.aiMessage]}>
                    <ActivityIndicator size="small" color={theme.textColor} />
                  </View>
                )}
              </ScrollView>

              {/* Chat Input */}
              <View style={[styles.chatInputContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.borderColor, paddingBottom: insets.bottom }]}>
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
    const newNote = {
      id: Date.now().toString(),
      title: generateTitleFromContent(transcription),
      content: transcription,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      summary: 'Generating summary...',
    };

    // Add note immediately
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    saveNotes(updatedNotes);

    // For demo: Navigate to the note editor instead of going back to dashboard
    setSelectedNoteId(newNote.id);
    setCurrentScreen('editor');

    // Generate summary asynchronously and cache it
    // generateSummary handles retries and fallbacks internally
    try {
      const summary = await generateSummary(transcription);
      const noteWithSummary = { ...newNote, summary, aiSummary: summary };
      const notesWithSummary = updatedNotes.map(note =>
        note.id === newNote.id ? noteWithSummary : note
      );
      setNotes(notesWithSummary);
      saveNotes(notesWithSummary);
    } catch (error) {
      // Silently handle error - use text-based fallback
      const fallbackSummary = generateTextSummary(transcription);
      const noteWithError = { ...newNote, summary: fallbackSummary, aiSummary: fallbackSummary };
      const notesWithError = updatedNotes.map(note =>
        note.id === newNote.id ? noteWithError : note
      );
      setNotes(notesWithError);
      saveNotes(notesWithError);
    }
  };

  // Handle creating note from text editor
  const handleCreateNoteFromText = async (title, content) => {
    const newNote = {
      id: Date.now().toString(),
      title: generateTitleFromContent(content),
      content: content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      summary: 'Generating summary...',
    };
    
    // Add note immediately
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
    
    // Generate summary asynchronously and cache it
    try {
      const summary = await generateSummary(content);
      const noteWithSummary = { ...newNote, summary, aiSummary: summary };
      const notesWithSummary = updatedNotes.map(note => 
        note.id === newNote.id ? noteWithSummary : note
      );
      setNotes(notesWithSummary);
      saveNotes(notesWithSummary);
    } catch (error) {
      // Silently handle error for demo - just use fallback
      // console.error('Error generating summary:', error);
      const fallbackSummary = content.slice(0, 100) + '...';
      const noteWithError = { ...newNote, summary: fallbackSummary, aiSummary: fallbackSummary };
      const notesWithError = updatedNotes.map(note =>
        note.id === newNote.id ? noteWithError : note
      );
      setNotes(notesWithError);
      saveNotes(notesWithError);
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

  // Handle opening an existing note
  const handleNotePress = (note) => {
    setSelectedNoteId(note.id);
    setCurrentScreen('editor');
  };

  // Handle saving note changes
  const handleSaveNote = async (title, content) => {
    const currentNote = notes.find(note => note.id === selectedNoteId);
    const contentChanged = currentNote && currentNote.content !== content;
    
    const updatedNote = { 
      title, 
      content, 
      updatedAt: Date.now(),
      // Only show "Updating summary..." if content actually changed
      summary: contentChanged ? 'Updating summary...' : (currentNote?.summary || currentNote?.aiSummary)
    };
    
    // Update note immediately
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === selectedNoteId
          ? { ...note, ...updatedNote }
          : note
      )
    );

    // Generate new summary only if content changed
    if (contentChanged) {
      try {
        const newSummary = await generateSummary(content);
        const updatedNotes = notes.map((note) =>
          note.id === selectedNoteId
            ? { ...note, summary: newSummary, aiSummary: newSummary }
            : note
        );
        setNotes(updatedNotes);
        await saveNotes(updatedNotes);
      } catch (error) {
        console.error('Error updating summary:', error);
        // Fallback to truncated content
        const fallbackSummary = content.slice(0, 100) + (content.length > 100 ? '...' : '');
        const updatedNotes = notes.map((note) =>
          note.id === selectedNoteId
            ? { ...note, summary: fallbackSummary, aiSummary: fallbackSummary }
            : note
        );
        setNotes(updatedNotes);
        await saveNotes(updatedNotes);
      }
    } else if (title !== currentNote?.title) {
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
    paddingHorizontal: 20,
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
    padding: 20,
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
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
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
