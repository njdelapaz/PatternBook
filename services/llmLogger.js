/**
 * LLM Logger
 * Handles console and file logging for LLM API calls
 * Tracks usage metrics: tokens, costs, response times
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Model pricing (per 1M tokens) - input/output
const MODEL_PRICING = {
  'gpt-5': { input: 1.25, output: 10.0 },
  'gpt-5-mini': { input: 0.25, output: 2.0 },
  'gpt-5-nano': { input: 0.05, output: 0.4 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

class LLMLogger {
  constructor() {
    this.logFilePath = `${FileSystem.documentDirectory}logs/llm-usage.json`;
    this.sessionMetrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
    };
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}logs`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}logs`, {
          intermediates: true,
        });
      }
    } catch (error) {
      console.error('[LLM Logger] Failed to create log directory:', error.message);
    }
  }

  /**
   * Calculate cost based on model and token usage
   */
  calculateCost(model, promptTokens, completionTokens) {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      return 0;
    }

    const inputCost = (promptTokens / 1000000) * pricing.input;
    const outputCost = (completionTokens / 1000000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Format tokens for display (e.g., 1234 -> "1.2k")
   */
  formatTokens(tokens) {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  }

  /**
   * Format cost for display
   */
  formatCost(cost) {
    if (cost < 0.01) {
      return `$${cost.toFixed(4)}`;
    }
    return `$${cost.toFixed(3)}`;
  }

  /**
   * Log successful API call
   */
  async logSuccess({ requestId, model, promptTokens, completionTokens, duration, response, messages }) {
    const totalTokens = promptTokens + completionTokens;
    const cost = this.calculateCost(model, promptTokens, completionTokens);

    // Console log (1-2 lines)
    console.log(
      `[LLM] ${model} | success ${duration}ms | ${this.formatTokens(totalTokens)} tokens | ${this.formatCost(cost)}`
    );
    console.log('[LLM] Messages sent:', JSON.stringify(messages, null, 2));

    // Update session metrics
    this.sessionMetrics.totalCalls++;
    this.sessionMetrics.successfulCalls++;
    this.sessionMetrics.totalTokens += totalTokens;
    this.sessionMetrics.totalCost += cost;

    if (!this.sessionMetrics.byModel[model]) {
      this.sessionMetrics.byModel[model] = {
        calls: 0,
        tokens: 0,
        cost: 0,
      };
    }
    this.sessionMetrics.byModel[model].calls++;
    this.sessionMetrics.byModel[model].tokens += totalTokens;
    this.sessionMetrics.byModel[model].cost += cost;

    // File log (structured JSON)
    const logEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      status: 'success',
      model,
      provider: 'openai',
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens,
      },
      cost,
      duration,
      messages,
      sessionMetrics: { ...this.sessionMetrics },
    };

    await this.writeToFile(logEntry);
  }

  /**
   * Log failed API call
   */
  async logError({ requestId, model, duration, error, errorType, messages }) {
    // Console log
    console.log(`[LLM] ${model} | error | ${error.message} (${errorType})`);
    console.log('[LLM] Messages sent:', JSON.stringify(messages, null, 2));

    // Update session metrics
    this.sessionMetrics.totalCalls++;
    this.sessionMetrics.failedCalls++;

    // File log (structured JSON)
    const logEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      status: 'error',
      model,
      provider: 'openai',
      error: {
        type: errorType,
        message: error.message,
        details: error.details || null,
      },
      duration,
      messages,
      sessionMetrics: { ...this.sessionMetrics },
    };

    await this.writeToFile(logEntry);
  }

  /**
   * Log critical errors (quota exceeded, auth failed)
   */
  logCriticalError(errorType, message) {
    console.error(`[ERROR] ${message}`);
  }

  /**
   * Write log entry to file
   */
  async writeToFile(logEntry) {
    try {
      // Read existing logs
      let logs = [];
      const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);

      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(this.logFilePath);
        try {
          logs = JSON.parse(fileContent);
        } catch {
          logs = [];
        }
      }

      // Append new log entry
      logs.push(logEntry);

      // Keep only last 1000 entries to prevent file from growing too large
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      // Write back to file
      await FileSystem.writeAsStringAsync(this.logFilePath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('[LLM Logger] Failed to write to log file:', error.message);
    }
  }

  /**
   * Get session metrics
   */
  getSessionMetrics() {
    return { ...this.sessionMetrics };
  }

  /**
   * Reset session metrics
   */
  resetSessionMetrics() {
    this.sessionMetrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
    };
  }

  /**
   * Read logs from file
   */
  async readLogs() {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);
      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(this.logFilePath);
        return JSON.parse(fileContent);
      }
      return [];
    } catch (error) {
      console.error('[LLM Logger] Failed to read log file:', error.message);
      return [];
    }
  }
}

// Create singleton instance
const logger = new LLMLogger();

export default logger;
export { LLMLogger, MODEL_PRICING };
