/**
 * RAG Operations Logger
 * Tracks all chat queries, retrievals, context building, and saves
 * Provides audit trail for admin panel
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RAG_LOGS_KEY = '@patternbook_rag_logs';
const MAX_LOG_ENTRIES = 1000; // Keep last 1000 operations

/**
 * Log entry types
 */
export const LogType = {
  CHAT_QUERY: 'chat_query',
  RETRIEVAL: 'retrieval',
  CONTEXT_BUILD: 'context_build',
  CHAT_SAVE: 'chat_save',
  INDEX_BUILD: 'index_build',
  ERROR: 'error',
};

/**
 * Log entry structure
 */
class RAGLogger {
  constructor() {
    this.sessionLogs = [];
    this.sessionStart = Date.now();
  }

  /**
   * Load existing logs from storage
   */
  async loadLogs() {
    try {
      const logsJson = await AsyncStorage.getItem(RAG_LOGS_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      console.error('[RAGLogger] Error loading logs:', error);
      return [];
    }
  }

  /**
   * Save logs to storage
   */
  async saveLogs(logs) {
    try {
      // Keep only last MAX_LOG_ENTRIES
      const trimmedLogs = logs.slice(-MAX_LOG_ENTRIES);
      await AsyncStorage.setItem(RAG_LOGS_KEY, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('[RAGLogger] Error saving logs:', error);
    }
  }

  /**
   * Add log entry
   */
  async log(type, data) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      sessionTime: Date.now() - this.sessionStart,
      data,
    };

    // Add to session logs (in memory)
    this.sessionLogs.push(entry);

    // Persist to storage
    const existingLogs = await this.loadLogs();
    existingLogs.push(entry);
    await this.saveLogs(existingLogs);

    return entry;
  }

  /**
   * Log chat query
   */
  async logChatQuery(options) {
    const {
      query,
      chatType, // 'global' or 'note'
      noteId,
      noteTitle,
      retrievedChunksCount,
      timestamp = Date.now(),
    } = options;

    return this.log(LogType.CHAT_QUERY, {
      query,
      chatType,
      noteId,
      noteTitle,
      retrievedChunksCount,
      queryLength: query?.length || 0,
    });
  }

  /**
   * Log retrieval operation
   */
  async logRetrieval(options) {
    const {
      query,
      resultsCount,
      results,
      executionTime,
      excludeNoteId,
    } = options;

    return this.log(LogType.RETRIEVAL, {
      query,
      resultsCount,
      topResults: results?.slice(0, 3).map(r => ({
        noteId: r.noteId,
        noteTitle: r.noteTitle,
        score: r.score,
        chunkPreview: r.text?.slice(0, 100),
      })),
      executionTime,
      excludeNoteId,
    });
  }

  /**
   * Log context building
   */
  async logContextBuild(options) {
    const {
      chatType,
      totalTokens,
      systemTokens,
      historyTokens,
      userMessageTokens,
      retrievedChunkCount,
      historyTruncated,
    } = options;

    return this.log(LogType.CONTEXT_BUILD, {
      chatType,
      totalTokens,
      systemTokens,
      historyTokens,
      userMessageTokens,
      retrievedChunkCount,
      historyTruncated,
      tokenBudgetUsage: `${Math.round((totalTokens / 2800) * 100)}%`,
    });
  }

  /**
   * Log chat save
   */
  async logChatSave(options) {
    const {
      chatId, // noteId or 'global'
      messageCount,
      lastMessage,
    } = options;

    return this.log(LogType.CHAT_SAVE, {
      chatId,
      messageCount,
      lastMessagePreview: lastMessage?.content?.slice(0, 100),
      lastMessageRole: lastMessage?.role,
    });
  }

  /**
   * Log index building
   */
  async logIndexBuild(options) {
    const {
      noteCount,
      chunkCount,
      executionTime,
    } = options;

    return this.log(LogType.INDEX_BUILD, {
      noteCount,
      chunkCount,
      executionTime,
      averageChunksPerNote: noteCount > 0 ? (chunkCount / noteCount).toFixed(2) : 0,
    });
  }

  /**
   * Log error
   */
  async logError(options) {
    const {
      operation,
      error,
      context,
    } = options;

    return this.log(LogType.ERROR, {
      operation,
      errorMessage: error?.message || 'Unknown error',
      errorType: error?.name || 'Error',
      context,
    });
  }

  /**
   * Get all logs
   */
  async getAllLogs() {
    return this.loadLogs();
  }

  /**
   * Get logs by type
   */
  async getLogsByType(type) {
    const logs = await this.loadLogs();
    return logs.filter(log => log.type === type);
  }

  /**
   * Get logs in time range
   */
  async getLogsInRange(startTime, endTime) {
    const logs = await this.loadLogs();
    return logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  /**
   * Get session logs (current session only)
   */
  getSessionLogs() {
    return [...this.sessionLogs];
  }

  /**
   * Get statistics
   */
  async getStats() {
    const logs = await this.loadLogs();
    const sessionLogs = this.sessionLogs;

    const stats = {
      total: {
        count: logs.length,
        byType: {},
      },
      session: {
        count: sessionLogs.length,
        byType: {},
        duration: Date.now() - this.sessionStart,
      },
      recent: {
        last24h: 0,
        lastHour: 0,
      },
    };

    // Count by type (all time)
    logs.forEach(log => {
      stats.total.byType[log.type] = (stats.total.byType[log.type] || 0) + 1;
    });

    // Count by type (session)
    sessionLogs.forEach(log => {
      stats.session.byType[log.type] = (stats.session.byType[log.type] || 0) + 1;
    });

    // Recent activity
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    logs.forEach(log => {
      if (log.timestamp >= oneDayAgo) stats.recent.last24h++;
      if (log.timestamp >= oneHourAgo) stats.recent.lastHour++;
    });

    return stats;
  }

  /**
   * Clear all logs
   */
  async clearLogs() {
    try {
      await AsyncStorage.removeItem(RAG_LOGS_KEY);
      this.sessionLogs = [];
      return true;
    } catch (error) {
      console.error('[RAGLogger] Error clearing logs:', error);
      return false;
    }
  }

  /**
   * Export logs as JSON string
   */
  async exportLogs() {
    const logs = await this.loadLogs();
    const stats = await this.getStats();
    
    return JSON.stringify({
      exportedAt: Date.now(),
      exportedAtISO: new Date().toISOString(),
      stats,
      logs,
    }, null, 2);
  }
}

// Export singleton instance
const ragLogger = new RAGLogger();
export default ragLogger;

