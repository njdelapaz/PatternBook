import { useState, useRef, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { Audio as AVAudio } from 'expo-av';
import { transcribeAudioWithDeepgram, isDeepgramConfigured } from '../utils/deepgram';

/**
 * Custom hook for voice recording and transcription
 * Unifies recording logic between editor and voice screen
 */
export function useRecording({ onTranscriptionComplete, onError }) {
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

  // Get recording options for platform
  const getRecordingOptions = () => {
    return Platform.select({
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
  };

  // Start recording
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
      const recordingOptions = getRecordingOptions();
      
      console.log('Using recording options for platform:', Platform.OS, recordingOptions);
      
      try {
        await recording.prepareToRecordAsync(recordingOptions);
        await recording.startAsync();
        console.log('Recording started successfully with options:', recordingOptions);
      } catch (err) {
        console.log('First recording attempt failed, trying HIGH_QUALITY fallback...', err.message);
        // Fallback to HIGH_QUALITY preset if custom options fail
        try {
          await AVAudio.setAudioModeAsync({ 
            allowsRecordingIOS: true, 
            playsInSilentModeIOS: true, 
            staysActiveInBackground: false 
          });
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
      const errorMsg = 'Failed to start recording: ' + e.message;
      if (onError) {
        onError(errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  // Stop recording and transcribe
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
        const errorMsg = 'Deepgram API key is not configured. Please check your .env file.';
        if (onError) {
          onError(errorMsg);
        } else {
          Alert.alert('Configuration Error', errorMsg, [{ text: 'OK' }]);
        }
        setIsTranscribing(false);
        return;
      }
      
      try {
        const transcription = await transcribeAudioWithDeepgram(uri);
        if (transcription && onTranscriptionComplete) {
          onTranscriptionComplete(transcription);
        }
      } catch (error) {
        console.error('Transcription error:', error);
        const errorMsg = error.message || 'Failed to transcribe recording';
        if (onError) {
          onError(errorMsg);
        } else {
          alert(errorMsg);
        }
      } finally {
        setIsTranscribing(false);
      }
    } catch (e) {
      console.error('Failed to stop or transcribe', e);
      const errorMsg = 'Failed to transcribe recording: ' + e.message;
      if (onError) {
        onError(errorMsg);
      } else {
        alert(errorMsg);
      }
      setIsTranscribing(false);
    }
  };

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopAndTranscribe,
  };
}





