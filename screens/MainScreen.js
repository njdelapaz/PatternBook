import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Image,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '../utils/constants';
import { formatTimestamp, formatDateOnly } from '../utils/components';
import { generateAISuggestions, clearSuggestionsCache } from '../utils/suggestions';
import { useDeviceType } from '../hooks/useDeviceType';

// Import Carbon icons
import SearchIcon from '../assets/carbon-icons/carbon--search.svg';
import ChatIcon from '../assets/carbon-icons/carbon--chat.svg';
import MicrophoneIcon from '../assets/carbon-icons/carbon--microphone-filled.svg';
import PenIcon from '../assets/carbon-icons/carbon--pen.svg';

// Helper function to get first two lines of content
function getPreviewText(content) {
  if (!content) return '';
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  return lines.slice(0, 2).join('\n');
}

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
  onNavigateToTextEditor,
  onNavigateToGlobalChat 
}) {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useDeviceType();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [noteToPin, setNoteToPin] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  
  // AI Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Generate AI suggestions when notes change
  useEffect(() => {
    let mounted = true;

    const loadSuggestions = async () => {
      if (notes.length === 0) {
        setSuggestions([]);
        return;
      }

      setSuggestionsLoading(true);
      try {
        const aiSuggestions = await generateAISuggestions(notes);
        if (mounted) {
          setSuggestions(aiSuggestions);
        }
      } catch (error) {
        console.error('[MainScreen] Failed to load suggestions:', error);
        if (mounted) {
          setSuggestions([]);
        }
      } finally {
        if (mounted) {
          setSuggestionsLoading(false);
        }
      }
    };

    loadSuggestions();

    return () => {
      mounted = false;
    };
  }, [notes.length]); // Re-generate when note count changes

  // Refresh suggestions manually
  const handleRefreshSuggestions = async () => {
    await clearSuggestionsCache();
    setSuggestionsLoading(true);
    try {
      const aiSuggestions = await generateAISuggestions(notes, { forceRefresh: true });
      setSuggestions(aiSuggestions);
    } catch (error) {
      console.error('[MainScreen] Failed to refresh suggestions:', error);
    } finally {
      setSuggestionsLoading(false);
    }
  };
  
  // Add extra horizontal padding in landscape to avoid notch
  const horizontalPadding = isLandscape ? Math.max(insets.left, insets.right, 20) : 20;

  const handleNavigateLeft = () => {
    if (currentSuggestionIndex > 0) {
      setCurrentSuggestionIndex(currentSuggestionIndex - 1);
      setSelectedSuggestion(suggestions[currentSuggestionIndex - 1]);
    }
  };

  const handleNavigateRight = () => {
    if (currentSuggestionIndex < suggestions.length - 1) {
      setCurrentSuggestionIndex(currentSuggestionIndex + 1);
      setSelectedSuggestion(suggestions[currentSuggestionIndex + 1]);
    }
  };

  const handleOpenSuggestion = (suggestion, index) => {
    setSelectedSuggestion(suggestion);
    setCurrentSuggestionIndex(index);
  };

  const handleCloseSuggestion = () => {
    setSelectedSuggestion(null);
    setCurrentSuggestionIndex(0);
  };

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
        <ScrollView style={[styles.content, { paddingHorizontal: horizontalPadding }]} contentContainerStyle={{ paddingTop: 20 }}>
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
          {showSearch && notes.length > 0 && (
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

          {/* Sort Options - Only show when there are notes */}
          {notes.length > 0 && (
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
          )}

          {/* AI Suggestions Bar */}
          {(suggestionsLoading || suggestions.length > 0) && (
            <View style={styles.suggestionsWrapper}>
              <View style={styles.suggestionsHeader}>
                <Text style={[styles.suggestionsHeaderText, { color: theme.secondaryTextColor }]}>
                  AI Suggestions
                </Text>
                {!suggestionsLoading && suggestions.length > 0 && (
                  <TouchableOpacity onPress={handleRefreshSuggestions} style={styles.refreshButton}>
                    <Text style={[styles.refreshButtonText, { color: theme.accentColor }]}>↻ Refresh</Text>
                  </TouchableOpacity>
                )}
              </View>
              {suggestionsLoading ? (
                <View style={[styles.suggestionsLoading, { backgroundColor: theme.cardBackground }]}>
                  <ActivityIndicator color={theme.accentColor} />
                  <Text style={[styles.suggestionsLoadingText, { color: theme.secondaryTextColor }]}>
                    Generating suggestions...
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestionsContainer}
                  contentContainerStyle={styles.suggestionsContent}
                >
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.suggestionCard, { backgroundColor: theme.cardBackground }]}
                      onPress={() => handleOpenSuggestion(suggestion, index)}
                      activeOpacity={0.8}
                    >
                  {suggestion.type === 'art' && (suggestion.image || suggestion.imageUri) && (
                    <Image
                      source={suggestion.image || { uri: suggestion.imageUri }}
                      style={styles.suggestionImage}
                      resizeMode="cover"
                    />
                  )}
                  {(suggestion.type === 'quote' || suggestion.type === 'insight') && (
                    <View style={styles.suggestionQuoteContent}>
                      <Text style={[styles.suggestionQuoteText, { color: theme.textColor }]} numberOfLines={3}>
                        {suggestion.title}
                      </Text>
                      {suggestion.author && (
                        <Text style={[styles.suggestionQuoteAuthor, { color: theme.secondaryTextColor }]}>
                          {suggestion.author}
                        </Text>
                      )}
                    </View>
                  )}
                  {suggestion.type === 'art' && !suggestion.image && !suggestion.imageUri && (
                    <View style={styles.suggestionQuoteContent}>
                      <View style={styles.suggestionTypeIndicator}>
                        <Text style={[styles.suggestionTypeText, { color: theme.accentColor }]}>🎨</Text>
                      </View>
                      <Text style={[styles.suggestionQuoteText, { color: theme.textColor }]} numberOfLines={3}>
                        {suggestion.title}
                      </Text>
                      {suggestion.author && (
                        <Text style={[styles.suggestionQuoteAuthor, { color: theme.secondaryTextColor }]}>
                          {suggestion.author}
                        </Text>
                      )}
                    </View>
                  )}
                  <View style={styles.suggestionBadge}>
                    <Text style={styles.suggestionBadgeText}>● {suggestion.badge}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
              )}
            </View>
          )}

          {/* Empty State or Notes List */}
          {notes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateTitle, { color: theme.textColor }]}>Brain dump about anything</Text>
              <View style={[styles.emptyStateCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.emptyStateCardTitle, { color: theme.textColor }]}>Note</Text>
                <Text style={[styles.emptyStateCardText, { color: theme.secondaryTextColor }]}>
                  I want to spend more time...
                </Text>
              </View>
              <View style={styles.emptyStateButtons}>
                <TouchableOpacity
                  style={[styles.emptyStateButton, styles.emptyStateDictateButton, { backgroundColor: theme.accentColor }]}
                  onPress={onNavigateToVoiceRecord}
                >
                  <MicrophoneIcon width={32} height={32} color="#000000" />
                  <Text style={styles.emptyStateButtonText}>Dictate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emptyStateButton, { backgroundColor: theme.cardBackground }]}
                  onPress={onNavigateToTextEditor}
                >
                  <PenIcon width={32} height={32} color={theme.textColor} />
                  <Text style={[styles.emptyStateButtonText, { color: theme.textColor }]}>Type</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
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
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={2}>
                      {getPreviewText(note.content)}
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
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={2}>
                      {getPreviewText(note.content)}
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
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={2}>
                      {getPreviewText(note.content)}
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
                    <Text style={[styles.notePreview, { color: theme.secondaryTextColor, fontFamily: 'Times New Roman' }]} numberOfLines={2}>
                      {getPreviewText(note.content)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.navBackground, borderTopColor: theme.borderColor }]}>
        <TouchableOpacity style={styles.navButton} onPress={onToggleSearch}>
          <SearchIcon width={24} height={24} color={theme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onNavigateToGlobalChat}>
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
          supportedOrientations={['portrait', 'landscape']}
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

      {/* Suggestion Detail Modal */}
      <Modal
        visible={selectedSuggestion !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseSuggestion}
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.suggestionModalContainer}>
          {/* Close button at top */}
          <TouchableOpacity
            style={styles.suggestionModalClose}
            onPress={handleCloseSuggestion}
          >
            <Text style={styles.suggestionModalCloseText}>✕</Text>
          </TouchableOpacity>

          {/* Tab indicators */}
          <View style={styles.suggestionModalTabs}>
            {suggestions.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.suggestionModalTab,
                  index === currentSuggestionIndex && styles.suggestionModalTabActive
                ]}
              />
            ))}
          </View>

          <ScrollView style={styles.suggestionModalScroll} contentContainerStyle={styles.suggestionModalScrollContent}>
            {selectedSuggestion?.type === 'art' && (
              <>
                {(selectedSuggestion.image || selectedSuggestion.imageUri) && (
                  <Image
                    source={selectedSuggestion.image || { uri: selectedSuggestion.imageUri }}
                    style={styles.suggestionModalImage}
                    resizeMode="contain"
                  />
                )}
                <View style={styles.suggestionModalInfo}>
                  <Text style={styles.suggestionModalTitle}>
                    {selectedSuggestion.title}
                    {selectedSuggestion.subtitle && (
                      <Text style={styles.suggestionModalSubtitle}>, {selectedSuggestion.subtitle}</Text>
                    )}
                  </Text>
                  {selectedSuggestion.author && (
                    <Text style={styles.suggestionModalArtist}>{selectedSuggestion.author}</Text>
                  )}
                  {selectedSuggestion.museum && (
                    <Text style={styles.suggestionModalMuseum}>🏛 {selectedSuggestion.museum}</Text>
                  )}
                  <View style={styles.suggestionModalBadge}>
                    <Text style={styles.suggestionModalBadgeText}>● {selectedSuggestion.badge}</Text>
                  </View>
                  <Text style={styles.suggestionModalDescription}>{selectedSuggestion.description}</Text>
                </View>
              </>
            )}

            {(selectedSuggestion?.type === 'quote' || selectedSuggestion?.type === 'insight') && (
              <View style={styles.suggestionModalQuoteContainer}>
                <View style={styles.suggestionModalQuote}>
                  <Text style={styles.suggestionModalQuoteText}>{selectedSuggestion.title}</Text>
                  {selectedSuggestion.author && (
                    <Text style={styles.suggestionModalQuoteAuthor}>—{selectedSuggestion.author}</Text>
                  )}
                  {selectedSuggestion.subtitle && !selectedSuggestion.author && (
                    <Text style={styles.suggestionModalQuoteAuthor}>{selectedSuggestion.subtitle}</Text>
                  )}
                  <View style={styles.suggestionModalBadge}>
                    <Text style={styles.suggestionModalBadgeText}>● {selectedSuggestion.badge}</Text>
                  </View>
                  <Text style={styles.suggestionModalDescription}>{selectedSuggestion.description}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom navigation */}
          <View style={styles.suggestionModalNav}>
            <TouchableOpacity style={styles.suggestionModalNavButton}>
              <Text style={styles.suggestionModalNavIcon}>💬</Text>
              <Text style={styles.suggestionModalNavText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestionModalNavButton}>
              <Text style={styles.suggestionModalNavIcon}>⋯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.suggestionModalNavButton, currentSuggestionIndex === 0 && styles.suggestionModalNavButtonDisabled]}
              onPress={handleNavigateLeft}
              disabled={currentSuggestionIndex === 0}
            >
              <Text style={[styles.suggestionModalNavIcon, currentSuggestionIndex === 0 && styles.suggestionModalNavIconDisabled]}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.suggestionModalNavButton, currentSuggestionIndex === suggestions.length - 1 && styles.suggestionModalNavButtonDisabled]}
              onPress={handleNavigateRight}
              disabled={currentSuggestionIndex === suggestions.length - 1}
            >
              <Text style={[styles.suggestionModalNavIcon, currentSuggestionIndex === suggestions.length - 1 && styles.suggestionModalNavIconDisabled]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
        supportedOrientations={['portrait', 'landscape']}
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

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '400',
    marginBottom: 40,
    textAlign: 'center',
  },
  emptyStateCard: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 24,
    marginBottom: 50,
    minHeight: 160,
  },
  emptyStateCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyStateCardText: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyStateButtons: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  emptyStateButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateDictateButton: {
    // Dictate button uses accent color from theme
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
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

  // Suggestions Bar
  suggestionsWrapper: {
    marginBottom: 16,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  suggestionsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionsLoading: {
    height: 120,
    borderRadius: 12,
    marginHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  suggestionsLoadingText: {
    fontSize: 14,
  },
  suggestionsContainer: {
    marginHorizontal: -20, // Full width bleed
  },
  suggestionsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  suggestionCard: {
    width: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  suggestionImage: {
    width: '100%',
    height: 250,
  },
  suggestionQuoteContent: {
    padding: 20,
    minHeight: 200,
    justifyContent: 'center',
  },
  suggestionTypeIndicator: {
    marginBottom: 12,
  },
  suggestionTypeText: {
    fontSize: 24,
  },
  suggestionQuoteText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  suggestionQuoteAuthor: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionLetterContent: {
    padding: 20,
    minHeight: 200,
    justifyContent: 'flex-end',
  },
  suggestionLetterGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  suggestionLetterTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionLetterSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestionBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  suggestionBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Suggestion Modal
  suggestionModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  suggestionModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  suggestionModalCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '300',
  },
  suggestionModalTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    gap: 8,
  },
  suggestionModalTab: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  suggestionModalTabActive: {
    backgroundColor: '#FFFFFF',
  },
  suggestionModalScroll: {
    flex: 1,
  },
  suggestionModalScrollContent: {
    flexGrow: 1,
  },
  suggestionModalImage: {
    width: '100%',
    height: 450,
    backgroundColor: '#1a1a1a',
  },
  suggestionModalInfo: {
    padding: 24,
  },
  suggestionModalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  suggestionModalSubtitle: {
    fontWeight: '400',
    fontStyle: 'italic',
  },
  suggestionModalArtist: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  suggestionModalMuseum: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 16,
  },
  suggestionModalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  suggestionModalBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionModalDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#CCCCCC',
  },
  suggestionModalQuoteContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 500,
  },
  suggestionModalQuote: {
    padding: 32,
  },
  suggestionModalQuoteText: {
    fontSize: 28,
    lineHeight: 38,
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginBottom: 24,
    fontWeight: '400',
  },
  suggestionModalQuoteAuthor: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 32,
  },
  suggestionModalLetter: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
  },
  suggestionModalLetterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestionModalLetterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  suggestionModalLetterBadgeText: {
    color: '#9B4DCA',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionModalLetterDate: {
    color: '#999999',
    fontSize: 14,
  },
  suggestionModalLetterTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  suggestionModalLetterGradientLarge: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 24,
  },
  suggestionModalLetterParagraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  suggestionModalNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 0.5,
    borderTopColor: '#333333',
    backgroundColor: '#000000',
  },
  suggestionModalNavButton: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  suggestionModalNavButtonDisabled: {
    opacity: 0.3,
  },
  suggestionModalNavIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  suggestionModalNavIconDisabled: {
    opacity: 0.3,
  },
  suggestionModalNavText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});