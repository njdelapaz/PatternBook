/**
 * Global Chat Screen
 * Chat interface that can reference all user notes via RAG
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme, RETRIEVAL_CONFIG } from '../utils/constants';
import { loadGlobalChatHistory, saveGlobalChatHistory } from '../utils/chatStorage';
import { buildGlobalChatContext } from '../utils/contextBuilder';
import retrievalService from '../services/noteRetrievalService';
import { callLLM, getDefaultChatModel, getDefaultMaxTokens, getDefaultTemperature } from '../utils/chat';
import { callLLM as callLLMService } from '../services/llmService';
import ragLogger from '../services/ragLogger';

export default function GlobalChatScreen({ isDarkMode, onBack, notes, onNotePress }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [referencedNotes, setReferencedNotes] = useState([]);
  
  const scrollViewRef = useRef(null);
  
  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, []);
  
  // Index notes for retrieval when notes change
  useEffect(() => {
    if (notes && notes.length > 0) {
      retrievalService.indexNotes(notes);
    }
  }, [notes]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);
  
  const loadHistory = async () => {
    try {
      const history = await loadGlobalChatHistory();
      setChatMessages(history);
    } catch (error) {
      console.error('[GlobalChat] Error loading history:', error);
    }
  };
  
  const saveHistory = async (messages) => {
    try {
      await saveGlobalChatHistory(messages);
    } catch (error) {
      console.error('[GlobalChat] Error saving history:', error);
    }
  };
  
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) {
      return;
    }
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setIsLoading(true);
    
    // Add user message to UI
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    
    const updatedMessages = [...chatMessages, newUserMessage];
    setChatMessages(updatedMessages);
    
    try {
      // Log chat query
      await ragLogger.logChatQuery({
        query: userMessage,
        chatType: 'global',
        retrievedChunksCount: 0, // Will update after retrieval
      });

      // Retrieve relevant note chunks
      const startTime = Date.now();
      const retrievedChunks = retrievalService.retrieve(userMessage, {
        topK: RETRIEVAL_CONFIG.TOP_K,
        minScore: RETRIEVAL_CONFIG.MIN_SCORE,
      });
      const executionTime = Date.now() - startTime;
      
      // Log retrieval
      await ragLogger.logRetrieval({
        query: userMessage,
        resultsCount: retrievedChunks.length,
        results: retrievedChunks,
        executionTime,
      });
      
      console.log('[GlobalChat] Retrieved chunks:', retrievedChunks.length);
      
      // Build context with retrieval
      const contextResult = buildGlobalChatContext(
        userMessage,
        chatMessages, // Previous history (without current message)
        retrievedChunks
      );
      
      // Log context building
      await ragLogger.logContextBuild({
        chatType: 'global',
        ...contextResult.metadata,
      });
      
      // Store referenced notes for UI
      setReferencedNotes(contextResult.metadata.retrievedNotes);
      
      // Call LLM
      const result = await callLLMService({
        model: getDefaultChatModel(),
        messages: contextResult.messages,
        temperature: getDefaultTemperature(),
        maxTokens: getDefaultMaxTokens(),
      });
      
      if (result.success) {
        const assistantMessage = {
          role: 'assistant',
          content: result.data.content,
          timestamp: Date.now(),
          retrievedNotes: contextResult.metadata.retrievedNotes,
        };
        
        const finalMessages = [...updatedMessages, assistantMessage];
        setChatMessages(finalMessages);
        await saveHistory(finalMessages);
        
        // Log chat save
        await ragLogger.logChatSave({
          chatId: 'global',
          messageCount: finalMessages.length,
          lastMessage: assistantMessage,
        });
        
        // Clear referenced notes after displaying
        setTimeout(() => setReferencedNotes([]), 3000);
      } else {
        // Handle error
        Alert.alert('Error', result.error.message || 'Failed to get response');
        
        // Remove user message on error
        setChatMessages(chatMessages);
      }
    } catch (error) {
      console.error('[GlobalChat] Error sending message:', error);
      
      // Log error
      await ragLogger.logError({
        operation: 'global_chat_send',
        error,
        context: { query: userMessage },
      });
      
      Alert.alert('Error', 'Failed to send message');
      
      // Remove user message on error
      setChatMessages(chatMessages);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearHistory = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setChatMessages([]);
            await saveHistory([]);
          },
        },
      ]
    );
  };
  
  const handleNotePress = (noteId) => {
    if (onNotePress) {
      onNotePress(noteId);
    }
  };

  const pan = useRef(new Animated.Value(0)).current;

  // Swipe back gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, _gestureState) => {
        // Only trigger if swipe starts from left edge (within 50px)
        return evt.nativeEvent.pageX < 50;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only trigger for horizontal swipes from left edge
        return evt.nativeEvent.pageX < 50 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        pan.setOffset(0);
      },
      onPanResponderMove: (_evt, gestureState) => {
        // Only allow right swipe (positive dx)
        if (gestureState.dx > 0) {
          pan.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        // If swiped more than 100px to the right, complete the swipe animation
        if (gestureState.dx > 100) {
          // Animate off-screen to the right
          Animated.timing(pan, {
            toValue: 400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            // After animation completes, navigate back and reset
            onBack();
            pan.setValue(0);
          });
        } else {
          // Snap back
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          transform: [{ translateX: pan }]
        }
      ]}
      {...panResponder.panHandlers}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={{ paddingTop: insets.top, flex: 1 }}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={[styles.backButtonText, { color: theme.accentColor }]}>
                ← Back
              </Text>
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.textColor }]}>
              Global Chat
            </Text>
            
            <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton}>
              <Text style={[styles.clearButtonText, { color: theme.secondaryTextColor }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatMessages}
            contentContainerStyle={styles.chatMessagesContent}
          >
            {chatMessages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.secondaryTextColor }]}>
                  Ask me anything about your notes!
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.placeholderColor }]}>
                  I can help you find connections, summarize content, and explore your thoughts.
                </Text>
              </View>
            ) : (
              chatMessages.map((message, index) => (
                <View key={index} style={styles.messageContainer}>
                  <View
                    style={[
                      styles.messageBubble,
                      message.role === 'user'
                        ? [styles.userMessage, { backgroundColor: theme.accentColor }]
                        : [styles.assistantMessage, { backgroundColor: theme.cardBackground }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        {
                          color:
                            message.role === 'user'
                              ? '#FFFFFF'
                              : theme.textColor,
                        },
                      ]}
                    >
                      {message.content}
                    </Text>
                  </View>
                  
                  {/* Show referenced notes for assistant messages */}
                  {message.role === 'assistant' && message.retrievedNotes && message.retrievedNotes.length > 0 && (
                    <View style={styles.referencedNotesContainer}>
                      <Text style={[styles.referencedNotesLabel, { color: theme.secondaryTextColor }]}>
                        Referenced notes:
                      </Text>
                      <View style={styles.referencedNotesList}>
                        {message.retrievedNotes.map((note, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.referencedNoteBadge, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
                            onPress={() => handleNotePress(note.noteId)}
                          >
                            <Text style={[styles.referencedNoteText, { color: theme.accentColor }]}>
                              {note.noteTitle}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))
            )}
            
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.accentColor} />
                <Text style={[styles.loadingText, { color: theme.secondaryTextColor }]}>
                  Thinking...
                </Text>
              </View>
            )}
          </ScrollView>
          
          {/* Referenced Notes Indicator */}
          {referencedNotes.length > 0 && (
            <View style={[styles.referencingIndicator, { backgroundColor: theme.cardBackground, borderTopColor: theme.borderColor }]}>
              <Text style={[styles.referencingText, { color: theme.secondaryTextColor }]}>
                Referencing: {referencedNotes.map(n => n.noteTitle).join(', ')}
              </Text>
            </View>
          )}
          
          {/* Input Area */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.navBackground,
                borderTopColor: theme.borderColor,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.textColor,
                  backgroundColor: theme.inputBackground,
                },
              ]}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Ask about your notes..."
              placeholderTextColor={theme.placeholderColor}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    chatInput.trim() && !isLoading
                      ? theme.accentColor
                      : theme.borderColor,
                },
              ]}
              onPress={handleSendMessage}
              disabled={!chatInput.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    marginLeft: '20%',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    marginRight: '20%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  referencedNotesContainer: {
    marginTop: 8,
    marginLeft: 8,
  },
  referencedNotesLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  referencedNotesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  referencedNoteBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  referencedNoteText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  referencingIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 0.5,
  },
  referencingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

