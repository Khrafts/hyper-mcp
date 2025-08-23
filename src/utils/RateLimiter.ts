import { createComponentLogger } from './logger.js';

const logger = createComponentLogger('RATE_LIMITER');

export interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  timeWindowMs?: number;
}

export class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private readonly defaultConfig: Required<RateLimitConfig>;

  constructor(defaultConfig: RateLimitConfig) {
    this.defaultConfig = {
      requestsPerMinute: defaultConfig.requestsPerMinute,
      burstLimit: defaultConfig.burstLimit,
      timeWindowMs: defaultConfig.timeWindowMs || 60000,
    };

    logger.info('RateLimiter initialized', {
      default_requests_per_minute: this.defaultConfig.requestsPerMinute,
      default_burst_limit: this.defaultConfig.burstLimit,
      time_window_ms: this.defaultConfig.timeWindowMs,
    });
  }

  async checkLimit(
    key: string,
    config?: Partial<RateLimitConfig>
  ): Promise<{ allowed: boolean; retryAfterMs?: number }> {
    const effectiveConfig = { ...this.defaultConfig, ...config };
    const bucket = this.getOrCreateBucket(key, effectiveConfig);

    this.refillBucket(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      logger.debug('Request allowed', {
        key,
        remaining_tokens: bucket.tokens,
        capacity: bucket.capacity,
      });
      return { allowed: true };
    }

    const retryAfterMs = this.calculateRetryDelay(bucket);
    logger.debug('Request rate limited', {
      key,
      tokens: bucket.tokens,
      retry_after_ms: retryAfterMs,
    });

    return { allowed: false, retryAfterMs };
  }

  async waitForAvailable(key: string, config?: Partial<RateLimitConfig>): Promise<void> {
    const result = await this.checkLimit(key, config);
    
    if (!result.allowed && result.retryAfterMs) {
      logger.debug('Waiting for rate limit availability', {
        key,
        wait_ms: result.retryAfterMs,
      });
      
      await new Promise(resolve => setTimeout(resolve, result.retryAfterMs));
      
      // Recursively check again after waiting
      return this.waitForAvailable(key, config);
    }
  }

  private getOrCreateBucket(key: string, config: Required<RateLimitConfig>): TokenBucket {
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = {
        tokens: config.burstLimit,
        lastRefill: Date.now(),
        capacity: config.burstLimit,
        refillRate: config.requestsPerMinute / (config.timeWindowMs / 1000), // tokens per second
      };
      
      this.buckets.set(key, bucket);
      
      logger.debug('Token bucket created', {
        key,
        initial_tokens: bucket.tokens,
        capacity: bucket.capacity,
        refill_rate: bucket.refillRate,
      });
    }
    
    return bucket;
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = Math.floor(timePassed * bucket.refillRate);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
      
      logger.debug('Token bucket refilled', {
        tokens_added: tokensToAdd,
        current_tokens: bucket.tokens,
        capacity: bucket.capacity,
      });
    }
  }

  private calculateRetryDelay(bucket: TokenBucket): number {
    const tokensNeeded = 1 - bucket.tokens;
    const timeForTokens = (tokensNeeded / bucket.refillRate) * 1000; // milliseconds
    return Math.ceil(timeForTokens);
  }

  // Get current status for monitoring
  getBucketStatus(key: string): {
    exists: boolean;
    tokens?: number;
    capacity?: number;
    lastRefill?: number;
  } {
    const bucket = this.buckets.get(key);
    
    if (!bucket) {
      return { exists: false };
    }

    // Refill before reporting status
    this.refillBucket(bucket);

    return {
      exists: true,
      tokens: bucket.tokens,
      capacity: bucket.capacity,
      lastRefill: bucket.lastRefill,
    };
  }

  // Clear old buckets to prevent memory leaks
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAgeMs) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.buckets.delete(key);
    }

    if (keysToDelete.length > 0) {
      logger.info('Rate limiter cleanup completed', {
        cleaned_buckets: keysToDelete.length,
        remaining_buckets: this.buckets.size,
      });
    }
  }

  // Get statistics
  getStatistics(): {
    totalBuckets: number;
    bucketsWithTokens: number;
    oldestBucketAge: number | null;
  } {
    const now = Date.now();
    let bucketsWithTokens = 0;
    let oldestBucketAge: number | null = null;

    for (const bucket of this.buckets.values()) {
      if (bucket.tokens > 0) {
        bucketsWithTokens++;
      }
      
      const age = now - bucket.lastRefill;
      if (oldestBucketAge === null || age > oldestBucketAge) {
        oldestBucketAge = age;
      }
    }

    return {
      totalBuckets: this.buckets.size,
      bucketsWithTokens,
      oldestBucketAge,
    };
  }
}