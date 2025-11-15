/**
 * LLM Rate Limiter
 * Implements sliding window rate limiting for LLM API calls
 * Limit: 15 calls per 10 second window
 */

class RateLimiter {
  constructor(maxCalls = 15, windowMs = 10000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.callTimestamps = [];
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Remove timestamps outside the current window
   */
  cleanOldTimestamps() {
    const now = Date.now();
    this.callTimestamps = this.callTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
  }

  /**
   * Check if we can make a call right now
   */
  canMakeCall() {
    this.cleanOldTimestamps();
    return this.callTimestamps.length < this.maxCalls;
  }

  /**
   * Get time until next available slot (in ms)
   */
  getTimeUntilNextSlot() {
    if (this.callTimestamps.length === 0) return 0;

    const oldestTimestamp = this.callTimestamps[0];
    const now = Date.now();
    const timeUntilSlotFree = this.windowMs - (now - oldestTimestamp);

    return Math.max(0, timeUntilSlotFree);
  }

  /**
   * Execute a function with rate limiting
   * @param {Function} fn - Async function to execute
   * @returns {Promise} Result of the function
   */
  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      if (this.canMakeCall()) {
        const { fn, resolve, reject } = this.queue.shift();
        this.callTimestamps.push(Date.now());

        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      } else {
        // Wait for next available slot
        const waitTime = this.getTimeUntilNextSlot();
        await new Promise(resolve => setTimeout(resolve, waitTime + 100));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get current rate limit status
   */
  getStatus() {
    this.cleanOldTimestamps();
    return {
      callsInWindow: this.callTimestamps.length,
      maxCalls: this.maxCalls,
      available: this.maxCalls - this.callTimestamps.length,
      queueLength: this.queue.length,
    };
  }

  /**
   * Reset the rate limiter
   */
  reset() {
    this.callTimestamps = [];
    this.queue = [];
    this.isProcessing = false;
  }
}

// Create a singleton instance
const rateLimiter = new RateLimiter();

export default rateLimiter;
export { RateLimiter };
