import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '../utils/constants';
import { formatTimestamp } from '../utils/components';

// Recently Deleted Screen Component
export default function RecentlyDeletedScreen({ deletedNotes, onRestoreNote, onPermanentlyDeleteNote, isDarkMode, onBack }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={[styles.settingsHeader, { borderBottomColor: theme.borderColor }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.accentColor }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.settingsTitle, { color: theme.textColor }]}>Recently Deleted</Text>
        </View>

        <ScrollView style={styles.settingsContent}>
          {deletedNotes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: theme.secondaryTextColor }]}>
                No deleted notes
              </Text>
            </View>
          ) : (
            deletedNotes.map((note) => (
              <View key={note.id} style={[styles.settingsCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>
                  Deleted {formatTimestamp(note.deletedAt)}
                </Text>
                <View style={styles.noteActions}>
                  <TouchableOpacity
                    style={[styles.restoreButton, { backgroundColor: theme.accentColor }]}
                    onPress={() => onRestoreNote(note.id)}
                  >
                    <Text style={styles.restoreButtonText}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: '#ff3b30' }]}
                    onPress={() => onPermanentlyDeleteNote(note.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete Forever</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
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
  noteText: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 8,
    fontWeight: '600',
  },
  noteTime: {
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '500',
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
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});