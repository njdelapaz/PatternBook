/**
 * Tests for LLM Rate Limiter
 */

import { RateLimiter } from '../llmRateLimiter';

describe('LLMRateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    jest.clearAllTimers();
    rateLimiter = new RateLimiter(5, 1000); // 5 calls per 1 second for faster tests
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    test('should initialize with correct default values', () => {
      const limiter = new RateLimiter();
      expect(limiter.maxCalls).toBe(15);
      expect(limiter.windowMs).toBe(10000);
      expect(limiter.callTimestamps).toEqual([]);
      expect(limiter.queue).toEqual([]);
      expect(limiter.isProcessing).toBe(false);
    });

    test('should initialize with custom values', () => {
      const limiter = new RateLimiter(10, 5000);
      expect(limiter.maxCalls).toBe(10);
      expect(limiter.windowMs).toBe(5000);
    });
  });

  describe('canMakeCall', () => {
    test('should return true when no calls have been made', () => {
      expect(rateLimiter.canMakeCall()).toBe(true);
    });

    test('should return false when limit is reached', () => {
      // Fill up the rate limiter
      for (let i = 0; i < 5; i++) {
        rateLimiter.callTimestamps.push(Date.now());
      }
      expect(rateLimiter.canMakeCall()).toBe(false);
    });

    test('should return true after old timestamps expire', () => {
      const oldTime = Date.now() - 2000; // 2 seconds ago (outside 1 second window)
      rateLimiter.callTimestamps = [oldTime, oldTime, oldTime, oldTime, oldTime];
      expect(rateLimiter.canMakeCall()).toBe(true);
    });
  });

  describe('cleanOldTimestamps', () => {
    test('should remove timestamps outside the window', () => {
      const now = Date.now();
      const oldTime = now - 2000; // Outside window
      const recentTime = now - 500; // Inside window
      
      rateLimiter.callTimestamps = [oldTime, oldTime, recentTime];
      rateLimiter.cleanOldTimestamps();
      
      expect(rateLimiter.callTimestamps.length).toBe(1);
      expect(rateLimiter.callTimestamps[0]).toBe(recentTime);
    });

    test('should keep all timestamps within the window', () => {
      const now = Date.now();
      rateLimiter.callTimestamps = [now - 900, now - 500, now - 100];
      rateLimiter.cleanOldTimestamps();
      
      expect(rateLimiter.callTimestamps.length).toBe(3);
    });
  });

  describe('getTimeUntilNextSlot', () => {
    test('should return 0 when no calls have been made', () => {
      expect(rateLimiter.getTimeUntilNextSlot()).toBe(0);
    });

    test('should calculate time correctly', () => {
      const now = Date.now();
      rateLimiter.callTimestamps = [now - 500]; // 500ms ago
      
      const timeUntilNextSlot = rateLimiter.getTimeUntilNextSlot();
      expect(timeUntilNextSlot).toBeGreaterThan(400);
      expect(timeUntilNextSlot).toBeLessThanOrEqual(500);
    });

    test('should return 0 if oldest timestamp is outside window', () => {
      const oldTime = Date.now() - 2000; // 2 seconds ago
      rateLimiter.callTimestamps = [oldTime];
      
      expect(rateLimiter.getTimeUntilNextSlot()).toBe(0);
    });
  });

  describe('execute', () => {
    test('should execute function immediately if under limit', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      
      const result = await rateLimiter.execute(mockFn);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
      expect(rateLimiter.callTimestamps.length).toBe(1);
    });

    test('should execute multiple functions within limit', async () => {
      const mockFn1 = jest.fn().mockResolvedValue('result1');
      const mockFn2 = jest.fn().mockResolvedValue('result2');
      const mockFn3 = jest.fn().mockResolvedValue('result3');
      
      const results = await Promise.all([
        rateLimiter.execute(mockFn1),
        rateLimiter.execute(mockFn2),
        rateLimiter.execute(mockFn3),
      ]);
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(rateLimiter.callTimestamps.length).toBe(3);
    });

    test('should handle function errors correctly', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(rateLimiter.execute(mockFn)).rejects.toThrow('Test error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should queue requests when limit is reached', async () => {
      // Fill up the rate limiter
      const mockFns = [];
      for (let i = 0; i < 5; i++) {
        mockFns.push(jest.fn().mockResolvedValue(`result${i}`));
      }
      
      const promises = mockFns.map(fn => rateLimiter.execute(fn));
      
      // All should be queued
      expect(rateLimiter.queue.length + rateLimiter.callTimestamps.length).toBe(5);
      
      await Promise.all(promises);
    });
  });

  describe('getStatus', () => {
    test('should return correct status with no calls', () => {
      const status = rateLimiter.getStatus();
      
      expect(status.callsInWindow).toBe(0);
      expect(status.maxCalls).toBe(5);
      expect(status.available).toBe(5);
      expect(status.queueLength).toBe(0);
    });

    test('should return correct status with active calls', () => {
      rateLimiter.callTimestamps = [Date.now(), Date.now(), Date.now()];
      rateLimiter.queue = [{}, {}]; // Mock queue items
      
      const status = rateLimiter.getStatus();
      
      expect(status.callsInWindow).toBe(3);
      expect(status.maxCalls).toBe(5);
      expect(status.available).toBe(2);
      expect(status.queueLength).toBe(2);
    });
  });

  describe('reset', () => {
    test('should reset all state', () => {
      rateLimiter.callTimestamps = [Date.now(), Date.now()];
      rateLimiter.queue = [{}, {}];
      rateLimiter.isProcessing = true;
      
      rateLimiter.reset();
      
      expect(rateLimiter.callTimestamps).toEqual([]);
      expect(rateLimiter.queue).toEqual([]);
      expect(rateLimiter.isProcessing).toBe(false);
    });
  });

  describe('processQueue', () => {
    test('should not process if already processing', async () => {
      rateLimiter.isProcessing = true;
      rateLimiter.queue = [{ fn: jest.fn(), resolve: jest.fn(), reject: jest.fn() }];
      
      await rateLimiter.processQueue();
      
      expect(rateLimiter.queue.length).toBe(1); // Queue not processed
    });

    test('should not process if queue is empty', async () => {
      rateLimiter.isProcessing = false;
      rateLimiter.queue = [];
      
      await rateLimiter.processQueue();
      
      expect(rateLimiter.isProcessing).toBe(false);
    });
  });
});

