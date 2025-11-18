/**
 * Tests for Chat Storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadChatHistories,
  saveChatHistories,
  loadChatHistory,
  saveChatHistory,
  appendChatMessage,
  clearChatHistory,
  deleteChatHistory,
  loadGlobalChatHistory,
  saveGlobalChatHistory,
  appendGlobalChatMessage,
  clearGlobalChatHistory,
  pruneOldMessages,
  getAllChatHistoryIds,
  clearAllChatHistories,
  getChatStorageStats,
  GLOBAL_CHAT_ID,
} from '../chatStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('chatStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadChatHistories', () => {
    it('should load chat histories from storage', async () => {
      const mockData = { 'note-1': [{ role: 'user', content: 'test' }] };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const result = await loadChatHistories();
      expect(result).toEqual(mockData);
    });

    it('should return empty object if no data exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await loadChatHistories();
      expect(result).toEqual({});
    });

    it('should handle errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await loadChatHistories();
      expect(result).toEqual({});
    });
  });

  describe('saveChatHistories', () => {
    it('should save chat histories to storage', async () => {
      const mockData = { 'note-1': [{ role: 'user', content: 'test' }] };

      await saveChatHistories(mockData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@patternbook_chat_history',
        JSON.stringify(mockData)
      );
    });

    it('should handle errors gracefully', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(saveChatHistories({})).resolves.not.toThrow();
    });
  });

  describe('loadChatHistory', () => {
    it('should load chat history for specific note', async () => {
      const mockMessages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];
      const mockData = { 'note-1': mockMessages };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const result = await loadChatHistory('note-1');
      expect(result).toEqual(mockMessages);
    });

    it('should return empty array if note has no history', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));

      const result = await loadChatHistory('note-999');
      expect(result).toEqual([]);
    });
  });

  describe('saveChatHistory', () => {
    it('should save chat history for specific note', async () => {
      const mockMessages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));

      await saveChatHistory('note-1', mockMessages);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@patternbook_chat_history',
        JSON.stringify({ 'note-1': mockMessages })
      );
    });

    it('should update existing chat history', async () => {
      const existingData = { 'note-1': [{ role: 'user', content: 'Old' }] };
      const newMessages = [{ role: 'user', content: 'New' }];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingData));

      await saveChatHistory('note-1', newMessages);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@patternbook_chat_history',
        JSON.stringify({ 'note-1': newMessages })
      );
    });
  });

  describe('appendChatMessage', () => {
    it('should append message to existing history', async () => {
      const existingMessages = [{ role: 'user', content: 'Hello' }];
      const existingData = { 'note-1': existingMessages };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingData));

      const newMessage = { role: 'assistant', content: 'Hi!' };
      const result = await appendChatMessage('note-1', newMessage);

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual(newMessage);
    });

    it('should create new history if none exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));

      const message = { role: 'user', content: 'First message' };
      const result = await appendChatMessage('note-new', message);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(message);
    });
  });

  describe('clearChatHistory', () => {
    it('should clear history for specific note', async () => {
      const mockData = {
        'note-1': [{ role: 'user', content: 'test' }],
        'note-2': [{ role: 'user', content: 'keep' }],
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      await clearChatHistory('note-1');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@patternbook_chat_history',
        JSON.stringify({ 'note-2': [{ role: 'user', content: 'keep' }] })
      );
    });
  });

  describe('deleteChatHistory', () => {
    it('should delete chat history for note', async () => {
      const mockData = { 'note-1': [{ role: 'user', content: 'test' }] };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      await deleteChatHistory('note-1');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@patternbook_chat_history',
        JSON.stringify({})
      );
    });
  });

  describe('Global Chat Functions', () => {
    it('should load global chat history', async () => {
      const mockMessages = [{ role: 'user', content: 'Global chat' }];
      const mockData = { [GLOBAL_CHAT_ID]: mockMessages };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const result = await loadGlobalChatHistory();
      expect(result).toEqual(mockMessages);
    });

    it('should save global chat history', async () => {
      const mockMessages = [{ role: 'user', content: 'Global chat' }];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));

      await saveGlobalChatHistory(mockMessages);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@patternbook_chat_history',
        JSON.stringify({ [GLOBAL_CHAT_ID]: mockMessages })
      );
    });

    it('should append to global chat history', async () => {
      const existingMessages = [{ role: 'user', content: 'Hello' }];
      const mockData = { [GLOBAL_CHAT_ID]: existingMessages };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const newMessage = { role: 'assistant', content: 'Hi!' };
      const result = await appendGlobalChatMessage(newMessage);

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual(newMessage);
    });

    it('should clear global chat history', async () => {
      const mockData = {
        [GLOBAL_CHAT_ID]: [{ role: 'user', content: 'test' }],
        'note-1': [{ role: 'user', content: 'keep' }],
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      await clearGlobalChatHistory();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@patternbook_chat_history',
        JSON.stringify({ 'note-1': [{ role: 'user', content: 'keep' }] })
      );
    });
  });

  describe('pruneOldMessages', () => {
    it('should prune messages exceeding max limit', async () => {
      const messages = Array.from({ length: 60 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));
      const mockData = { 'note-1': messages };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      await pruneOldMessages('note-1', 50);

      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData['note-1']).toHaveLength(50);
      expect(savedData['note-1'][0].content).toBe('Message 10'); // First 10 pruned
    });

    it('should not prune if under limit', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ];
      const mockData = { 'note-1': messages };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      await pruneOldMessages('note-1', 50);

      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData['note-1']).toHaveLength(2);
    });
  });

  describe('getAllChatHistoryIds', () => {
    it('should return all chat history IDs', async () => {
      const mockData = {
        [GLOBAL_CHAT_ID]: [{ role: 'user', content: 'test' }],
        'note-1': [{ role: 'user', content: 'test' }],
        'note-2': [{ role: 'user', content: 'test' }],
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const result = await getAllChatHistoryIds();
      expect(result).toEqual([GLOBAL_CHAT_ID, 'note-1', 'note-2']);
    });

    it('should return empty array if no histories exist', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));

      const result = await getAllChatHistoryIds();
      expect(result).toEqual([]);
    });
  });

  describe('clearAllChatHistories', () => {
    it('should remove chat history key from storage', async () => {
      await clearAllChatHistories();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@patternbook_chat_history');
    });

    it('should handle errors gracefully', async () => {
      AsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(clearAllChatHistories()).resolves.not.toThrow();
    });
  });

  describe('getChatStorageStats', () => {
    it('should return storage statistics', async () => {
      const mockData = {
        [GLOBAL_CHAT_ID]: [
          { role: 'user', content: 'test1' },
          { role: 'assistant', content: 'test2' },
        ],
        'note-1': [
          { role: 'user', content: 'test3' },
        ],
        'note-2': [
          { role: 'assistant', content: 'test4' },
          { role: 'user', content: 'test5' },
        ],
      };
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const stats = await getChatStorageStats();

      expect(stats.totalConversations).toBe(3);
      expect(stats.totalMessages).toBe(5);
      expect(stats.globalMessages).toBe(2);
      expect(stats.noteConversations).toBe(2);
    });

    it('should handle empty storage', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({}));

      const stats = await getChatStorageStats();

      expect(stats.totalConversations).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.globalMessages).toBe(0);
      expect(stats.noteConversations).toBe(0);
    });
  });
});

