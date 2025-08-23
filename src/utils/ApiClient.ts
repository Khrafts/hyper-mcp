import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import https from 'https';
import { createComponentLogger, logRequest, logResponse, logError } from './logger.js';
import { RateLimiter, RateLimitConfig } from './RateLimiter.js';

const logger = createComponentLogger('API_CLIENT');

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  retryableStatusCodes: number[];
}

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: RetryConfig;
  rateLimit: RateLimitConfig;
  headers?: Record<string, string>;
  maxConnections?: number;
  keepAlive?: boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
}

class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  // private lastFailureTime = 0; // Unused currently
  private nextAttemptTime = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - requests blocked');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info('Circuit breaker reset to CLOSED');
    }
  }

  private onFailure(): void {
    this.failures++;
    // this.lastFailureTime = Date.now(); // Unused currently

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.config.resetTimeoutMs;
      
      logger.warn('Circuit breaker opened', {
        failures: this.failures,
        threshold: this.config.failureThreshold,
        reset_at: new Date(this.nextAttemptTime).toISOString(),
      });
    }
  }

  getState(): { state: string; failures: number; nextAttemptTime?: number } {
    return {
      state: this.state,
      failures: this.failures,
      nextAttemptTime: this.state === 'OPEN' ? this.nextAttemptTime : undefined,
    };
  }
}

export class ApiClient {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private component: string;

  constructor(component: string, config: ApiClientConfig) {
    this.component = component;
    this.rateLimiter = new RateLimiter(config.rateLimit);
    
    // Circuit breaker with 50% failure threshold as specified
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: Math.ceil(config.retries.maxRetries * 0.5),
      resetTimeoutMs: 30000, // 30 seconds
      monitoringPeriodMs: 60000, // 1 minute
    });

    // Create axios instance with connection pooling
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `hyperliquid-mcp/${component}`,
        ...config.headers,
      },
      httpsAgent: new https.Agent({
        keepAlive: config.keepAlive !== false,
        maxSockets: config.maxConnections || 20,
        maxFreeSockets: Math.floor((config.maxConnections || 20) / 10),
      }),
      validateStatus: (status) => status < 500, // Don't throw for 4xx errors
    });

    logger.info('ApiClient initialized', {
      component,
      base_url: config.baseURL,
      timeout_ms: config.timeout,
      max_retries: config.retries.maxRetries,
      rate_limit_per_minute: config.rateLimit.requestsPerMinute,
      max_connections: config.maxConnections || 20,
    });
  }

  async request<T = any>(
    config: AxiosRequestConfig,
    retryOverride?: Partial<RetryConfig>
  ): Promise<T> {
    const startTime = Date.now();
    const url = `${config.baseURL || this.client.defaults.baseURL}${config.url}`;
    
    // Check rate limits
    await this.rateLimiter.waitForAvailable(this.component);

    // Execute with circuit breaker
    return this.circuitBreaker.execute(async () => {
      return this.executeWithRetry<T>(config, retryOverride, startTime, url);
    });
  }

  private async executeWithRetry<T>(
    config: AxiosRequestConfig,
    retryOverride: Partial<RetryConfig> = {},
    startTime: number,
    url: string
  ): Promise<T> {
    const retryConfig = { ...this.getDefaultRetryConfig(), ...retryOverride };
    let lastError: Error;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        logRequest(this.component, config.method?.toUpperCase() || 'GET', url, startTime);
        
        const response: AxiosResponse<T> = await this.client.request(config);
        
        logResponse(
          this.component,
          config.method?.toUpperCase() || 'GET',
          url,
          response.status,
          startTime,
          JSON.stringify(response.data).length
        );

        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data;

      } catch (error) {
        const axiosError = error as AxiosError;
        lastError = axiosError;

        const shouldRetry = this.shouldRetry(axiosError, attempt, retryConfig);
        
        logError(this.component, axiosError, {
          attempt: attempt + 1,
          max_attempts: retryConfig.maxRetries + 1,
          will_retry: shouldRetry,
          url,
          method: config.method?.toUpperCase() || 'GET',
        });

        if (!shouldRetry) {
          break;
        }

        if (attempt < retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt, retryConfig);
          logger.debug('Retrying request after delay', {
            attempt: attempt + 1,
            delay_ms: delay,
            url,
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private shouldRetry(error: AxiosError, attempt: number, config: RetryConfig): boolean {
    if (attempt >= config.maxRetries) {
      return false;
    }

    // Check retryable status codes
    if (error.response?.status && config.retryableStatusCodes.includes(error.response.status)) {
      return true;
    }

    // Check retryable error codes
    if (error.code && config.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check error messages
    const errorMessage = error.message.toLowerCase();
    return config.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    const jitterDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // 50-100% of calculated delay
    return Math.min(jitterDelay, config.maxDelay);
  }

  private getDefaultRetryConfig(): RetryConfig {
    return {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR'],
      retryableStatusCodes: [408, 429, 502, 503, 504],
    };
  }

  // Convenience methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.get('/health', { timeout: 5000 });
      const latencyMs = Date.now() - startTime;
      
      return { healthy: true, latencyMs };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get client statistics
  getStatistics(): {
    component: string;
    rateLimiter: ReturnType<RateLimiter['getStatistics']>;
    circuitBreaker: ReturnType<CircuitBreaker['getState']>;
  } {
    return {
      component: this.component,
      rateLimiter: this.rateLimiter.getStatistics(),
      circuitBreaker: this.circuitBreaker.getState(),
    };
  }

  // Cleanup method
  cleanup(): void {
    this.rateLimiter.cleanup();
    logger.info('ApiClient cleanup completed', { component: this.component });
  }
}