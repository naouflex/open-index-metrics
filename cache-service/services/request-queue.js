import pLimit from 'p-limit';

/**
 * Enhanced request queue with rate limiting, deduplication, and exponential backoff
 * Specifically designed for external APIs like DefiLlama that have strict rate limits
 */
export class RequestQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 2; // Max concurrent requests
    this.requestsPerSecond = options.requestsPerSecond || 5; // Rate limit
    this.retryAttempts = options.retryAttempts || 3;
    this.baseDelay = options.baseDelay || 1000; // Base delay for exponential backoff
    this.maxDelay = options.maxDelay || 30000; // Max delay for exponential backoff
    
    // Rate limiting
    this.requestTimes = [];
    this.limit = pLimit(this.concurrency);
    
    // Request deduplication - prevent duplicate concurrent requests
    this.pendingRequests = new Map();
    
    // Circuit breaker state
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.circuitThreshold = options.circuitThreshold || 5;
    this.circuitTimeout = options.circuitTimeout || 60000;
    
    console.log(`RequestQueue initialized: ${this.concurrency} concurrent, ${this.requestsPerSecond} req/sec`);
  }

  /**
   * Add a request to the queue with deduplication and rate limiting
   */
  async enqueue(requestKey, requestFn, options = {}) {
    // Check if we already have a pending request for this key
    if (this.pendingRequests.has(requestKey)) {
      console.log(`Deduplicating request: ${requestKey}`);
      return this.pendingRequests.get(requestKey);
    }

    // Create the request promise
    const requestPromise = this.limit(async () => {
      try {
        // Wait for rate limit
        await this.waitForRateLimit();
        
        // Check circuit breaker
        this.checkCircuitBreaker();
        
        // Execute the request with retry logic
        const result = await this.executeWithRetry(requestFn, options);
        
        // Success - reset circuit breaker
        this.onSuccess();
        
        return result;
      } catch (error) {
        // Failure - update circuit breaker
        this.onFailure();
        throw error;
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(requestKey);
      }
    });

    // Store the pending request
    this.pendingRequests.set(requestKey, requestPromise);
    
    return requestPromise;
  }

  /**
   * Wait for rate limit based on requests per second
   */
  async waitForRateLimit() {
    const now = Date.now();
    
    // Remove requests older than 1 second
    this.requestTimes = this.requestTimes.filter(time => now - time < 1000);
    
    // If we've hit the rate limit, wait
    if (this.requestTimes.length >= this.requestsPerSecond) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = 1000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limiting: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Record this request
    this.requestTimes.push(Date.now());
  }

  /**
   * Execute request with exponential backoff retry
   */
  async executeWithRetry(requestFn, options = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt - 1),
            this.maxDelay
          );
          console.log(`Retry attempt ${attempt}, waiting ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
        
        console.warn(`Request attempt ${attempt + 1} failed:`, error.message);
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is worth retrying
   */
  isNonRetryableError(error) {
    // Don't retry on 4xx errors (except 429 - rate limit)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return error.response.status !== 429; // Retry on rate limit
    }
    return false;
  }

  /**
   * Circuit breaker logic
   */
  checkCircuitBreaker() {
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.circuitTimeout) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      } else {
        this.circuitState = 'HALF_OPEN';
        console.log('Circuit breaker moving to HALF_OPEN');
      }
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'CLOSED';
      console.log('Circuit breaker CLOSED - service recovered');
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.circuitThreshold) {
      this.circuitState = 'OPEN';
      console.warn(`Circuit breaker OPEN after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      concurrency: this.concurrency,
      requestsPerSecond: this.requestsPerSecond,
      pendingRequests: this.pendingRequests.size,
      recentRequests: this.requestTimes.length,
      circuitState: this.circuitState,
      failureCount: this.failureCount
    };
  }

  /**
   * Clear all pending requests (for cleanup)
   */
  clear() {
    this.pendingRequests.clear();
    this.requestTimes = [];
    console.log('RequestQueue cleared');
  }
}

/**
 * Smart cache key generator that creates consistent keys for deduplication
 */
export function generateCacheKey(service, method, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  const paramString = Object.keys(sortedParams).length > 0 
    ? `:${JSON.stringify(sortedParams)}` 
    : '';
  
  return `${service}:${method}${paramString}`;
} 