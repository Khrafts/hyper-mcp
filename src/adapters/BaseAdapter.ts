import { ApiClient, ApiClientConfig } from '../utils/ApiClient.js';
import { createComponentLogger, logPerformance, logHealthCheck, logConnection } from '../utils/logger.js';
import { z } from 'zod';

const logger = createComponentLogger('BASE_ADAPTER');

export interface AdapterMetadata {
  name: string;
  version: string;
  description: string;
  protocol: string;
  baseUrl: string;
  endpoints: string[];
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  authentication?: {
    type: 'none' | 'api_key' | 'bearer' | 'oauth' | 'custom';
    required: boolean;
    fields?: string[];
  };
  capabilities: string[];
}

export interface AdapterHealthStatus {
  healthy: boolean;
  latencyMs?: number;
  lastChecked: number;
  errors?: string[];
  details: Record<string, unknown>;
}

export interface AdapterStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: number;
  uptime: number;
  rateLimitHits: number;
  circuitBreakerTrips: number;
}

export interface ConnectionOptions {
  timeout: number;
  retries: number;
  backoff: 'linear' | 'exponential';
  keepAlive: boolean;
  maxConnections: number;
}

export interface RequestContext {
  requestId: string;
  timestamp: number;
  endpoint: string;
  method: string;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

export const AdapterConfigSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  timeout: z.number().positive().optional().default(30000),
  retries: z.object({
    maxRetries: z.number().min(0).default(3),
    baseDelay: z.number().positive().default(1000),
    maxDelay: z.number().positive().default(30000),
    backoffMultiplier: z.number().positive().default(2),
  }).optional(),
  rateLimit: z.object({
    requestsPerMinute: z.number().positive().default(60),
    burstLimit: z.number().positive().default(10),
  }).optional(),
  authentication: z.object({
    type: z.enum(['none', 'api_key', 'bearer', 'oauth', 'custom']).default('none'),
    credentials: z.record(z.string()).optional(),
  }).optional(),
  connection: z.object({
    keepAlive: z.boolean().default(true),
    maxConnections: z.number().positive().default(20),
  }).optional(),
});

export type AdapterConfig = z.infer<typeof AdapterConfigSchema>;

export abstract class BaseAdapter {
  protected readonly metadata: AdapterMetadata;
  protected readonly config: AdapterConfig;
  protected readonly apiClient: ApiClient;
  protected readonly startTime: number;
  protected statistics: AdapterStatistics;
  private isConnected = false;
  private lastHealthCheck = 0;
  private healthStatus: AdapterHealthStatus;

  constructor(metadata: AdapterMetadata, config: AdapterConfig) {
    // Validate configuration
    const validatedConfig = AdapterConfigSchema.parse(config);
    
    this.metadata = metadata;
    this.config = validatedConfig;
    this.startTime = Date.now();

    // Initialize statistics
    this.statistics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      uptime: 0,
      rateLimitHits: 0,
      circuitBreakerTrips: 0,
    };

    // Initialize health status
    this.healthStatus = {
      healthy: false,
      lastChecked: 0,
      details: {},
    };

    // Create API client configuration
    const apiClientConfig: ApiClientConfig = {
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      retries: {
        maxRetries: this.config.retries?.maxRetries || 3,
        baseDelay: this.config.retries?.baseDelay || 1000,
        maxDelay: this.config.retries?.maxDelay || 30000,
        backoffMultiplier: this.config.retries?.backoffMultiplier || 2,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR'],
        retryableStatusCodes: [408, 429, 502, 503, 504],
      },
      rateLimit: {
        requestsPerMinute: this.config.rateLimit?.requestsPerMinute || metadata.rateLimit.requestsPerMinute,
        burstLimit: this.config.rateLimit?.burstLimit || metadata.rateLimit.burstLimit,
      },
      headers: this.buildAuthHeaders(),
      keepAlive: this.config.connection?.keepAlive !== false,
      maxConnections: this.config.connection?.maxConnections || 20,
    };

    this.apiClient = new ApiClient(metadata.name, apiClientConfig);

