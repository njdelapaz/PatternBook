import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Platform,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio as AVAudio } from 'expo-av';
import { darkTheme, lightTheme, Typography, Shadows } from '../utils/constants';
import { createFadeInAnimation, createPressAnimation } from '../utils/animations';

// Animated Button Component
const AnimatedButton = ({ children, onPress, style, ...props }) => {
  const pressAnimation = createPressAnimation();
  
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: pressAnimation.animatedValue }]
        }
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressAnimation.pressIn}
        onPressOut={pressAnimation.pressOut}
        activeOpacity={0.7}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Settings Screen Component
export default function SettingsScreen({ settings, onSettingsChange, isDarkMode, onBack, onClearAllData }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [isMicChecking, setIsMicChecking] = useState(false);
  const [micCheckResult, setMicCheckResult] = useState('');

  // Animation setup
  const headerAnimation = createFadeInAnimation(0);
  const contentAnimation = createFadeInAnimation(100);
  
  // Start animations on mount
  useEffect(() => {
    headerAnimation.startAnimation();
    contentAnimation.startAnimation();
  }, []);

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
      
      // Use the same recording configuration as the main recording function
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
      
      try {
        await recording.prepareToRecordAsync(recordingOptions);
      } catch (err) {
        // Fallback to HIGH_QUALITY preset if custom options fail
        await recording.prepareToRecordAsync(AVAudio.RecordingOptionsPresets.HIGH_QUALITY);
      }
      
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

  const handleClearAllData = async () => {
    try {
      await AsyncStorage.clear();
      alert('All data has been cleared successfully.');
      if (onClearAllData) {
        onClearAllData(); // Notify parent to refresh the app state
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data: ' + error.message);
    }
  };

  const confirmClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your notes, settings, and app data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All Data', style: 'destructive', onPress: handleClearAllData }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <Animated.View 
          style={[
            styles.settingsHeader, 
            { borderBottomColor: theme.borderColor },
            {
              opacity: headerAnimation.animatedValue,
              transform: [{
                translateY: headerAnimation.animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                })
              }]
            }
          ]}
        >
          <AnimatedButton onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.accentColor }]}>← Back</Text>
          </AnimatedButton>
          <Text style={[styles.settingsTitle, { color: theme.textColor }]}>Settings</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.settingsContent,
            {
              opacity: contentAnimation.animatedValue,
              transform: [{
                translateY: contentAnimation.animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })
              }]
            }
          ]}
        >
          <ScrollView>
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
            <AnimatedButton
              style={[styles.testButton, { backgroundColor: theme.accentColor }]}
              onPress={handleMicPreflight}
              disabled={isMicChecking}
            >
              {isMicChecking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.testButtonText}>Run mic preflight</Text>
              )}
            </AnimatedButton>
            {micCheckResult ? (
              <Text style={[styles.noteTime, { color: theme.secondaryTextColor, marginTop: 8 }]}>{micCheckResult}</Text>
            ) : null}
          </View>

          {/* Data Management Section */}
          <View style={[styles.settingsCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.textColor }]}>Data Management</Text>
            <Text style={[styles.settingsLabel, { color: theme.secondaryTextColor, marginBottom: 8 }]}>
              Clear all app data including notes, settings, and cached files. This action cannot be undone.
            </Text>
            <AnimatedButton
              style={[styles.testButton, { backgroundColor: '#ff3b30' }]}
              onPress={confirmClearAllData}
            >
              <Text style={styles.testButtonText}>Clear All Data</Text>
            </AnimatedButton>
          </View>
        </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsTitle: {
    ...Typography.h2,
    marginLeft: 16,
  },
  settingsContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  settingsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Shadows.card,
  },
  settingsSectionTitle: {
    ...Typography.h3,
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsLabel: {
    ...Typography.bodySmall,
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
  testButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    ...Shadows.button,
  },
  testButtonText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  noteTime: {
    ...Typography.captionSmall,
    fontWeight: '500',
  },
});