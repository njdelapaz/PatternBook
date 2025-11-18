import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '../utils/constants';
import { isDeepgramConfigured } from '../utils/deepgram';
import { hasVoiceApiConsent, setVoiceApiConsent } from '../utils/storage';
import { useRecording } from '../hooks/useRecording';
import { editorHeaderStyles, modernSaveButtonStyles } from '../utils/sharedStyles';

// Import Carbon icons
import MicrophoneIcon from '../assets/carbon-icons/carbon--microphone-filled.svg';

// Voice Recording Screen Component
export default function VoiceRecordingScreen({ isDarkMode, onBack, onSave }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Voice recording states
  const [transcription, setTranscription] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const durationTimerRef = useRef(null);

  // Use recording hook
  const { isRecording, isTranscribing, startRecording, stopAndTranscribe } = useRecording({
    onTranscriptionComplete: (transcript) => {
      setTranscription(transcript);
      setTranscriptionStatus('');
    },
    onError: (error) => {
      setTranscriptionStatus('');
      Alert.alert('Transcription Failed', error || 'An error occurred during transcription. Please try again.', [{ text: 'OK' }]);
    },
  });

  // Check Deepgram configuration and consent on component mount
  useEffect(() => {
    if (!isDeepgramConfigured()) {
      console.warn('Deepgram API key is not configured');
    }
    
    // Check if user has given consent for voice API usage
    checkVoiceApiConsent();
  }, []);

  const checkVoiceApiConsent = async () => {
    try {
      const hasConsent = await hasVoiceApiConsent();
      if (!hasConsent) {
        setShowConsentModal(true);
      }
    } catch (error) {
      console.error('Error checking voice API consent:', error);
      setShowConsentModal(true);
    }
  };

  const handleAcceptConsent = async () => {
    try {
      await setVoiceApiConsent(true);
      setShowConsentModal(false);
    } catch (error) {
      console.error('Error saving voice API consent:', error);
      Alert.alert('Error', 'Failed to save consent. Please try again.');
    }
  };

  const handleDeclineConsent = () => {
    setShowConsentModal(false);
    onBack(); // Navigate back to home page
  };

  // Start recording with duration tracking
  const handleStartRecording = async () => {
    await startRecording();
    setRecordingDuration(0);
    
    // Start duration timer
    durationTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop recording and transcribe
  const handleStopRecording = async () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    
    setTranscriptionStatus('Uploading audio...');
    await stopAndTranscribe();
  };


  // Save the transcription as a new note
  const handleSave = () => {
    if (transcription.trim()) {
      onSave(transcription.trim());
      // For demo: Don't go back to dashboard, let App.js handle navigation to editor
    }
  };

  // Format recording duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        {/* Header */}
        <View style={[editorHeaderStyles.editorHeader, { borderBottomColor: theme.borderColor }]}>
          <TouchableOpacity onPress={onBack} style={editorHeaderStyles.todayButton}>
            <Text style={[editorHeaderStyles.todayButtonText, { color: theme.accentColor }]}>← Back</Text>
          </TouchableOpacity>
          
          <View style={editorHeaderStyles.titleContainer}>
            <Text style={[editorHeaderStyles.titleText, { color: theme.textColor }]}>Voice Recording</Text>
          </View>
          
          <View style={editorHeaderStyles.editorActions}>
            {transcription.trim() && (
              <TouchableOpacity 
                onPress={handleSave}
                style={[modernSaveButtonStyles.modernSaveButton, { backgroundColor: theme.accentColor }]}
              >
                <Text style={[modernSaveButtonStyles.modernSaveButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.voiceRecordingContent}>
          {/* Recording Status */}
          <View style={styles.recordingStatus}>
            {isRecording && (
              <Text style={[styles.recordingDuration, { color: theme.textColor }]}>
                {formatDuration(recordingDuration)}
              </Text>
            )}
            
            <Text style={[styles.recordingLabel, { color: theme.secondaryTextColor }]}>
              {isRecording ? 'Recording...' : isTranscribing ? (transcriptionStatus || 'Transcribing...') : 'Tap to record'}
            </Text>
          </View>

          {/* Large Recording Button */}
          <View style={styles.recordingButtonContainer}>
            <TouchableOpacity
              style={[
                styles.recordingButton,
                { 
                  backgroundColor: isRecording ? '#ff3b30' : theme.accentColor,
                  transform: [{ scale: isRecording ? 1.1 : 1.0 }]
                }
              ]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <MicrophoneIcon width={48} height={48} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Transcription Display */}
          {transcription && (
            <View style={styles.transcriptionContainer}>
              <Text style={[styles.transcriptionLabel, { color: theme.secondaryTextColor }]}>
                Transcription:
              </Text>
              <ScrollView style={styles.transcriptionScroll}>
                <Text style={[styles.transcriptionText, { color: theme.textColor }]}>
                  {transcription}
                </Text>
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Voice API Consent Modal */}
      <Modal
        visible={showConsentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}} // Prevent closing by back button
      >
        <View style={styles.consentModalOverlay}>
          <View style={[styles.consentModalContainer, { backgroundColor: theme.cardBackground }]}>
            {/* Header */}
            <View style={styles.consentModalHeader}>
              <Text style={[styles.consentModalTitle, { color: theme.textColor }]}>
                Voice Transcription Notice
              </Text>
            </View>

            {/* Content */}
            <View style={styles.consentModalContent}>
              <Text style={[styles.consentModalText, { color: theme.textColor }]}>
                This feature uses an external API service (Deepgram) to convert your voice recordings into text.
              </Text>
              
              <Text style={[styles.consentModalText, { color: theme.textColor }]}>
                Your audio will be processed by this third-party service to provide transcription. No audio is stored permanently by the service.
              </Text>

              <Text style={[styles.consentModalText, { color: theme.secondaryTextColor }]}>
                Do you agree to use this voice transcription feature?
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.consentModalActions}>
              <TouchableOpacity
                style={[styles.consentModalButton, styles.consentModalDeclineButton]}
                onPress={handleDeclineConsent}
              >
                <Text style={styles.consentModalDeclineText}>No, take me back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.consentModalButton, styles.consentModalAcceptButton, { backgroundColor: theme.accentColor }]}
                onPress={handleAcceptConsent}
              >
                <Text style={styles.consentModalAcceptText}>Yes, I agree</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  // Consent modal styles
  consentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  consentModalContainer: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  consentModalHeader: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  consentModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  consentModalContent: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  consentModalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'left',
  },
  consentModalActions: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    gap: 12,
  },
  consentModalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentModalDeclineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#999999',
  },
  consentModalAcceptButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  consentModalDeclineText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999999',
  },
  consentModalAcceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});