/**
 * Tests for LLM Logger
 */

import { LLMLogger, MODEL_PRICING } from '../llmLogger';
import FileSystem from 'expo-file-system/legacy';

describe('LLMLogger', () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    FileSystem._reset();
    logger = new LLMLogger();
  });

  describe('Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(logger.sessionMetrics).toEqual({
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        byModel: {},
      });
    });

    test('should set correct log file path', () => {
      expect(logger.logFilePath).toBe(`${FileSystem.documentDirectory}logs/llm-usage.json`);
    });

    test('should attempt to create log directory', () => {
      expect(FileSystem.getInfoAsync).toHaveBeenCalled();
    });
  });

  describe('calculateCost', () => {
    test('should calculate cost correctly for gpt-5', () => {
      const cost = logger.calculateCost('gpt-5', 1000, 500);
      // (1000/1000000 * 1.25) + (500/1000000 * 10.0) = 0.00125 + 0.005 = 0.00625
      expect(cost).toBeCloseTo(0.00625);
    });

    test('should calculate cost correctly for gpt-5-nano', () => {
      const cost = logger.calculateCost('gpt-5-nano', 10000, 5000);
      // (10000/1000000 * 0.05) + (5000/1000000 * 0.4) = 0.0005 + 0.002 = 0.0025
      expect(cost).toBeCloseTo(0.0025);
    });

    test('should return 0 for unknown model', () => {
      const cost = logger.calculateCost('unknown-model', 1000, 500);
      expect(cost).toBe(0);
    });

    test('should handle zero tokens', () => {
      const cost = logger.calculateCost('gpt-5', 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('formatTokens', () => {
    test('should format small numbers correctly', () => {
      expect(logger.formatTokens(999)).toBe('999');
      expect(logger.formatTokens(500)).toBe('500');
      expect(logger.formatTokens(1)).toBe('1');
    });

    test('should format large numbers with k suffix', () => {
      expect(logger.formatTokens(1000)).toBe('1.0k');
      expect(logger.formatTokens(1234)).toBe('1.2k');
      expect(logger.formatTokens(5678)).toBe('5.7k');
      expect(logger.formatTokens(10000)).toBe('10.0k');
    });
  });

  describe('formatCost', () => {
    test('should format small costs with 4 decimal places', () => {
      expect(logger.formatCost(0.001)).toBe('$0.0010');
      expect(logger.formatCost(0.00001)).toBe('$0.0000');
      expect(logger.formatCost(0.009999)).toBe('$0.0100');
    });

    test('should format larger costs with 3 decimal places', () => {
      expect(logger.formatCost(0.01)).toBe('$0.010');
      expect(logger.formatCost(0.123)).toBe('$0.123');
      expect(logger.formatCost(1.5)).toBe('$1.500');
    });
  });

  describe('logSuccess', () => {
    test('should log successful API call', async () => {
      await logger.logSuccess({
        requestId: 'test-123',
        model: 'gpt-5-nano',
        promptTokens: 100,
        completionTokens: 50,
        duration: 1500,
        response: { content: 'Test response' },
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('gpt-5-nano')
      );
    });

    test('should update session metrics correctly', async () => {
      await logger.logSuccess({
        requestId: 'test-123',
        model: 'gpt-5-nano',
        promptTokens: 100,
        completionTokens: 50,
        duration: 1500,
        response: {},
      });

      expect(logger.sessionMetrics.totalCalls).toBe(1);
      expect(logger.sessionMetrics.successfulCalls).toBe(1);
      expect(logger.sessionMetrics.failedCalls).toBe(0);
      expect(logger.sessionMetrics.totalTokens).toBe(150);
      expect(logger.sessionMetrics.totalCost).toBeGreaterThan(0);
    });

    test('should track metrics by model', async () => {
      await logger.logSuccess({
        requestId: 'test-123',
        model: 'gpt-5-nano',
        promptTokens: 100,
        completionTokens: 50,
        duration: 1500,
        response: {},
      });

      expect(logger.sessionMetrics.byModel['gpt-5-nano']).toBeDefined();
      expect(logger.sessionMetrics.byModel['gpt-5-nano'].calls).toBe(1);
      expect(logger.sessionMetrics.byModel['gpt-5-nano'].tokens).toBe(150);
      expect(logger.sessionMetrics.byModel['gpt-5-nano'].cost).toBeGreaterThan(0);
    });

    test('should write to file', async () => {
      await logger.logSuccess({
        requestId: 'test-123',
        model: 'gpt-5-nano',
        promptTokens: 100,
        completionTokens: 50,
        duration: 1500,
        response: {},
      });

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      const callArgs = FileSystem.writeAsStringAsync.mock.calls[0];
      const logData = JSON.parse(callArgs[1]);
      
      expect(logData).toHaveLength(1);
      expect(logData[0].status).toBe('success');
      expect(logData[0].model).toBe('gpt-5-nano');
    });

    test('should handle multiple successful calls', async () => {
      await logger.logSuccess({
        requestId: 'test-1',
        model: 'gpt-5-nano',
        promptTokens: 100,
        completionTokens: 50,
        duration: 1500,
        response: {},
      });

      await logger.logSuccess({
        requestId: 'test-2',
        model: 'gpt-5',
        promptTokens: 200,
        completionTokens: 100,
        duration: 2000,
        response: {},
      });

      expect(logger.sessionMetrics.totalCalls).toBe(2);
      expect(logger.sessionMetrics.successfulCalls).toBe(2);
      expect(logger.sessionMetrics.totalTokens).toBe(450); // 150 + 300
    });
  });

  describe('logError', () => {
    test('should log failed API call', async () => {
      await logger.logError({
        requestId: 'test-123',
        model: 'gpt-5-nano',
        duration: 1500,
        error: new Error('Test error'),
        errorType: 'APIError',
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
    });

    test('should update session metrics correctly', async () => {
      await logger.logError({
        requestId: 'test-123',
        model: 'gpt-5-nano',
        duration: 1500,
        error: new Error('Test error'),
        errorType: 'APIError',
      });

      expect(logger.sessionMetrics.totalCalls).toBe(1);
      expect(logger.sessionMetrics.successfulCalls).toBe(0);
      expect(logger.sessionMetrics.failedCalls).toBe(1);
    });

    test('should write error to file', async () => {
      await logger.logError({
        requestId: 'test-123',
        model: 'gpt-5-nano',
        duration: 1500,
        error: new Error('Test error'),
        errorType: 'APIError',
      });

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      const callArgs = FileSystem.writeAsStringAsync.mock.calls[0];
      const logData = JSON.parse(callArgs[1]);
      
      expect(logData).toHaveLength(1);
      expect(logData[0].status).toBe('error');
      expect(logData[0].error.type).toBe('APIError');
    });
  });

  describe('logCriticalError', () => {
    test('should log critical error to console', () => {
      logger.logCriticalError('QuotaExceededError', 'Quota exceeded');
      
      expect(console.error).toHaveBeenCalledWith(
        '[ERROR] Quota exceeded'
      );
    });
  });

  describe('writeToFile', () => {
    test('should create new log file if it does not exist', async () => {
      const logEntry = {
        requestId: 'test-123',
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      await logger.writeToFile(logEntry);

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      const callArgs = FileSystem.writeAsStringAsync.mock.calls[0];
      const logData = JSON.parse(callArgs[1]);
      
      expect(logData).toHaveLength(1);
      expect(logData[0]).toEqual(logEntry);
    });

    test('should append to existing log file', async () => {
      // Create initial log entry
      const entry1 = { requestId: 'test-1', status: 'success' };
      await logger.writeToFile(entry1);

      // Append second entry
      const entry2 = { requestId: 'test-2', status: 'error' };
      await logger.writeToFile(entry2);

      const callArgs = FileSystem.writeAsStringAsync.mock.calls[1];
      const logData = JSON.parse(callArgs[1]);
      
      expect(logData).toHaveLength(2);
      expect(logData[0]).toEqual(entry1);
      expect(logData[1]).toEqual(entry2);
    });

    test('should limit log entries to 1000', async () => {
      // Create 1005 entries
      const entries = Array.from({ length: 1005 }, (_, i) => ({
        requestId: `test-${i}`,
      }));

      for (const entry of entries) {
        await logger.writeToFile(entry);
      }

      const lastCall = FileSystem.writeAsStringAsync.mock.calls.slice(-1)[0];
      const logData = JSON.parse(lastCall[1]);
      
      expect(logData.length).toBeLessThanOrEqual(1000);
    });

    test('should handle write errors gracefully', async () => {
      FileSystem.writeAsStringAsync.mockRejectedValueOnce(new Error('Write failed'));

      const logEntry = { requestId: 'test-123' };
      await expect(logger.writeToFile(logEntry)).resolves.not.toThrow();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write to log file')
      );
    });
  });

  describe('getSessionMetrics', () => {
    test('should return copy of session metrics', () => {
      logger.sessionMetrics.totalCalls = 5;
      const metrics = logger.getSessionMetrics();
      
      expect(metrics.totalCalls).toBe(5);
      
      // Modify returned object
      metrics.totalCalls = 10;
      
      // Original should not be modified
      expect(logger.sessionMetrics.totalCalls).toBe(5);
    });
  });

  describe('resetSessionMetrics', () => {
    test('should reset all metrics to initial state', async () => {
      // Add some metrics
      await logger.logSuccess({
        requestId: 'test-123',
        model: 'gpt-5-nano',
        promptTokens: 100,
        completionTokens: 50,
        duration: 1500,
        response: {},
      });

      expect(logger.sessionMetrics.totalCalls).toBe(1);
      
      // Reset
      logger.resetSessionMetrics();
      
      expect(logger.sessionMetrics).toEqual({
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        byModel: {},
      });
    });
  });

  describe('readLogs', () => {
    test('should read logs from file', async () => {
      const testLogs = [
        { requestId: 'test-1', status: 'success' },
        { requestId: 'test-2', status: 'error' },
      ];

      FileSystem._files[logger.logFilePath] = JSON.stringify(testLogs);

      const logs = await logger.readLogs();
      
      expect(logs).toEqual(testLogs);
    });

    test('should return empty array if file does not exist', async () => {
      const logs = await logger.readLogs();
      expect(logs).toEqual([]);
    });

    test('should handle read errors gracefully', async () => {
      FileSystem.readAsStringAsync.mockRejectedValueOnce(new Error('Read failed'));
      FileSystem._files[logger.logFilePath] = 'some data';

      const logs = await logger.readLogs();
      
      expect(logs).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read log file')
      );
    });
  });

  describe('MODEL_PRICING', () => {
    test('should have pricing for all supported models', () => {
      const expectedModels = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o', 'gpt-4o-mini'];
      
      expectedModels.forEach(model => {
        expect(MODEL_PRICING[model]).toBeDefined();
        expect(MODEL_PRICING[model].input).toBeGreaterThan(0);
        expect(MODEL_PRICING[model].output).toBeGreaterThan(0);
      });
    });
  });
});

