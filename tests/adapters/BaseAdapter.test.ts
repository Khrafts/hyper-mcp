import { BaseAdapter, AdapterMetadata, AdapterConfig } from '../../src/adapters/BaseAdapter.js';
import { z } from 'zod';

// Mock dependencies
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  healthCheck: jest.fn(),
  cleanup: jest.fn(),
};

jest.mock('../../src/utils/ApiClient.js', () => ({
  ApiClient: jest.fn().mockImplementation(() => mockApiClient),
}));

jest.mock('../../src/utils/logger.js', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  logPerformance: jest.fn(),
  logHealthCheck: jest.fn(),
  logConnection: jest.fn(),
}));

// Concrete implementation for testing
class TestAdapter extends BaseAdapter {
  private shouldValidate = true;
  private shouldInitialize = true;

  async initialize(): Promise<void> {
    if (!this.shouldInitialize) {
      throw new Error('Initialization failed');
    }
  }

  async validateConnection(): Promise<boolean> {
    return this.shouldValidate;
  }

  getEndpointInfo(endpoint: string) {
    if (endpoint === '/test') {
      return {
        path: '/test',
        method: 'GET',
        schema: z.object({ id: z.string() }),
      };
    }
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }

  // Test helpers
  setValidationResult(result: boolean) {
    this.shouldValidate = result;
  }

  setInitializationResult(result: boolean) {
    this.shouldInitialize = result;
  }

  // Expose protected methods for testing
  async testExecuteRequest<T>(endpoint: string, method: string, data?: any): Promise<T> {
    return this.executeRequest<T>(endpoint, method, data);
  }
}

