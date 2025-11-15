import React, { useState, useRef } from 'react';
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
import * as FileSystem from 'expo-file-system/legacy';
import { Audio as AVAudio } from 'expo-av';
import { darkTheme, lightTheme } from '../utils/constants';
import { transcribeAudioWithDeepgram, isDeepgramConfigured } from '../utils/deepgram';
import { hasVoiceApiConsent, setVoiceApiConsent } from '../utils/storage';

// Import Carbon icons
import MicrophoneIcon from '../assets/carbon-icons/carbon--microphone-filled.svg';

// Voice Recording Screen Component
export default function VoiceRecordingScreen({ isDarkMode, onBack, onSave }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Check Deepgram configuration and consent on component mount
  React.useEffect(() => {
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

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const recordingRef = useRef(null);
  const isStartingRef = useRef(false);
  const durationTimerRef = useRef(null);

  // Voice Recording: Start recording
  const startRecording = async () => {
    try {
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      
      if (Platform.OS === 'web') {
        alert('Voice recording is not supported on web in this MVP. Use mobile.');
        return;
      }

      const perm = await AVAudio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        alert('Microphone permission is required to record.');
        return;
      }

      await AVAudio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {}
        recordingRef.current = null;
      }

      let recording = new AVAudio.Recording();
      
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
      });
      
      try {
        await recording.prepareToRecordAsync(recordingOptions);
        await recording.startAsync();
      } catch (err) {
        recording = new AVAudio.Recording();
        await recording.prepareToRecordAsync(AVAudio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
      }
      
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (e) {
      console.error('Failed to start recording', e);
      alert('Failed to start recording: ' + e.message);
    } finally {
      isStartingRef.current = false;
    }
  };

  // Voice Recording: Stop and transcribe
  const stopAndTranscribe = async () => {
    try {
      setIsRecording(false);
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      if (!recordingRef.current) {
        console.log('No recording to stop');
        return;
      }

      const status = await recordingRef.current.getStatusAsync();
      if (!status.canRecord) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        alert('Failed to save recording');
        return;
      }

      setIsTranscribing(true);
      setTranscriptionStatus('Uploading audio...');
      await transcribeWithDeepgram(uri);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert(
        'Recording Error',
        'Error processing recording: ' + error.message,
        [{ text: 'OK' }]
      );
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus('');
    }
  };

  // Real transcription using Deepgram API
  const transcribeWithDeepgram = async (audioUri) => {
    try {
      // Check if Deepgram is configured
      if (!isDeepgramConfigured()) {
        Alert.alert(
          'Configuration Error',
          'Deepgram API key is not configured. Please check your .env file.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Starting transcription for audio file:', audioUri);
      
      setTranscriptionStatus('Processing with Deepgram...');
      
      // Use the Deepgram API to transcribe the audio
      const transcript = await transcribeAudioWithDeepgram(audioUri);
      
      console.log('Transcription completed successfully');
      setTranscription(transcript);
      setTranscriptionStatus('');
      
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscriptionStatus('');
      Alert.alert(
        'Transcription Failed',
        error.message || 'An error occurred during transcription. Please try again.',
        [{ text: 'OK' }]
      );
    }
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
        <View style={[styles.editorHeader, { borderBottomColor: theme.borderColor }]}>
          <TouchableOpacity onPress={onBack} style={styles.todayButton}>
            <Text style={[styles.todayButtonText, { color: theme.accentColor }]}>← Back</Text>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={[styles.titleText, { color: theme.textColor }]}>Voice Recording</Text>
          </View>
          
          <View style={styles.editorActions}>
            {transcription.trim() && (
              <TouchableOpacity 
                onPress={handleSave}
                style={[styles.modernSaveButton, { backgroundColor: theme.accentColor }]}
              >
                <Text style={[styles.modernSaveButtonText, { color: '#fff' }]}>Save</Text>
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
              onPress={isRecording ? stopAndTranscribe : startRecording}
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
  editorActions: {
    flexDirection: 'row',
    gap: 8,
    minWidth: 80, // Consistent width for proper centering
    justifyContent: 'flex-end',
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