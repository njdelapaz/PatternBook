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
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio as AVAudio } from 'expo-av';
import { darkTheme, lightTheme } from '../utils/constants';

// Settings Screen Component
export default function SettingsScreen({ settings, onSettingsChange, isDarkMode, onBack, onClearAllData, onNavigateToAdminPanel, onImportTestNotes }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [isMicChecking, setIsMicChecking] = useState(false);
  const [micCheckResult, setMicCheckResult] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importCount, setImportCount] = useState('1');
  const [totalImported, setTotalImported] = useState(0);

  // Load total imported count on mount
  useEffect(() => {
    const loadImportedCount = async () => {
      try {
        const count = await AsyncStorage.getItem('@patternbook_imported_count');
        if (count) {
          setTotalImported(parseInt(count, 10));
        }
      } catch (error) {
        console.error('[SettingsScreen] Error loading imported count:', error);
      }
    };
    loadImportedCount();
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

  const confirmLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  const handleImportTestNotes = async () => {
    if (!onImportTestNotes) {
      Alert.alert('Error', 'Import function not available');
      return;
    }

    const count = parseInt(importCount, 10);

    if (isNaN(count) || count <= 0) {
      Alert.alert('Invalid Number', 'Please enter a valid number greater than 0');
      return;
    }

    if (count > 100) {
      Alert.alert('Too Many', 'Maximum 100 notes can be imported at once');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const result = await onImportTestNotes(count, totalImported, (current, total) => {
        setImportProgress({ current, total });
      });

      if (result.success) {
        // Update total imported count
        const newTotal = totalImported + result.count;
        setTotalImported(newTotal);
        await AsyncStorage.setItem('@patternbook_imported_count', newTotal.toString());

      } else {
        Alert.alert('Error', `Failed to import notes: ${result.error}`);
      }
    } catch (error) {
      console.error('[SettingsScreen] Import error:', error);
      Alert.alert('Error', 'Failed to import test notes');
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={[styles.settingsHeader, { borderBottomColor: theme.borderColor }]}>
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
                style={[styles.toggle, { backgroundColor: settings.notifications.weeklyLetter ? '#7FB069' : '#3a3a3a' }]}
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
                style={[styles.toggle, { backgroundColor: settings.notifications.dailyReminder ? '#7FB069' : '#3a3a3a' }]}
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

          {/* Account Section */}
          <View style={[styles.settingsCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.textColor }]}>Account</Text>
            <Text style={[styles.settingsLabel, { color: theme.secondaryTextColor, marginBottom: 8 }]}>
              Log out of your account and return to the login screen.
            </Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.accentColor }]}
              onPress={confirmLogout}
            >
              <Text style={styles.testButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>

          {/* Data Management Section */}
          <View style={[styles.settingsCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.textColor }]}>Data Management</Text>

            <Text style={[styles.settingsLabel, { color: theme.secondaryTextColor, marginBottom: 12 }]}>
              Import test notes for RAG testing and development
            </Text>

            {/* Total imported counter */}
            <Text style={[styles.settingsLabel, { color: theme.accentColor, marginBottom: 12, fontSize: 14 }]}>
              Total imported: {totalImported} notes
            </Text>

            {/* Inline import controls */}
            <View style={styles.importControlsRow}>
              <TextInput
                style={[styles.importCountInput, {
                  color: theme.textColor,
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.borderColor
                }]}
                value={importCount}
                onChangeText={setImportCount}
                placeholder="Count"
                placeholderTextColor={theme.placeholderColor}
                keyboardType="number-pad"
                maxLength={3}
                editable={!isImporting}
              />
              <TouchableOpacity
                style={[styles.importButton, { backgroundColor: isImporting ? theme.borderColor : '#FF9500' }]}
                onPress={handleImportTestNotes}
                disabled={isImporting}
              >
                {isImporting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={styles.testButtonText}>
                      {importProgress.current}/{importProgress.total}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.testButtonText}>📥 Import Notes</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.settingsLabel, { color: theme.secondaryTextColor, marginBottom: 8 }]}>
              View RAG operations, chat queries, and system logs in the admin panel.
            </Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.accentColor, marginBottom: 12 }]}
              onPress={onNavigateToAdminPanel}
            >
              <Text style={styles.testButtonText}>🔧 Admin Panel</Text>
            </TouchableOpacity>
            <Text style={[styles.settingsLabel, { color: theme.secondaryTextColor, marginBottom: 8 }]}>
              Clear all app data including notes, settings, and cached files. This action cannot be undone.
            </Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#ff3b30' }]}
              onPress={confirmClearAllData}
            >
              <Text style={styles.testButtonText}>Clear All Data</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  noteTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  importControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  importCountInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
    fontWeight: '600',
  },
  importButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});