describe('BaseAdapter', () => {
  let adapter: TestAdapter;

  const mockMetadata: AdapterMetadata = {
    name: 'test-adapter',
    version: '1.0.0',
    description: 'Test adapter',
    protocol: 'REST',
    baseUrl: 'https://api.test.com',
    endpoints: ['/test', '/health'],
    rateLimit: {
      requestsPerMinute: 60,
      burstLimit: 10,
    },
    authentication: {
      type: 'none',
      required: false,
    },
    capabilities: ['read', 'write'],
  };

  const mockConfig: AdapterConfig = {
    name: 'test-adapter',
    baseUrl: 'https://api.test.com',
    timeout: 30000,
    retries: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    },
    rateLimit: {
      requestsPerMinute: 60,
      burstLimit: 10,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new TestAdapter(mockMetadata, mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(adapter).toBeInstanceOf(BaseAdapter);
      expect(adapter.getName()).toBe('test-adapter');
      expect(adapter.getVersion()).toBe('1.0.0');
      expect(adapter.getProtocol()).toBe('REST');
    });

    it('should validate configuration schema', () => {
      const invalidConfig = {
        name: '',
        baseUrl: 'invalid-url',
        timeout: -1,
      };

      expect(() => new TestAdapter(mockMetadata, invalidConfig as AdapterConfig)).toThrow();
    });

    it('should initialize statistics', () => {
      const stats = adapter.getStatistics();
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.rateLimitHits).toBe(0);
      expect(stats.circuitBreakerTrips).toBe(0);
    });

    it('should initialize health status', () => {
      const health = adapter.getHealthStatus();
      expect(health.healthy).toBe(false);
      expect(health.lastChecked).toBe(0);
      expect(health.details).toEqual({});
    });

    it('should create metadata copy', () => {
      const metadata = adapter.getMetadata();
      expect(metadata).toEqual(mockMetadata);
      expect(metadata).not.toBe(mockMetadata); // Should be a copy
    });

    it('should create config copy', () => {
      const config = adapter.getConfig();
      expect(config.name).toBe('test-adapter');
      expect(config).not.toBe(mockConfig); // Should be a copy
    });
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      adapter.setInitializationResult(true);
      adapter.setValidationResult(true);

      await adapter.connect();

      expect(adapter.isHealthy()).toBe(false); // Health not checked yet
    });

    it('should handle connection failure during initialization', async () => {
      adapter.setInitializationResult(false);

      await expect(adapter.connect()).rejects.toThrow('Initialization failed');
    });

    it('should handle connection failure during validation', async () => {
      adapter.setInitializationResult(true);
      adapter.setValidationResult(false);

      await expect(adapter.connect()).rejects.toThrow('Connection validation failed');
    });

    it('should disconnect successfully', async () => {
      await adapter.disconnect();

      expect(mockApiClient.cleanup).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      mockApiClient.cleanup.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      await expect(adapter.disconnect()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('health checks', () => {
    beforeEach(() => {
      mockApiClient.healthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 100,
        details: { status: 'ok' },
      });
    });

    it('should perform health check successfully', async () => {
      adapter.setValidationResult(true);

      const health = await adapter.healthCheck(true);

      expect(health.healthy).toBe(false); // Not connected yet
      expect(health.latencyMs).toBe(100);
      expect(health.lastChecked).toBeGreaterThan(0);
      expect(health.details.apiClientHealthy).toBe(true);
      expect(health.details.connectionValid).toBe(true);
      expect(health.details.connected).toBe(false);
    });

    it('should use cached health status', async () => {
      adapter.setValidationResult(true);

      // First call
      const health1 = await adapter.healthCheck(true);
      mockApiClient.healthCheck.mockClear();

      // Second call without force should use cache
      const health2 = await adapter.healthCheck(false);

      expect(health2).toEqual(health1);
      expect(mockApiClient.healthCheck).not.toHaveBeenCalled();
    });

    it('should force health check when requested', async () => {
      adapter.setValidationResult(true);

      // First call
      await adapter.healthCheck(true);
      mockApiClient.healthCheck.mockClear();

      // Second call with force should check again
      await adapter.healthCheck(true);

      expect(mockApiClient.healthCheck).toHaveBeenCalled();
    });

    it('should handle health check errors', async () => {
      mockApiClient.healthCheck.mockRejectedValue(new Error('Health check failed'));

      const health = await adapter.healthCheck(true);

      expect(health.healthy).toBe(false);
      expect(health.errors).toEqual(['Health check failed']);
      expect(health.details.error).toBe('Health check failed');
    });

    it('should indicate unhealthy when not connected', async () => {
      mockApiClient.healthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 50,
        details: {},
      });
      adapter.setValidationResult(true);

      const health = await adapter.healthCheck(true);

      expect(health.healthy).toBe(false); // Not connected
      expect(health.details.connected).toBe(false);
    });
  });

  describe('request execution', () => {
    it('should execute GET request successfully', async () => {
      const mockResponse = { data: 'test' };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await adapter.testExecuteRequest('/test', 'GET');

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.get).toHaveBeenCalledWith('/test');

      const stats = adapter.getStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
    });

    it('should execute POST request successfully', async () => {
      const mockResponse = { data: 'created' };
      const requestData = { name: 'test' };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await adapter.testExecuteRequest('/test', 'POST', requestData);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith('/test', requestData);

      const stats = adapter.getStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
    });

    it('should execute PUT request successfully', async () => {
      const mockResponse = { data: 'updated' };
      const requestData = { name: 'updated' };
      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await adapter.testExecuteRequest('/test', 'PUT', requestData);

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.put).toHaveBeenCalledWith('/test', requestData);
    });

    it('should execute DELETE request successfully', async () => {
      const mockResponse = { data: 'deleted' };
      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await adapter.testExecuteRequest('/test', 'DELETE');

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.delete).toHaveBeenCalledWith('/test');
    });

    it('should handle unsupported HTTP methods', async () => {
      await expect(adapter.testExecuteRequest('/test', 'PATCH')).rejects.toThrow(
        'Unsupported HTTP method: PATCH'
      );
    });

    it('should track failed requests', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Request failed'));

      await expect(adapter.testExecuteRequest('/test', 'GET')).rejects.toThrow('Request failed');

      const stats = adapter.getStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(1);
    });

    it('should track rate limit hits', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Rate limit exceeded (429)'));

      await expect(adapter.testExecuteRequest('/test', 'GET')).rejects.toThrow(
        'Rate limit exceeded (429)'
      );

      const stats = adapter.getStatistics();
      expect(stats.rateLimitHits).toBe(1);
    });

    it('should track circuit breaker trips', async () => {
      mockApiClient.get.mockRejectedValue(new Error('circuit breaker tripped'));

      await expect(adapter.testExecuteRequest('/test', 'GET')).rejects.toThrow(
        'circuit breaker tripped'
      );

      const stats = adapter.getStatistics();
      expect(stats.circuitBreakerTrips).toBe(1);
    });

    it('should update average response time', async () => {
      // Mock Date.now to simulate time passing
      let mockTime = 1000000;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        mockTime += 50; // Add 50ms each time
        return mockTime;
      });

      mockApiClient.get.mockResolvedValueOnce({ data: '1' }).mockResolvedValueOnce({ data: '2' });

      // Simulate different response times
      await adapter.testExecuteRequest('/test', 'GET');
      await adapter.testExecuteRequest('/test', 'GET');

      const stats = adapter.getStatistics();
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.lastRequestTime).toBeGreaterThan(0);

      jest.restoreAllMocks();
    });
  });

  describe('authentication', () => {
    it('should build API key headers', () => {
      const configWithApiKey: AdapterConfig = {
        ...mockConfig,
        authentication: {
          type: 'api_key',
          credentials: {
            apiKey: 'test-key',
            apiKeyHeader: 'X-API-Key',
          },
        },
      };

      const adapterWithAuth = new TestAdapter(mockMetadata, configWithApiKey);
      expect(adapterWithAuth).toBeDefined();
    });

    it('should build bearer token headers', () => {
      const configWithBearer: AdapterConfig = {
        ...mockConfig,
        authentication: {
          type: 'bearer',
          credentials: {
            token: 'bearer-token',
          },
        },
      };

      const adapterWithAuth = new TestAdapter(mockMetadata, configWithBearer);
      expect(adapterWithAuth).toBeDefined();
    });

    it('should build OAuth headers', () => {
      const configWithOAuth: AdapterConfig = {
        ...mockConfig,
        authentication: {
          type: 'oauth',
          credentials: {
            accessToken: 'oauth-token',
          },
        },
      };

      const adapterWithAuth = new TestAdapter(mockMetadata, configWithOAuth);
      expect(adapterWithAuth).toBeDefined();
    });

    it('should handle no authentication', () => {
      const configNoAuth: AdapterConfig = {
        ...mockConfig,
        authentication: {
          type: 'none',
        },
      };

      const adapterNoAuth = new TestAdapter(mockMetadata, configNoAuth);
      expect(adapterNoAuth).toBeDefined();
    });
  });

  describe('endpoint management', () => {
    it('should return endpoint info for valid endpoint', () => {
      const info = adapter.getEndpointInfo('/test');

      expect(info).toEqual({
        path: '/test',
        method: 'GET',
        schema: expect.any(Object),
      });
    });

    it('should throw error for unknown endpoint', () => {
      expect(() => adapter.getEndpointInfo('/unknown')).toThrow('Unknown endpoint: /unknown');
    });
  });

  describe('getters', () => {
    it('should return adapter name', () => {
      expect(adapter.getName()).toBe('test-adapter');
    });

    it('should return adapter version', () => {
      expect(adapter.getVersion()).toBe('1.0.0');
    });

    it('should return protocol', () => {
      expect(adapter.getProtocol()).toBe('REST');
    });

    it('should return capabilities', () => {
      const capabilities = adapter.getCapabilities();
      expect(capabilities).toEqual(['read', 'write']);
      expect(capabilities).not.toBe(mockMetadata.capabilities); // Should be a copy
    });

    it('should return statistics with uptime', () => {
      // Mock Date.now to simulate time has passed since adapter creation
      const currentTime = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(currentTime + 5000); // 5 seconds later

      const stats = adapter.getStatistics();
      expect(stats.uptime).toBeGreaterThan(0);
      expect(typeof stats.uptime).toBe('number');

      jest.restoreAllMocks();
    });

    it('should return health status copy', () => {
      const health1 = adapter.getHealthStatus();
      const health2 = adapter.getHealthStatus();

      expect(health1).toEqual(health2);
      expect(health1).not.toBe(health2); // Should be a copy
    });

    it('should indicate healthy status', () => {
      // Initially not healthy
      expect(adapter.isHealthy()).toBe(false);
    });
  });

  describe('configuration validation', () => {
    it('should accept minimal valid configuration', () => {
      const minimalConfig: AdapterConfig = {
        name: 'minimal',
        baseUrl: 'https://api.minimal.com',
        timeout: 30000,
      };

      expect(() => new TestAdapter(mockMetadata, minimalConfig)).not.toThrow();
    });

    it('should apply default values', () => {
      const minimalConfig: AdapterConfig = {
        name: 'minimal',
        baseUrl: 'https://api.minimal.com',
        timeout: 30000,
      };

      const adapter = new TestAdapter(mockMetadata, minimalConfig);
      const config = adapter.getConfig();

      expect(config.timeout).toBe(30000); // Default timeout
    });

    it('should validate required fields', () => {
      const invalidConfigs = [
        { baseUrl: 'https://api.test.com' }, // Missing name
        { name: 'test' }, // Missing baseUrl
        { name: '', baseUrl: 'https://api.test.com' }, // Empty name
        { name: 'test', baseUrl: 'invalid-url' }, // Invalid URL
      ];

      invalidConfigs.forEach((config) => {
        expect(() => new TestAdapter(mockMetadata, config as AdapterConfig)).toThrow();
      });
    });

    it('should validate nested configuration objects', () => {
      const configWithInvalidRetries: AdapterConfig = {
        name: 'test',
        baseUrl: 'https://api.test.com',
        timeout: 30000,
        retries: {
          maxRetries: -1, // Invalid
          baseDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
        },
      };

      expect(() => new TestAdapter(mockMetadata, configWithInvalidRetries)).toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle non-Error exceptions', async () => {
      mockApiClient.get.mockRejectedValue('String error');

      await expect(adapter.testExecuteRequest('/test', 'GET')).rejects.toBe('String error');

      const stats = adapter.getStatistics();
      expect(stats.failedRequests).toBe(1);
    });

    it('should handle health check non-Error exceptions', async () => {
      mockApiClient.healthCheck.mockRejectedValue('Health check string error');

      const health = await adapter.healthCheck(true);

      expect(health.healthy).toBe(false);
      expect(health.errors).toEqual(['Unknown error']);
      expect(health.details.error).toBe('Unknown error');
    });

    it('should handle missing authentication credentials gracefully', () => {
      const configWithIncompleteAuth: AdapterConfig = {
        ...mockConfig,
        authentication: {
          type: 'api_key',
          credentials: {
            // Missing apiKey and apiKeyHeader
          },
        },
      };

      expect(() => new TestAdapter(mockMetadata, configWithIncompleteAuth)).not.toThrow();
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple requests and track statistics correctly', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ data: '1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ data: '3' });

      // Successful request
      await adapter.testExecuteRequest('/test', 'GET');

      // Failed request
      await expect(adapter.testExecuteRequest('/test', 'GET')).rejects.toThrow('Failed');

      // Another successful request
      await adapter.testExecuteRequest('/test', 'GET');

      const stats = adapter.getStatistics();
      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle connect -> disconnect -> connect cycle', async () => {
      // Reset cleanup mock to avoid interference from previous test
      mockApiClient.cleanup.mockReset();
      mockApiClient.cleanup.mockImplementation(() => {}); // Reset to successful cleanup

      adapter.setInitializationResult(true);
      adapter.setValidationResult(true);

      // Connect
      await adapter.connect();

      // Disconnect
      await adapter.disconnect();

      // Connect again
      await adapter.connect();

      expect(mockApiClient.cleanup).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent health checks', async () => {
      mockApiClient.healthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 100,
        details: {},
      });

      // Start multiple health checks concurrently
      const healthChecks = [
        adapter.healthCheck(true),
        adapter.healthCheck(true),
        adapter.healthCheck(true),
      ];

      const results = await Promise.all(healthChecks);

      results.forEach((result) => {
        expect(result.healthy).toBe(false); // Not connected
        expect(result.latencyMs).toBe(100);
      });
    });
  });
});
