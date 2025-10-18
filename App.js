import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Main Content */}
      <ScrollView style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today</Text>
          <View style={styles.sortButton}>
            <Text style={styles.sortText}>⇅ Updated</Text>
          </View>
        </View>

        {/* Notes List */}
        <View style={styles.notesList}>
          <View style={styles.noteCard}>
            <Text style={styles.noteTime}>Today 5:21 PM</Text>
            <Text style={styles.noteText}>Example note text</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navIcon}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navIcon}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navIcon}>🎤</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navIcon}>✏️</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sortText: {
    fontSize: 16,
    color: '#999999',
  },
  notesList: {
    marginTop: 10,
  },
  noteCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  noteTime: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 24,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  navButton: {
    padding: 8,
  },
  navIcon: {
    fontSize: 24,
  },
});
