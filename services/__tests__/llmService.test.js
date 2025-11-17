/**
 * Tests for LLM Service
 */

import { 
  callLLM, 
  getRateLimitStatus, 
  getSessionMetrics, 
  resetSessionMetrics,
  SUPPORTED_MODELS,
  ErrorTypes 
} from '../llmService';

// Mock the dependencies
jest.mock('expo-file-system/legacy');

// Mock fetch
global.fetch = jest.fn();

describe('LLMService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    resetSessionMetrics();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('SUPPORTED_MODELS', () => {
    test('should export list of supported models', () => {
      expect(SUPPORTED_MODELS).toContain('gpt-5');
      expect(SUPPORTED_MODELS).toContain('gpt-5-mini');
      expect(SUPPORTED_MODELS).toContain('gpt-5-nano');
      expect(SUPPORTED_MODELS).toContain('gpt-4o');
      expect(SUPPORTED_MODELS).toContain('gpt-4o-mini');
    });
  });

  describe('ErrorTypes', () => {
    test('should export error types', () => {
      expect(ErrorTypes).toHaveProperty('NETWORK');
      expect(ErrorTypes).toHaveProperty('API');
      expect(ErrorTypes).toHaveProperty('RATE_LIMIT');
      expect(ErrorTypes).toHaveProperty('AUTH');
      expect(ErrorTypes).toHaveProperty('QUOTA_EXCEEDED');
      expect(ErrorTypes).toHaveProperty('INVALID_REQUEST');
      expect(ErrorTypes).toHaveProperty('UNKNOWN');
    });
  });

  describe('callLLM - Input Validation', () => {
    test('should reject unsupported model', async () => {
      const result = await callLLM({
        model: 'unsupported-model',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.INVALID_REQUEST);
      expect(result.error.message).toContain('Unsupported model');
    });

    test('should reject empty messages array', async () => {
      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [],
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.INVALID_REQUEST);
      expect(result.error.message).toContain('Messages array is required');
    });

    test('should reject missing messages', async () => {
      const result = await callLLM({
        model: 'gpt-5-nano',
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.INVALID_REQUEST);
    });

    test('should reject non-array messages', async () => {
      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: 'not an array',
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.INVALID_REQUEST);
    });
  });

  describe('callLLM - Successful API Calls', () => {
    test('should make successful API call', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Hello! How can I help you?' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('Hello! How can I help you?');
      expect(result.metrics.tokens).toBe(30);
      expect(result.metrics.promptTokens).toBe(10);
      expect(result.metrics.completionTokens).toBe(20);
      expect(result.metrics.cost).toBeGreaterThan(0);
      expect(result.metrics.duration).toBeGreaterThanOrEqual(0);
    });

    test('should use correct default temperature', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.temperature).toBe(0.7);
    });

    test('should use custom temperature when provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.3,
      });

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.temperature).toBe(0.3);
    });

    test('should include maxTokens when provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100,
      });

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.max_tokens).toBe(100);
    });

    test('should pass through other options', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
        top_p: 0.9,
        presence_penalty: 0.5,
      });

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.top_p).toBe(0.9);
      expect(requestBody.presence_penalty).toBe(0.5);
    });
  });

  describe('callLLM - Error Handling', () => {
    test('should handle 401 authentication error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.AUTH);
      expect(result.error.message).toContain('Invalid API key');
    });

    test('should handle 429 rate limit error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.RATE_LIMIT);
    });

    test('should handle 429 quota exceeded error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Quota exceeded' } }),
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.QUOTA_EXCEEDED);
    });

    test('should handle 400 invalid request error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid request' } }),
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.INVALID_REQUEST);
    });

    test('should handle 500 API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal server error' } }),
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.API);
    });

    test('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network request failed'));

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.NETWORK);
      expect(result.error.message).toContain('Network');
    });
  });

  describe('callLLM - Retry Logic', () => {
    test('should not retry auth errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries
    });

    test('should not retry quota exceeded errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Quota exceeded' } }),
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries
    });

    test('should retry API errors with exponential backoff', async () => {
      // First two calls fail, third succeeds
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: { message: 'Server error' } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: { message: 'Server error' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Success' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
          }),
        });

      const promise = callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      // Fast-forward through retry delays
      await jest.advanceTimersByTimeAsync(1000); // First retry delay
      await jest.advanceTimersByTimeAsync(2000); // Second retry delay

      const result = await promise;

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should return error after max retries', async () => {
      // All calls fail
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      const promise = callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      // Fast-forward through all retry delays
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(3); // Max retries
    });
  });

  describe('Session Metrics', () => {
    test('getSessionMetrics should return metrics', () => {
      const metrics = getSessionMetrics();
      
      expect(metrics).toHaveProperty('totalCalls');
      expect(metrics).toHaveProperty('successfulCalls');
      expect(metrics).toHaveProperty('failedCalls');
      expect(metrics).toHaveProperty('totalTokens');
      expect(metrics).toHaveProperty('totalCost');
      expect(metrics).toHaveProperty('byModel');
    });

    test('resetSessionMetrics should reset metrics', async () => {
      // Make a successful call
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      });

      await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      let metrics = getSessionMetrics();
      expect(metrics.totalCalls).toBeGreaterThan(0);

      // Reset
      resetSessionMetrics();

      metrics = getSessionMetrics();
      expect(metrics.totalCalls).toBe(0);
      expect(metrics.successfulCalls).toBe(0);
      expect(metrics.failedCalls).toBe(0);
      expect(metrics.totalTokens).toBe(0);
      expect(metrics.totalCost).toBe(0);
    });
  });

  describe('Rate Limiting Integration', () => {
    test('getRateLimitStatus should return status', () => {
      const status = getRateLimitStatus();
      
      expect(status).toHaveProperty('callsInWindow');
      expect(status).toHaveProperty('maxCalls');
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('queueLength');
    });
  });

  describe('API Request Structure', () => {
    test('should send correct headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      });

      await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const fetchCall = global.fetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toContain('Bearer');
    });

    test('should send correct request body structure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      });

      const messages = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ];

      await callLLM({
        model: 'gpt-5-nano',
        messages,
      });

      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      
      expect(requestBody.model).toBe('gpt-5-nano');
      expect(requestBody.messages).toEqual(messages);
      expect(requestBody).toHaveProperty('temperature');
    });

    test('should handle responses without usage data', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          // No usage field
        }),
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(true);
      expect(result.metrics.tokens).toBe(0);
      expect(result.metrics.promptTokens).toBe(0);
      expect(result.metrics.completionTokens).toBe(0);
    });

    test('should handle responses with empty content', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: {}, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
        }),
      });

      const result = await callLLM({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('');
    });
  });
});

