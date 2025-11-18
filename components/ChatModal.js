import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '../utils/constants';

/**
 * ChatModal Component
 * Reusable chat modal for note conversations
 */
export default function ChatModal({
  visible,
  onClose,
  chatMessages,
  chatInput,
  setChatInput,
  isLoadingChat,
  onSendMessage,
  isDarkMode,
}) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
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
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
                onPress={onSendMessage}
                disabled={!chatInput.trim() || isLoadingChat}
              >
                <Text style={styles.chatSendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
});


