import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Pressable 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '../utils/constants';
import { formatTimestamp, formatDateOnly } from '../utils/components';

// Import Carbon icons
import SearchIcon from '../assets/carbon-icons/carbon--search.svg';
import ChatIcon from '../assets/carbon-icons/carbon--chat.svg';
import MicrophoneIcon from '../assets/carbon-icons/carbon--microphone-filled.svg';
import PenIcon from '../assets/carbon-icons/carbon--pen.svg';

// Main Screen Component
export default function MainScreen({ 
  notes, 
  onNotePress, 
  onCreateNote, 
  onDeleteNote, 
  onTogglePin, 
  isDarkMode, 
  onToggleTheme, 
  searchQuery, 
  onSearchChange, 
  showSearch, 
  onToggleSearch, 
  sortBy, 
  onSortChange, 
  showThreeDotsMenu, 
  onToggleThreeDotsMenu, 
  onNavigateToSettings, 
  onNavigateToRecentlyDeleted, 
  onNavigateToVoiceRecord, 
  onNavigateToTextEditor 
}) {
  const insets = useSafeAreaInsets();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [noteToPin, setNoteToPin] = useState(null);

  const handleLongPress = (note) => {
    setNoteToDelete(note);
    setNoteToPin(note);
    setDeleteModalVisible(true);
  };

  const handleDelete = () => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete.id);
      setDeleteModalVisible(false);
      setNoteToDelete(null);
      setNoteToPin(null);
    }
  };

  const handleTogglePin = () => {
    if (noteToPin) {
      onTogglePin(noteToPin.id);
      setDeleteModalVisible(false);
      setNoteToDelete(null);
      setNoteToPin(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setNoteToDelete(null);
    setNoteToPin(null);
  };

  // Filter and sort notes
  const filteredAndSortedNotes = notes
    .filter(note => 
      searchQuery === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return b.updatedAt - a.updatedAt;
        case 'old-to-new':
          return a.createdAt - b.createdAt; // Use createdAt for chronological order
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

  // Group notes by date sections
  const groupNotesByDate = (notes) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const sections = {
      pinned: [],
      today: [],
      yesterday: [],
      past: []
    };
    
    notes.forEach(note => {
      if (note.pinned) {
        sections.pinned.push(note);
      } else {
        // Use different date based on sort mode:
        // - "old-to-new" (Oldest First): group by creation date
        // - "updated" (Recently Updated): group by update date
        const dateToUse = sortBy === 'old-to-new' ? note.createdAt : note.updatedAt;
        const noteDate = new Date(dateToUse);
        const noteDateOnly = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());
        
        if (noteDateOnly.getTime() === today.getTime()) {
          sections.today.push(note);
        } else if (noteDateOnly.getTime() === yesterday.getTime()) {
          sections.yesterday.push(note);
        } else {
          sections.past.push(note);
        }
      }
    });
    
    return sections;
  };

  const noteSections = groupNotesByDate(filteredAndSortedNotes);
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Main Content with proper top spacing */}
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: 20 }}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { color: theme.textColor }]}>Notes</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={onToggleSearch} style={styles.searchToggle}>
                <SearchIcon width={20} height={20} color={theme.textColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onToggleThreeDotsMenu} style={styles.threeDotsButton}>
                <Text style={[styles.threeDotsText, { color: theme.textColor }]}>⋯</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onToggleTheme} style={styles.themeToggle}>
                <Text style={[styles.themeToggleText, { color: theme.textColor }]}>
                  {isDarkMode ? '☀️' : '🌙'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          {showSearch && (
            <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
              <TextInput
                style={[styles.searchInput, { color: theme.textColor }]}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search notes..."
                placeholderTextColor={theme.placeholderColor}
                autoFocus
              />
            </View>
          )}

          {/* Sort Options */}
          <View style={styles.sortContainer}>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'updated' && styles.sortButtonActive]}
              onPress={() => onSortChange('updated')}
            >
              <Text style={[styles.sortText, { color: sortBy === 'updated' ? theme.accentColor : theme.secondaryTextColor }]}>
                Recently Updated
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'old-to-new' && styles.sortButtonActive]}
              onPress={() => onSortChange('old-to-new')}
            >
              <Text style={[styles.sortText, { color: sortBy === 'old-to-new' ? theme.accentColor : theme.secondaryTextColor }]}>
                Oldest First
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes List with Date Sections */}
          <View style={styles.notesList}>
            {/* Pinned Section */}
            {noteSections.pinned.length > 0 && (
              <View style={styles.dateSection}>
                <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Pinned</Text>
                {noteSections.pinned.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => onNotePress(note)}
                    onLongPress={() => handleLongPress(note)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>
                      {sortBy === 'old-to-new' ? `Created ${formatDateOnly(note.createdAt)}` : `Updated ${formatDateOnly(note.updatedAt)}`}
                    </Text>
                    <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={3}>
                      {note.aiSummary || note.summary || (note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Today Section */}
            {noteSections.today.length > 0 && (
              <View style={styles.dateSection}>
                <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Today</Text>
                {noteSections.today.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => onNotePress(note)}
                    onLongPress={() => handleLongPress(note)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>
                      {sortBy === 'old-to-new' ? `Created ${formatDateOnly(note.createdAt)}` : `Updated ${formatDateOnly(note.updatedAt)}`}
                    </Text>
                    <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={3}>
                      {note.aiSummary || note.summary || (note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Yesterday Section */}
            {noteSections.yesterday.length > 0 && (
              <View style={styles.dateSection}>
                <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Yesterday</Text>
                {noteSections.yesterday.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => onNotePress(note)}
                    onLongPress={() => handleLongPress(note)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>
                      {sortBy === 'old-to-new' ? `Created ${formatDateOnly(note.createdAt)}` : `Updated ${formatDateOnly(note.updatedAt)}`}
                    </Text>
                    <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={3}>
                      {note.aiSummary || note.summary || (note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Past Section */}
            {noteSections.past.length > 0 && (
              <View style={styles.dateSection}>
                <Text style={[styles.sectionHeader, { color: theme.textColor }]}>Past</Text>
                {noteSections.past.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => onNotePress(note)}
                    onLongPress={() => handleLongPress(note)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.noteTime, { color: theme.secondaryTextColor }]}>
                      {sortBy === 'old-to-new' ? `Created ${formatDateOnly(note.createdAt)}` : `Updated ${formatDateOnly(note.updatedAt)}`}
                    </Text>
                    <Text style={[styles.noteText, { color: theme.textColor }]}>{note.title}</Text>
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={3}>
                      {note.aiSummary || note.summary || (note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.navBackground, borderTopColor: theme.borderColor }]}>
        <TouchableOpacity style={styles.navButton} onPress={onToggleSearch}>
          <SearchIcon width={24} height={24} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <ChatIcon width={24} height={24} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onNavigateToVoiceRecord}>
          <MicrophoneIcon width={24} height={24} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onNavigateToTextEditor}>
          <PenIcon width={24} height={24} color={theme.iconColor} />
        </TouchableOpacity>
      </View>

      {/* Three Dots Menu */}
      {showThreeDotsMenu && (
        <Modal
          visible={showThreeDotsMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={onToggleThreeDotsMenu}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={onToggleThreeDotsMenu}
          >
            <View style={[styles.threeDotsMenu, { backgroundColor: theme.cardBackground }]}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onToggleThreeDotsMenu();
                  onNavigateToRecentlyDeleted();
                }}
              >
                <Text style={[styles.menuItemText, { color: theme.textColor }]}>Recently deleted</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onToggleThreeDotsMenu();
                  onNavigateToSettings();
                }}
              >
                <Text style={[styles.menuItemText, { color: theme.textColor }]}>Settings</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Delete Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCancelDelete}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleTogglePin}
            >
              <Text style={[styles.actionIcon, { color: theme.textColor }]}>
                {noteToPin?.pinned ? '📌' : '📍'}
              </Text>
              <Text style={[styles.actionText, { color: theme.textColor }]}>
                {noteToPin?.pinned ? 'Unpin note' : 'Pin note'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
              <Text style={styles.deleteText}>Delete note</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchToggle: {
    padding: 8,
  },
  themeToggle: {
    padding: 8,
  },
  themeToggleText: {
    fontSize: 20,
  },
  threeDotsButton: {
    padding: 8,
    marginRight: 8,
  },
  threeDotsText: {
    fontSize: 20,
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: 24,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchInput: {
    fontSize: 16,
    padding: 0,
    fontWeight: '400',
  },
  sortContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  sortButtonActive: {
    // No background for cleaner look
  },
  sortText: {
    fontSize: 15,
    fontWeight: '500',
  },
  notesList: {
    marginTop: 10,
  },
  dateSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 24,
    letterSpacing: -0.4,
  },
  noteCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  noteTime: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
    opacity: 0.6,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.65,
    fontWeight: '400',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderTopWidth: 0.33,
  },
  navButton: {
    padding: 16,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  threeDotsMenu: {
    position: 'absolute',
    top: 100,
    right: 20,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  deleteIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  deleteText: {
    fontSize: 18,
    color: '#ff3b30',
    fontWeight: '600',
  },
});