    logger.info('BaseAdapter initialized', {
      adapter_name: metadata.name,
      version: metadata.version,
      protocol: metadata.protocol,
      base_url: config.baseUrl,
    });
  }

  // Abstract methods that must be implemented by concrete adapters
  abstract initialize(): Promise<void>;
  abstract validateConnection(): Promise<boolean>;
  abstract getEndpointInfo(endpoint: string): { path: string; method: string; schema?: z.ZodSchema };

  // Connection management
  async connect(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Connecting adapter', {
        adapter: this.metadata.name,
        base_url: this.config.baseUrl,
      });

      await this.initialize();
      
      const connectionValid = await this.validateConnection();
      if (!connectionValid) {
        throw new Error('Connection validation failed');
      }

      this.isConnected = true;
      logConnection(this.metadata.name, 'connected', this.config.baseUrl);
      
      logPerformance(this.metadata.name, 'connection', startTime, {
        successful: true,
      });

    } catch (error) {
      this.isConnected = false;
      logConnection(this.metadata.name, 'disconnected', this.config.baseUrl, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      logPerformance(this.metadata.name, 'connection', startTime, {
        successful: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.apiClient.cleanup();
      this.isConnected = false;
      
      logConnection(this.metadata.name, 'disconnected', this.config.baseUrl);
      
      logger.info('Adapter disconnected', {
        adapter: this.metadata.name,
        uptime_ms: Date.now() - this.startTime,
      });
    } catch (error) {
      logger.error('Error during adapter disconnect', {
        adapter: this.metadata.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Health monitoring
  async healthCheck(force = false): Promise<AdapterHealthStatus> {
    const now = Date.now();
    const cacheTime = 30000; // 30 seconds

    // Return cached result if recent and not forced
    if (!force && (now - this.lastHealthCheck) < cacheTime) {
      return this.healthStatus;
    }
    
    try {
      const clientHealth = await this.apiClient.healthCheck();
      const connectionValid = await this.validateConnection();
      
      this.healthStatus = {
        healthy: clientHealth.healthy && connectionValid && this.isConnected,
        latencyMs: clientHealth.latencyMs,
        lastChecked: now,
        details: {
          connected: this.isConnected,
          connectionValid,
          apiClientHealthy: clientHealth.healthy,
          uptime: now - this.startTime,
          ...clientHealth,
        },
      };

      this.lastHealthCheck = now;
      
      logHealthCheck(this.metadata.name, this.healthStatus.healthy, {
        latency_ms: this.healthStatus.latencyMs,
        connected: this.isConnected,
      });

      return this.healthStatus;

    } catch (error) {
      this.healthStatus = {
        healthy: false,
        lastChecked: now,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        details: {
          connected: this.isConnected,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      logHealthCheck(this.metadata.name, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.healthStatus;
    }
  }

  // Request execution with statistics tracking
  protected async executeRequest<T>(
    endpoint: string,
    method: string,
    data?: any,
    context?: Partial<RequestContext>
  ): Promise<T> {
    const requestId = context?.requestId || `${this.metadata.name}-${Date.now()}`;
    const startTime = Date.now();

    this.statistics.totalRequests++;

    try {
      logger.debug('Executing adapter request', {
        adapter: this.metadata.name,
        request_id: requestId,
        endpoint,
        method,
      });

      let result: T;

      switch (method.toLowerCase()) {
        case 'get':
          result = await this.apiClient.get<T>(endpoint);
          break;
        case 'post':
          result = await this.apiClient.post<T>(endpoint, data);
          break;
        case 'put':
          result = await this.apiClient.put<T>(endpoint, data);
          break;
        case 'delete':
          result = await this.apiClient.delete<T>(endpoint);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      // Update statistics
      this.statistics.successfulRequests++;
      this.statistics.lastRequestTime = Date.now();
      this.updateAverageResponseTime(Date.now() - startTime);

      logPerformance(this.metadata.name, `${method.toLowerCase()}-${endpoint}`, startTime, {
        request_id: requestId,
        successful: true,
      });

      return result;

    } catch (error) {
      this.statistics.failedRequests++;
      
      // Track specific error types
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          this.statistics.rateLimitHits++;
        }
        if (error.message.includes('circuit breaker')) {
          this.statistics.circuitBreakerTrips++;
        }
      }

      logPerformance(this.metadata.name, `${method.toLowerCase()}-${endpoint}`, startTime, {
        request_id: requestId,
        successful: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // Authentication header builder
  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!this.config.authentication || this.config.authentication.type === 'none') {
      return headers;
    }

    const { type, credentials = {} } = this.config.authentication;

    switch (type) {
      case 'api_key':
        if (credentials.apiKey && credentials.apiKeyHeader) {
          headers[credentials.apiKeyHeader] = credentials.apiKey;
        }
        break;
      
      case 'bearer':
        if (credentials.token) {
          headers['Authorization'] = `Bearer ${credentials.token}`;
        }
        break;
      
      case 'oauth':
        if (credentials.accessToken) {
          headers['Authorization'] = `Bearer ${credentials.accessToken}`;
        }
        break;
    }

    return headers;
  }

  // Statistics helpers
  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.statistics.totalRequests;
    const currentAverage = this.statistics.averageResponseTime;
    
    // Calculate rolling average
    this.statistics.averageResponseTime = 
      ((currentAverage * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  // Public getters
  getMetadata(): AdapterMetadata {
    return { ...this.metadata };
  }

  getConfig(): AdapterConfig {
    return { ...this.config };
  }

  getStatistics(): AdapterStatistics {
    return {
      ...this.statistics,
      uptime: Date.now() - this.startTime,
    };
  }

  getHealthStatus(): AdapterHealthStatus {
    return { ...this.healthStatus };
  }

  isHealthy(): boolean {
    return this.healthStatus.healthy && this.isConnected;
  }

  getName(): string {
    return this.metadata.name;
  }

  getVersion(): string {
    return this.metadata.version;
  }

  getProtocol(): string {
    return this.metadata.protocol;
  }

  getCapabilities(): string[] {
    return [...this.metadata.capabilities];
  }
}