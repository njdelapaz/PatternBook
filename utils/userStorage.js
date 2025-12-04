/**
 * User Storage
 * Manages user accounts and authentication using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { USERS_STORAGE_KEY, CURRENT_USER_KEY } from './constants';

/**
 * Hash a password (simple hash for demo - in production use proper crypto)
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
function hashPassword(password) {
  // Simple hash for demo purposes
  // In production, use bcrypt or similar
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Load all users from storage
 * @returns {Promise<Array>} Array of user objects
 */
async function loadUsers() {
  try {
    const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

/**
 * Save users to storage
 * @param {Array} users - Array of user objects
 * @returns {Promise<void>}
 */
async function saveUsers(users) {
  try {
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

/**
 * Create a new user account
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export async function createUser(email, password) {
  try {
    const users = await loadUsers();
    
    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists' };
    }
    
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    };
    
    users.push(newUser);
    await saveUsers(users);
    
    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = newUser;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: 'Failed to create account' };
  }
}

/**
 * Verify user credentials
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export async function verifyUser(email, password) {
  try {
    const users = await loadUsers();
    
    // Find user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    // Verify password
    const passwordHash = hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    // Return user without password hash, but include all other properties (like hasCompletedOnboarding)
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    console.error('Error verifying user:', error);
    return { success: false, error: 'Failed to verify credentials' };
  }
}

/**
 * Save current logged-in user
 * @param {Object} user - User object
 * @returns {Promise<void>}
 */
export async function setCurrentUser(user) {
  try {
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving current user:', error);
  }
}

/**
 * Get current logged-in user
 * @returns {Promise<Object|null>} User object or null
 */
export async function getCurrentUser() {
  try {
    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error loading current user:', error);
    return null;
  }
}

/**
 * Clear current user (logout)
 * @returns {Promise<void>}
 */
export async function clearCurrentUser() {
  try {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  } catch (error) {
    console.error('Error clearing current user:', error);
  }
}

/**
 * Get all users (for testing/admin purposes)
 * @returns {Promise<Array>} Array of users without password hashes
 */
export async function getAllUsers() {
  try {
    const users = await loadUsers();
    return users.map(({ passwordHash, ...user }) => user);
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

/**
 * Mark onboarding as completed for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function setOnboardingCompleted(userId) {
  try {
    const users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      // Set the flag explicitly to true
      users[userIndex].hasCompletedOnboarding = true;
      await saveUsers(users);
      
      // Also update current user if it's the same user
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        currentUser.hasCompletedOnboarding = true;
        await setCurrentUser(currentUser);
      }
    } else {
      console.warn(`User with id ${userId} not found when setting onboarding completed`);
    }
  } catch (error) {
    console.error('Error setting onboarding completed:', error);
  }
}

/**
 * Check if user has completed onboarding
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if onboarding is completed
 */
export async function hasCompletedOnboarding(userId) {
  try {
    if (!userId) {
      console.warn('hasCompletedOnboarding called without userId');
      return false;
    }
    const users = await loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return false;
    }
    // Explicitly check if the flag is set to true
    return user.hasCompletedOnboarding === true;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

