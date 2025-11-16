/**
 * LLM Service
 * Centralized service for all LLM API calls
 * Features: logging, retry logic, rate limiting, usage tracking
 */

import { OPENAI_API_KEY } from '@env';
import rateLimiter from './llmRateLimiter';
import logger from './llmLogger';

// OpenAI API Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Supported models
const SUPPORTED_MODELS = [
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-4o',
  'gpt-4o-mini',
];

// Error types
const ErrorTypes = {
  NETWORK: 'NetworkError',
  API: 'APIError',
  RATE_LIMIT: 'RateLimitError',
  AUTH: 'AuthError',
  QUOTA_EXCEEDED: 'QuotaExceededError',
  INVALID_REQUEST: 'InvalidRequestError',
  UNKNOWN: 'UnknownError',
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  multiplier: 2,
};

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determine error type from response
 */
function getErrorType(status, errorData) {
  if (status === 401) return ErrorTypes.AUTH;
  if (status === 429) {
    if (errorData?.error?.message?.toLowerCase().includes('quota')) {
      return ErrorTypes.QUOTA_EXCEEDED;
    }
    return ErrorTypes.RATE_LIMIT;
  }
  if (status === 400) return ErrorTypes.INVALID_REQUEST;
  if (status >= 500) return ErrorTypes.API;
  return ErrorTypes.UNKNOWN;
}

/**
 * Check if error should be retried
 */
function shouldRetry(errorType, attempt, maxRetries) {
  // Don't retry auth or quota errors
  if (errorType === ErrorTypes.AUTH || errorType === ErrorTypes.QUOTA_EXCEEDED) {
    return false;
  }

  // Don't retry if max attempts reached
  if (attempt >= maxRetries) {
    return false;
  }

  // Retry network errors, API errors, and rate limits
  return [ErrorTypes.NETWORK, ErrorTypes.API, ErrorTypes.RATE_LIMIT].includes(errorType);
}

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(attempt) {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.multiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make OpenAI API request
 */
async function makeOpenAIRequest(model, messages, temperature, maxTokens, otherOptions) {
  const startTime = Date.now();

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature !== undefined ? temperature : 0.7,
        max_tokens: maxTokens,
        ...otherOptions,
      }),
    });

    const duration = Date.now() - startTime;
    const responseData = await response.json();

    if (!response.ok) {
      const errorType = getErrorType(response.status, responseData);

      // Log critical errors clearly
      if (errorType === ErrorTypes.QUOTA_EXCEEDED) {
        logger.logCriticalError(errorType, 'OpenAI quota exceeded - add credits to your account');
      } else if (errorType === ErrorTypes.AUTH) {
        logger.logCriticalError(errorType, 'Invalid OpenAI API key');
      }

      return {
        success: false,
        errorType,
        error: new Error(responseData.error?.message || `API Error (${response.status})`),
        duration,
      };
    }

    // Extract data from response
    const content = responseData.choices?.[0]?.message?.content || '';
    const usage = responseData.usage || {};

    return {
      success: true,
      data: {
        content,
        finishReason: responseData.choices?.[0]?.finish_reason,
        raw: responseData,
      },
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Network or fetch error
    return {
      success: false,
      errorType: ErrorTypes.NETWORK,
      error: new Error(`Network error: ${error.message}`),
      duration,
    };
  }
}

/**
 * Make API request with retry logic
 */
async function makeRequestWithRetry(requestId, model, messages, temperature, maxTokens, otherOptions) {
  let attempt = 0;

  while (attempt < RETRY_CONFIG.maxRetries) {
    const result = await makeOpenAIRequest(model, messages, temperature, maxTokens, otherOptions);

    if (result.success) {
      // Success - log and return
      await logger.logSuccess({
        requestId,
        model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        duration: result.duration,
        response: result.data,
      });

      return {
        success: true,
        data: result.data,
        metrics: {
          tokens: result.usage.totalTokens,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          cost: logger.calculateCost(model, result.usage.promptTokens, result.usage.completionTokens),
          duration: result.duration,
        },
      };
    }

    // Check if we should retry
    if (!shouldRetry(result.errorType, attempt, RETRY_CONFIG.maxRetries)) {
      // Don't retry - log error and return
      await logger.logError({
        requestId,
        model,
        duration: result.duration,
        error: result.error,
        errorType: result.errorType,
      });

      return {
        success: false,
        error: {
          type: result.errorType,
          message: result.error.message,
          details: null,
        },
      };
    }

    // Retry - wait and try again
    attempt++;
    const delay = calculateBackoffDelay(attempt - 1);

    console.log(`[LLM] Retry ${attempt}/${RETRY_CONFIG.maxRetries} after ${delay}ms (${result.errorType})`);

    await sleep(delay);
  }

  // Max retries exceeded
  await logger.logError({
    requestId,
    model,
    duration: 0,
    error: new Error('Max retries exceeded'),
    errorType: ErrorTypes.UNKNOWN,
  });

  return {
    success: false,
    error: {
      type: ErrorTypes.UNKNOWN,
      message: 'Max retries exceeded',
      details: null,
    },
  };
}

/**
 * Call LLM API
 *
 * @param {Object} options - Request options
 * @param {string} options.model - Model to use (e.g., 'gpt-5-nano')
 * @param {Array} options.messages - Array of message objects with role and content
 * @param {number} [options.temperature=0.7] - Temperature for generation
 * @param {number} [options.maxTokens] - Maximum tokens to generate
 * @param {Object} [options.otherOptions] - Additional OpenAI API options
 *
 * @returns {Promise<Object>} Result object with success, data/error, and metrics
 *
 * @example
 * const result = await callLLM({
 *   model: 'gpt-5-nano',
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant' },
 *     { role: 'user', content: 'Hello!' }
 *   ],
 *   temperature: 0.7,
 *   maxTokens: 100
 * });
 *
 * if (result.success) {
 *   console.log(result.data.content);
 *   console.log('Cost:', result.metrics.cost);
 * } else {
 *   console.error(result.error.message);
 * }
 */
async function callLLM({ model = 'gpt-5', messages, temperature, maxTokens, ...otherOptions }) {
  // Validate model
  if (!SUPPORTED_MODELS.includes(model)) {
    return {
      success: false,
      error: {
        type: ErrorTypes.INVALID_REQUEST,
        message: `Unsupported model: ${model}. Supported models: ${SUPPORTED_MODELS.join(', ')}`,
        details: null,
      },
    };
  }

  // Validate messages
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return {
      success: false,
      error: {
        type: ErrorTypes.INVALID_REQUEST,
        message: 'Messages array is required and must not be empty',
        details: null,
      },
    };
  }

  const requestId = generateRequestId();

  // Execute with rate limiting
  return rateLimiter.execute(async () => {
    return makeRequestWithRetry(requestId, model, messages, temperature, maxTokens, otherOptions);
  });
}

/**
 * Get rate limiter status
 */
function getRateLimitStatus() {
  return rateLimiter.getStatus();
}

/**
 * Get session metrics
 */
function getSessionMetrics() {
  return logger.getSessionMetrics();
}

/**
 * Reset session metrics
 */
function resetSessionMetrics() {
  logger.resetSessionMetrics();
}

export {
  callLLM,
  getRateLimitStatus,
  getSessionMetrics,
  resetSessionMetrics,
  SUPPORTED_MODELS,
  ErrorTypes,
};
