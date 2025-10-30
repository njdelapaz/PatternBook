import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio as AVAudio } from 'expo-av';
import { DEEPGRAM_API_KEY } from '@env';
import { darkTheme, lightTheme } from '../utils/constants';

// Import Carbon icons
import MicrophoneIcon from '../assets/carbon-icons/carbon--microphone-filled.svg';

// Stubbed transcription data for demo
const DEMO_TRANSCRIPTIONS = [
  "I had the most interesting dream last night about wandering through an endless library. Each book seemed to contain memories from my life, but they were all slightly different from how I remember them. It made me wonder how much of what we remember is actually real versus what we've constructed over time.",
  "Today I realized something important about my relationship with productivity. I've been measuring my worth by how much I accomplish, but that's not sustainable. Maybe the goal isn't to do more, but to be more intentional about what I choose to do. Quality over quantity, as they say."
];

let transcriptionCounter = 0;

// Voice Recording Screen Component
export default function VoiceRecordingScreen({ isDarkMode, onBack, onSave }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
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
      await transcribeWithDeepgram(uri);
    } catch (error) {
      console.error('Error stopping recording:', error);
      alert('Error processing recording: ' + error.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Stubbed transcription for demo
  const transcribeWithDeepgram = async (audioUri) => {
    try {
      // Simulate transcription delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get the appropriate transcription based on counter
      const transcript = transcriptionCounter === 0
        ? DEMO_TRANSCRIPTIONS[0]
        : DEMO_TRANSCRIPTIONS[1];

      // Increment counter (will stay at 1 for all subsequent recordings)
      if (transcriptionCounter === 0) {
        transcriptionCounter = 1;
      }

      setTranscription(transcript);
    } catch (error) {
      console.error('Demo transcription error:', error);
      alert('Transcription failed: ' + error.message);
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
              {isRecording ? 'Recording...' : isTranscribing ? 'Transcribing...' : 'Tap to record'}
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
});