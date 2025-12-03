/**
 * Tests for User Storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUser,
  verifyUser,
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  getAllUsers,
} from '../userStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('userStorage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await createUser('test@example.com', 'Password1!');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.id).toBeDefined();
      expect(result.user.createdAt).toBeDefined();
      expect(result.user.passwordHash).toBeUndefined(); // Should not return password hash
    });

    it('should normalize email to lowercase', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await createUser('Test@Example.COM', 'Password1!');

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
    });

    it('should fail if user already exists', async () => {
      const existingUsers = [
        {
          id: '123',
          email: 'test@example.com',
          passwordHash: 'hash123',
          createdAt: Date.now(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingUsers));

      const result = await createUser('test@example.com', 'Password1!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account with this email already exists');
    });

    it('should be case-insensitive when checking for existing users', async () => {
      const existingUsers = [
        {
          id: '123',
          email: 'test@example.com',
          passwordHash: 'hash123',
          createdAt: Date.now(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingUsers));

      const result = await createUser('TEST@EXAMPLE.COM', 'Password1!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account with this email already exists');
    });
  });

  describe('verifyUser', () => {
    it('should verify user with correct credentials', async () => {
      // Create a user first to get the correct hash
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      const createResult = await createUser('test@example.com', 'Password1!');
      
      // Get the saved users from the setItem call
      const savedUsers = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      
      // Now mock the getItem to return the saved users
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedUsers));

      const result = await verifyUser('test@example.com', 'Password1!');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.passwordHash).toBeUndefined(); // Should not return password hash
    });

    it('should fail with incorrect password', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      await createUser('test@example.com', 'Password1!');
      const savedUsers = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedUsers));

      const result = await verifyUser('test@example.com', 'WrongPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should fail with non-existent user', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await verifyUser('nonexistent@example.com', 'Password1!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should be case-insensitive for email', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      await createUser('test@example.com', 'Password1!');
      const savedUsers = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedUsers));

      const result = await verifyUser('TEST@EXAMPLE.COM', 'Password1!');

      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('setCurrentUser and getCurrentUser', () => {
    it('should save and retrieve current user', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        createdAt: Date.now(),
      };

      await setCurrentUser(user);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@patternbook_current_user',
        JSON.stringify(user)
      );

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(user));
      const retrievedUser = await getCurrentUser();

      expect(retrievedUser).toEqual(user);
    });

    it('should return null if no current user', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('clearCurrentUser', () => {
    it('should clear current user', async () => {
      await clearCurrentUser();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@patternbook_current_user');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users without password hashes', async () => {
      const users = [
        {
          id: '1',
          email: 'user1@example.com',
          passwordHash: 'hash1',
          createdAt: Date.now(),
        },
        {
          id: '2',
          email: 'user2@example.com',
          passwordHash: 'hash2',
          createdAt: Date.now(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(users));

      const result = await getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0].passwordHash).toBeUndefined();
      expect(result[1].passwordHash).toBeUndefined();
      expect(result[0].email).toBe('user1@example.com');
      expect(result[1].email).toBe('user2@example.com');
    });

    it('should return empty array if no users', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const result = await getAllUsers();

      expect(result).toEqual([]);
    });
  });
});

