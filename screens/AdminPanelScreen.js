/**
 * Admin Panel Screen
 * View RAG operations, chat queries, and system logs
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '../utils/constants';
import ragLogger, { LogType } from '../services/ragLogger';
import { loadChatHistories, getChatStorageStats } from '../utils/chatStorage';
import retrievalService from '../services/noteRetrievalService';

export default function AdminPanelScreen({ isDarkMode, onBack }) {
  const insets = useSafeAreaInsets();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'storage'
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  
  // Storage tab state
  const [chatHistories, setChatHistories] = useState({});
  const [chatStats, setChatStats] = useState(null);
  const [indexStats, setIndexStats] = useState(null);
  const [expandedChat, setExpandedChat] = useState(null);

  useEffect(() => {
    loadLogs();
    loadStorageData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, selectedFilter, searchQuery]);

  const loadLogs = async () => {
    try {
      const allLogs = await ragLogger.getAllLogs();
      const logStats = await ragLogger.getStats();
      
      // Sort by most recent first
      allLogs.sort((a, b) => b.timestamp - a.timestamp);
      
      setLogs(allLogs);
      setStats(logStats);
    } catch (error) {
      console.error('[AdminPanel] Error loading logs:', error);
    }
  };

  const loadStorageData = async () => {
    try {
      // Load chat histories
      const histories = await loadChatHistories();
      setChatHistories(histories);
      
      // Load chat stats
      const stats = await getChatStorageStats();
      setChatStats(stats);
      
      // Load index stats
      const idxStats = retrievalService.getStats();
      setIndexStats(idxStats);
    } catch (error) {
      console.error('[AdminPanel] Error loading storage data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'logs') {
      await loadLogs();
    } else {
      await loadStorageData();
    }
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filter by type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(log => log.type === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => {
        const dataStr = JSON.stringify(log.data).toLowerCase();
        return dataStr.includes(query) || log.type.includes(query);
      });
    }

    setFilteredLogs(filtered);
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear All Logs',
      'Are you sure you want to delete all RAG operation logs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const success = await ragLogger.clearLogs();
            if (success) {
              setLogs([]);
              setFilteredLogs([]);
              Alert.alert('Success', 'All logs cleared');
            }
          },
        },
      ]
    );
  };

  const handleExportLogs = async () => {
    try {
      const exported = await ragLogger.exportLogs();
      
      // Share as file
      await Share.share({
        message: exported,
        title: 'RAG System Logs',
      });
    } catch (error) {
      console.error('[AdminPanel] Error exporting logs:', error);
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const toggleExpandLog = (logId) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const toggleExpandChat = (chatId) => {
    setExpandedChat(expandedChat === chatId ? null : chatId);
  };

  const getLogTypeColor = (type) => {
    switch (type) {
      case LogType.CHAT_QUERY:
        return '#4A90E2';
      case LogType.RETRIEVAL:
        return '#7B68EE';
      case LogType.CONTEXT_BUILD:
        return '#50C878';
      case LogType.CHAT_SAVE:
        return '#FFB347';
      case LogType.INDEX_BUILD:
        return '#9370DB';
      case LogType.ERROR:
        return '#FF6B6B';
      default:
        return theme.secondaryTextColor;
    }
  };

  const getLogTypeLabel = (type) => {
    switch (type) {
      case LogType.CHAT_QUERY:
        return '💬 Chat Query';
      case LogType.RETRIEVAL:
        return '🔍 Retrieval';
      case LogType.CONTEXT_BUILD:
        return '🏗️ Context';
      case LogType.CHAT_SAVE:
        return '💾 Save';
      case LogType.INDEX_BUILD:
        return '📚 Index';
      case LogType.ERROR:
        return '❌ Error';
      default:
        return type;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleString();
  };

  const renderChatHistory = (chatId, messages) => {
    const isExpanded = expandedChat === chatId;
    const isGlobal = chatId === 'global';
    const messageCount = messages.length;
    const lastMessage = messages[messages.length - 1];

    return (
      <TouchableOpacity
        key={chatId}
        style={[styles.logItem, { backgroundColor: theme.cardBackground, borderLeftColor: '#4A90E2' }]}
        onPress={() => toggleExpandChat(chatId)}
      >
        <View style={styles.logHeader}>
          <Text style={[styles.logType, { color: '#4A90E2' }]}>
            {isGlobal ? '🌐 Global Chat' : '📝 Note Chat'}
          </Text>
          <Text style={[styles.logTime, { color: theme.secondaryTextColor }]}>
            {messageCount} messages
          </Text>
        </View>

        <View style={styles.logContent}>
          <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
            Chat ID: {chatId}
          </Text>
          
          {lastMessage && (
            <>
              <Text style={[styles.logLabel, { color: theme.secondaryTextColor }]}>Last Message:</Text>
              <Text style={[styles.logText, { color: theme.textColor }]} numberOfLines={isExpanded ? undefined : 2}>
                {lastMessage.role === 'user' ? '👤 ' : '🤖 '}
                {lastMessage.content}
              </Text>
              {lastMessage.timestamp && (
                <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                  {new Date(lastMessage.timestamp).toLocaleString()}
                </Text>
              )}
            </>
          )}

          {isExpanded && (
            <View style={styles.chatMessagesContainer}>
              <Text style={[styles.logLabel, { color: theme.secondaryTextColor, marginTop: 12 }]}>
                Full Conversation:
              </Text>
              {messages.map((msg, idx) => (
                <View key={idx} style={[styles.chatMessageItem, { backgroundColor: theme.inputBackground }]}>
                  <Text style={[styles.chatMessageRole, { color: theme.accentColor }]}>
                    {msg.role === 'user' ? '👤 User' : '🤖 Assistant'}
                  </Text>
                  <Text style={[styles.chatMessageContent, { color: theme.textColor }]}>
                    {msg.content}
                  </Text>
                  {msg.timestamp && (
                    <Text style={[styles.chatMessageTime, { color: theme.placeholderColor }]}>
                      {new Date(msg.timestamp).toLocaleString()}
                    </Text>
                  )}
                  {msg.retrievedNotes && msg.retrievedNotes.length > 0 && (
                    <View style={styles.retrievedNotesIndicator}>
                      <Text style={[styles.retrievedNotesText, { color: theme.secondaryTextColor }]}>
                        📎 Referenced: {msg.retrievedNotes.map(n => n.noteTitle).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={[styles.expandHint, { color: theme.placeholderColor }]}>
          {isExpanded ? 'Tap to collapse' : 'Tap to view full conversation'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStorageTab = () => {
    const chatIds = Object.keys(chatHistories);

    return (
      <ScrollView
        style={styles.logsList}
        contentContainerStyle={styles.logsListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentColor} />
        }
      >
        {/* Storage Statistics */}
        <View style={[styles.storageStatsCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.storageStatsTitle, { color: theme.textColor }]}>
            💾 Storage Statistics
          </Text>
          
          {chatStats && (
            <View style={styles.storageStatsSection}>
              <Text style={[styles.storageStatsLabel, { color: theme.secondaryTextColor }]}>
                Chat Histories
              </Text>
              <Text style={[styles.storageStatsValue, { color: theme.textColor }]}>
                📊 {chatStats.totalConversations} conversations
              </Text>
              <Text style={[styles.storageStatsValue, { color: theme.textColor }]}>
                💬 {chatStats.totalMessages} total messages
              </Text>
              <Text style={[styles.storageStatsValue, { color: theme.textColor }]}>
                🌐 {chatStats.globalMessages} global messages
              </Text>
              <Text style={[styles.storageStatsValue, { color: theme.textColor }]}>
                📝 {chatStats.noteConversations} note conversations
              </Text>
            </View>
          )}

          {indexStats && (
            <View style={styles.storageStatsSection}>
              <Text style={[styles.storageStatsLabel, { color: theme.secondaryTextColor }]}>
                RAG Index
              </Text>
              <Text style={[styles.storageStatsValue, { color: theme.textColor }]}>
                📚 {indexStats.noteCount} notes indexed
              </Text>
              <Text style={[styles.storageStatsValue, { color: theme.textColor }]}>
                📄 {indexStats.chunkCount} chunks created
              </Text>
              <Text style={[styles.storageStatsValue, { color: theme.textColor }]}>
                ✅ {indexStats.indexed ? 'Index active' : 'Not indexed'}
              </Text>
              {indexStats.chunkCount > 0 && indexStats.noteCount > 0 && (
                <Text style={[styles.storageStatsValue, { color: theme.textColor }]}>
                  📊 Avg {(indexStats.chunkCount / indexStats.noteCount).toFixed(1)} chunks/note
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Chat Histories */}
        <Text style={[styles.sectionHeader, { color: theme.textColor }]}>
          💬 Chat Histories ({chatIds.length})
        </Text>

        {chatIds.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.secondaryTextColor }]}>
              No chat histories yet
            </Text>
          </View>
        ) : (
          chatIds.map(chatId => renderChatHistory(chatId, chatHistories[chatId]))
        )}
      </ScrollView>
    );
  };

  const renderLogItem = (log) => {
    const isExpanded = expandedLog === log.id;

    return (
      <TouchableOpacity
        key={log.id}
        style={[styles.logItem, { backgroundColor: theme.cardBackground, borderLeftColor: getLogTypeColor(log.type) }]}
        onPress={() => toggleExpandLog(log.id)}
      >
        <View style={styles.logHeader}>
          <Text style={[styles.logType, { color: getLogTypeColor(log.type) }]}>
            {getLogTypeLabel(log.type)}
          </Text>
          <Text style={[styles.logTime, { color: theme.secondaryTextColor }]}>
            {formatTimestamp(log.timestamp)}
          </Text>
        </View>

        <View style={styles.logContent}>
          {log.type === LogType.CHAT_QUERY && (
            <>
              <Text style={[styles.logLabel, { color: theme.secondaryTextColor }]}>Query:</Text>
              <Text style={[styles.logText, { color: theme.textColor }]} numberOfLines={isExpanded ? undefined : 2}>
                {log.data.query}
              </Text>
              {log.data.noteTitle && (
                <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                  Note: {log.data.noteTitle}
                </Text>
              )}
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Retrieved {log.data.retrievedChunksCount} chunks
              </Text>
            </>
          )}

          {log.type === LogType.RETRIEVAL && (
            <>
              <Text style={[styles.logLabel, { color: theme.secondaryTextColor }]}>Query:</Text>
              <Text style={[styles.logText, { color: theme.textColor }]} numberOfLines={isExpanded ? undefined : 1}>
                {log.data.query}
              </Text>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Found {log.data.resultsCount} results in {log.data.executionTime}ms
              </Text>
              {isExpanded && log.data.topResults && (
                <View style={styles.topResults}>
                  {log.data.topResults.map((result, idx) => (
                    <View key={idx} style={styles.resultItem}>
                      <Text style={[styles.resultTitle, { color: theme.accentColor }]}>
                        {result.noteTitle} (score: {result.score.toFixed(3)})
                      </Text>
                      <Text style={[styles.resultPreview, { color: theme.secondaryTextColor }]}>
                        {result.chunkPreview}...
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {log.type === LogType.CONTEXT_BUILD && (
            <>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Total Tokens: {log.data.totalTokens} ({log.data.tokenBudgetUsage})
              </Text>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                System: {log.data.systemTokens} | History: {log.data.historyTokens} | User: {log.data.userMessageTokens}
              </Text>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Retrieved Chunks: {log.data.retrievedChunkCount}
              </Text>
              {log.data.historyTruncated && (
                <Text style={[styles.warningText, { color: '#FFB347' }]}>
                  ⚠️ History was truncated to fit budget
                </Text>
              )}
            </>
          )}

          {log.type === LogType.CHAT_SAVE && (
            <>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Chat ID: {log.data.chatId}
              </Text>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Messages: {log.data.messageCount}
              </Text>
              {log.data.lastMessagePreview && (
                <>
                  <Text style={[styles.logLabel, { color: theme.secondaryTextColor }]}>Last Message:</Text>
                  <Text style={[styles.logText, { color: theme.textColor }]} numberOfLines={isExpanded ? undefined : 2}>
                    {log.data.lastMessagePreview}
                  </Text>
                </>
              )}
            </>
          )}

          {log.type === LogType.INDEX_BUILD && (
            <>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Indexed {log.data.noteCount} notes into {log.data.chunkCount} chunks
              </Text>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Execution Time: {log.data.executionTime}ms
              </Text>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Avg Chunks/Note: {log.data.averageChunksPerNote}
              </Text>
            </>
          )}

          {log.type === LogType.ERROR && (
            <>
              <Text style={[styles.errorText, { color: '#FF6B6B' }]}>
                {log.data.errorType}: {log.data.errorMessage}
              </Text>
              <Text style={[styles.logDetail, { color: theme.secondaryTextColor }]}>
                Operation: {log.data.operation}
              </Text>
              {isExpanded && log.data.context && (
                <Text style={[styles.logText, { color: theme.secondaryTextColor }]}>
                  {JSON.stringify(log.data.context, null, 2)}
                </Text>
              )}
            </>
          )}
        </View>

        <Text style={[styles.expandHint, { color: theme.placeholderColor }]}>
          {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={{ paddingTop: insets.top, flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.accentColor }]}>
              ← Back
            </Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.textColor }]}>
            Admin Panel
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleExportLogs} style={styles.headerButton}>
              <Text style={[styles.headerButtonText, { color: theme.accentColor }]}>
                Export
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.cardBackground }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'logs' && { borderBottomColor: theme.accentColor, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('logs')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'logs' ? theme.accentColor : theme.secondaryTextColor }]}>
              📋 Logs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'storage' && { borderBottomColor: theme.accentColor, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('storage')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'storage' ? theme.accentColor : theme.secondaryTextColor }]}>
              💾 Storage
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats - Only show on logs tab */}
        {activeTab === 'logs' && stats && (
          <View style={[styles.statsContainer, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textColor }]}>{stats.total.count}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryTextColor }]}>Total Logs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textColor }]}>{stats.session.count}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryTextColor }]}>Session</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.textColor }]}>{stats.recent.last24h}</Text>
              <Text style={[styles.statLabel, { color: theme.secondaryTextColor }]}>Last 24h</Text>
            </View>
          </View>
        )}

        {/* Content based on active tab */}
        {activeTab === 'logs' ? (
          <>
            {/* Filters */}
            <View style={[styles.filtersContainer, { backgroundColor: theme.cardBackground }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {['all', LogType.CHAT_QUERY, LogType.RETRIEVAL, LogType.CONTEXT_BUILD, LogType.CHAT_SAVE, LogType.INDEX_BUILD, LogType.ERROR].map(filter => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterButton,
                      selectedFilter === filter && { backgroundColor: theme.accentColor },
                    ]}
                    onPress={() => setSelectedFilter(filter)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      { color: selectedFilter === filter ? '#FFFFFF' : theme.textColor },
                    ]}>
                      {filter === 'all' ? 'All' : getLogTypeLabel(filter).split(' ')[1]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
              <TextInput
                style={[styles.searchInput, { color: theme.textColor, backgroundColor: theme.inputBackground }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search logs..."
                placeholderTextColor={theme.placeholderColor}
              />
            </View>

            {/* Logs List */}
            <ScrollView
              style={styles.logsList}
              contentContainerStyle={styles.logsListContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentColor} />
              }
            >
              {filteredLogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.secondaryTextColor }]}>
                    {searchQuery || selectedFilter !== 'all' ? 'No logs match filters' : 'No logs yet'}
                  </Text>
                </View>
              ) : (
                filteredLogs.map(renderLogItem)
              )}
            </ScrollView>
          </>
        ) : (
          renderStorageTab()
        )}

        {/* Footer Actions */}
        <View style={[styles.footer, { backgroundColor: theme.navBackground, borderTopColor: theme.borderColor, paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: theme.cardBackground }]}
            onPress={onRefresh}
          >
            <Text style={[styles.footerButtonText, { color: theme.textColor }]}>
              🔄 Refresh
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: '#FF6B6B' }]}
            onPress={handleClearLogs}
          >
            <Text style={[styles.footerButtonText, { color: '#FFFFFF' }]}>
              🗑️ Clear All
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  filtersContainer: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 15,
  },
  logsList: {
    flex: 1,
  },
  logsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  logItem: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logType: {
    fontSize: 14,
    fontWeight: '600',
  },
  logTime: {
    fontSize: 12,
  },
  logContent: {
    gap: 6,
  },
  logLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  logText: {
    fontSize: 14,
    lineHeight: 20,
  },
  logDetail: {
    fontSize: 13,
  },
  warningText: {
    fontSize: 13,
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  topResults: {
    marginTop: 8,
    gap: 8,
  },
  resultItem: {
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultPreview: {
    fontSize: 12,
    marginTop: 2,
  },
  expandHint: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  storageStatsCard: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  storageStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  storageStatsSection: {
    marginBottom: 16,
  },
  storageStatsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  storageStatsValue: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 4,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  chatMessagesContainer: {
    marginTop: 8,
  },
  chatMessageItem: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  chatMessageRole: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  chatMessageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatMessageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  retrievedNotesIndicator: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  retrievedNotesText: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

