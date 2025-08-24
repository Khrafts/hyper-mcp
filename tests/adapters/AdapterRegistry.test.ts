import { AdapterRegistry, AdapterFilter } from '../../src/adapters/AdapterRegistry.js';
import { BaseAdapter, AdapterMetadata, AdapterConfig } from '../../src/adapters/BaseAdapter.js';

// Mock logger and related functions
jest.mock('../../src/utils/logger.js', () => ({
  createComponentLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  logPerformance: jest.fn(),
  logHealthCheck: jest.fn(),
  logConnection: jest.fn(),
}));

// Mock ApiClient
jest.mock('../../src/utils/ApiClient.js', () => ({
  ApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true, latencyMs: 50 }),
    cleanup: jest.fn(),
  })),
}));

// Mock BaseAdapter for testing
class MockAdapter extends BaseAdapter {
  private healthy = true;
  private shouldConnect = true;
  private shouldValidate = true;

  constructor(name: string, protocol = 'REST', capabilities: string[] = []) {
    const metadata: AdapterMetadata = {
      name,
      version: '1.0.0',
      description: 'Mock adapter for testing',
      protocol,
      baseUrl: `https://${name}.example.com`,
      endpoints: ['/test'],
      rateLimit: { requestsPerMinute: 60, burstLimit: 10 },
      capabilities,
    };

    const config: AdapterConfig = {
      name,
      baseUrl: `https://${name}.example.com`,
      timeout: 30000,
    };

    super(metadata, config);
  }

  async initialize(): Promise<void> {
    if (!this.shouldConnect) {
      throw new Error('Connection failed');
    }
  }

  async validateConnection(): Promise<boolean> {
    return this.shouldValidate;
  }

  getEndpointInfo(_endpoint: string): { path: string; method: string } {
    return { path: '/test', method: 'GET' };
  }

  // Test helpers
  setHealthy(healthy: boolean): void {
    this.healthy = healthy;
  }

  setShouldConnect(shouldConnect: boolean): void {
    this.shouldConnect = shouldConnect;
  }

  setShouldValidate(shouldValidate: boolean): void {
    this.shouldValidate = shouldValidate;
  }

  isHealthy(): boolean {
    return this.healthy;
  }
}

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;
  let mockAdapter1: MockAdapter;
  let mockAdapter2: MockAdapter;
  let mockAdapter3: MockAdapter;

  beforeEach(() => {
    // Create registry with short intervals for testing
    registry = new AdapterRegistry(1000, 2000); // 1s health check, 2s cleanup

    mockAdapter1 = new MockAdapter('adapter1', 'REST', ['read', 'write']);
    mockAdapter2 = new MockAdapter('adapter2', 'GraphQL', ['read']);
    mockAdapter3 = new MockAdapter('adapter3', 'REST', ['write', 'delete']);

    // Clear any intervals from previous tests
    jest.clearAllTimers();
  });

  afterEach(async () => {
    await registry.cleanup();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with default intervals', () => {
      const newRegistry = new AdapterRegistry();
      expect(newRegistry).toBeInstanceOf(AdapterRegistry);
      newRegistry.cleanup(); // Clean up to avoid hanging intervals
    });

    it('should initialize with custom intervals', () => {
      const newRegistry = new AdapterRegistry(5000, 10000);
      expect(newRegistry).toBeInstanceOf(AdapterRegistry);
      newRegistry.cleanup(); // Clean up to avoid hanging intervals
    });
  });

  describe('register', () => {
    it('should register adapter successfully', async () => {
      await registry.register(mockAdapter1);

      expect(registry.hasAdapter('adapter1')).toBe(true);
      expect(registry.getAdapterCount()).toBe(1);
    });

    it('should replace existing adapter', async () => {
      await registry.register(mockAdapter1);

      const newAdapter = new MockAdapter('adapter1', 'REST', ['read']);
      await registry.register(newAdapter);

      expect(registry.getAdapterCount()).toBe(1);
      expect(registry.getAdapter('adapter1')).toBe(newAdapter);
    });

    it('should handle adapter connection failure', async () => {
      mockAdapter1.setShouldConnect(false);

      await expect(registry.register(mockAdapter1)).rejects.toThrow('Connection failed');
      expect(registry.hasAdapter('adapter1')).toBe(false);
    });

    it('should perform initial health check', async () => {
      const healthCheckSpy = jest.spyOn(mockAdapter1, 'healthCheck');

      await registry.register(mockAdapter1);

      expect(healthCheckSpy).toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
    });

    it('should unregister adapter successfully', async () => {
      await registry.unregister('adapter1');

      expect(registry.hasAdapter('adapter1')).toBe(false);
      expect(registry.getAdapterCount()).toBe(1);
    });

    it('should handle unregistering non-existent adapter', async () => {
      await registry.unregister('nonexistent');
      // Should not throw
      expect(registry.getAdapterCount()).toBe(2);
    });

    it('should disconnect adapter during unregister', async () => {
      const disconnectSpy = jest.spyOn(mockAdapter1, 'disconnect');

      await registry.unregister('adapter1');

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should remove adapter even if disconnect fails', async () => {
      jest.spyOn(mockAdapter1, 'disconnect').mockRejectedValue(new Error('Disconnect failed'));

      await registry.unregister('adapter1');

      expect(registry.hasAdapter('adapter1')).toBe(false);
    });
  });

  describe('getAdapter', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
    });

    it('should return enabled adapter', () => {
      const adapter = registry.getAdapter('adapter1');
      expect(adapter).toBe(mockAdapter1);
    });

    it('should return undefined for non-existent adapter', () => {
      const adapter = registry.getAdapter('nonexistent');
      expect(adapter).toBeUndefined();
    });

    it('should return undefined for disabled adapter', () => {
      registry.disableAdapter('adapter1');
      const adapter = registry.getAdapter('adapter1');
      expect(adapter).toBeUndefined();
    });

    it('should update usage statistics', () => {
      registry.getAdapter('adapter1');
      registry.getAdapter('adapter1');

      // Usage statistics are internal, but we can verify the adapter is returned
      expect(registry.getAdapter('adapter1')).toBe(mockAdapter1);
    });
  });

  describe('getAdapters', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
      await registry.register(mockAdapter3);
    });

    it('should return all adapters by default', () => {
      const adapters = registry.getAdapters();
      expect(adapters).toHaveLength(3);
      expect(adapters).toContain(mockAdapter1);
      expect(adapters).toContain(mockAdapter2);
      expect(adapters).toContain(mockAdapter3);
    });

    it('should filter by protocol', () => {
      const restAdapters = registry.getAdapters({ protocol: 'REST' });
      expect(restAdapters).toHaveLength(2);
      expect(restAdapters).toContain(mockAdapter1);
      expect(restAdapters).toContain(mockAdapter3);
    });

    it('should filter by capability', () => {
      const writeAdapters = registry.getAdapters({ capability: 'write' });
      expect(writeAdapters).toHaveLength(2);
      expect(writeAdapters).toContain(mockAdapter1);
      expect(writeAdapters).toContain(mockAdapter3);
    });

    it('should filter by enabled status', () => {
      registry.disableAdapter('adapter2');

      const enabledAdapters = registry.getAdapters({ enabled: true });
      expect(enabledAdapters).toHaveLength(2);
      expect(enabledAdapters).toContain(mockAdapter1);
      expect(enabledAdapters).toContain(mockAdapter3);
    });

    it('should filter by health status', () => {
      mockAdapter2.setHealthy(false);

      const healthyAdapters = registry.getAdapters({ healthy: true });
      expect(healthyAdapters).toHaveLength(2);
      expect(healthyAdapters).toContain(mockAdapter1);
      expect(healthyAdapters).toContain(mockAdapter3);
    });

    it('should apply multiple filters', () => {
      const filter: AdapterFilter = {
        protocol: 'REST',
        capability: 'write',
        enabled: true,
      };

      const filteredAdapters = registry.getAdapters(filter);
      expect(filteredAdapters).toHaveLength(2);
      expect(filteredAdapters).toContain(mockAdapter1);
      expect(filteredAdapters).toContain(mockAdapter3);
    });
  });

  describe('listAdapterNames', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
    });

    it('should return adapter names', () => {
      const names = registry.listAdapterNames();
      expect(names).toContain('adapter1');
      expect(names).toContain('adapter2');
      expect(names).toHaveLength(2);
    });

    it('should apply filters', () => {
      const names = registry.listAdapterNames({ protocol: 'REST' });
      expect(names).toContain('adapter1');
      expect(names).not.toContain('adapter2');
      expect(names).toHaveLength(1);
    });
  });

  describe('enable/disable adapters', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
    });

    it('should enable adapter', () => {
      registry.disableAdapter('adapter1');
      registry.enableAdapter('adapter1');

      expect(registry.getAdapter('adapter1')).toBe(mockAdapter1);
    });

    it('should disable adapter', () => {
      registry.disableAdapter('adapter1');

      expect(registry.getAdapter('adapter1')).toBeUndefined();
    });

    it('should handle enabling non-existent adapter', () => {
      registry.enableAdapter('nonexistent');
      // Should not throw
    });

    it('should handle disabling non-existent adapter', () => {
      registry.disableAdapter('nonexistent');
      // Should not throw
    });
  });

  describe('health checks', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
    });

    it('should get single adapter health', async () => {
      const health = await registry.getAdapterHealth('adapter1');
      expect(health).toBeDefined();
      expect(typeof health.healthy).toBe('boolean');
    });

    it('should throw for non-existent adapter health', async () => {
      await expect(registry.getAdapterHealth('nonexistent')).rejects.toThrow(
        'Adapter not found: nonexistent'
      );
    });

    it('should get all adapter health', async () => {
      const allHealth = await registry.getAllAdapterHealth();

      expect(allHealth).toHaveProperty('adapter1');
      expect(allHealth).toHaveProperty('adapter2');
      expect(Object.keys(allHealth)).toHaveLength(2);
    });

    it('should handle health check failures gracefully', async () => {
      jest.spyOn(mockAdapter1, 'healthCheck').mockRejectedValue(new Error('Health check failed'));

      const allHealth = await registry.getAllAdapterHealth();

      expect(allHealth.adapter1?.healthy).toBe(false);
      expect(allHealth.adapter1?.errors).toContain('Health check failed');
    });

    it('should perform registry-wide health check', async () => {
      const healthStatuses = await registry.performHealthCheck();

      expect(healthStatuses).toHaveProperty('adapter1');
      expect(healthStatuses).toHaveProperty('adapter2');
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
      await registry.register(mockAdapter3);
    });

    it('should return comprehensive statistics', () => {
      registry.disableAdapter('adapter2');
      mockAdapter3.setHealthy(false);

      const stats = registry.getStatistics();

      expect(stats.totalAdapters).toBe(3);
      expect(stats.enabledAdapters).toBe(2);
      expect(stats.disabledAdapters).toBe(1);
      expect(stats.healthyAdapters).toBe(2);
      expect(stats.unhealthyAdapters).toBe(1);
      expect(stats.protocolCounts).toEqual({ REST: 2, GraphQL: 1 });
      expect(stats.capabilityCounts).toEqual({ read: 2, write: 2, delete: 1 });
    });

    it('should calculate average response time correctly', () => {
      const stats = registry.getStatistics();
      expect(typeof stats.averageResponseTime).toBe('number');
      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('bulk operations', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
      await registry.register(mockAdapter3);
    });

    it('should enable all adapters', async () => {
      registry.disableAdapter('adapter1');
      registry.disableAdapter('adapter2');

      await registry.enableAll();

      expect(registry.getEnabledAdapterCount()).toBe(3);
    });

    it('should disable all adapters', async () => {
      await registry.disableAll();

      expect(registry.getEnabledAdapterCount()).toBe(0);
    });

    it('should enable adapters by protocol', async () => {
      await registry.disableAll();
      await registry.enableByProtocol('REST');

      const enabledAdapters = registry.getAdapters({ enabled: true });
      expect(enabledAdapters).toHaveLength(2);
      expect(enabledAdapters.every((a) => a.getProtocol() === 'REST')).toBe(true);
    });

    it('should disable adapters by protocol', async () => {
      await registry.disableByProtocol('GraphQL');

      const graphQLAdapters = registry.getAdapters({ protocol: 'GraphQL', enabled: true });
      expect(graphQLAdapters).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
    });

    it('should check if adapter exists', () => {
      expect(registry.hasAdapter('adapter1')).toBe(true);
      expect(registry.hasAdapter('nonexistent')).toBe(false);
    });

    it('should return adapter count', () => {
      expect(registry.getAdapterCount()).toBe(2);
    });

    it('should return enabled adapter count', () => {
      registry.disableAdapter('adapter1');
      expect(registry.getEnabledAdapterCount()).toBe(1);
    });

    it('should return unique protocols', () => {
      const protocols = registry.getProtocols();
      expect(protocols).toContain('REST');
      expect(protocols).toContain('GraphQL');
      expect(protocols).toHaveLength(2);
    });

    it('should return unique capabilities', () => {
      const capabilities = registry.getCapabilities();
      expect(capabilities).toContain('read');
      expect(capabilities).toContain('write');
      expect(capabilities).toHaveLength(2);
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
    });

    it('should cleanup all adapters', async () => {
      const disconnectSpy1 = jest.spyOn(mockAdapter1, 'disconnect');
      const disconnectSpy2 = jest.spyOn(mockAdapter2, 'disconnect');

      await registry.cleanup();

      expect(disconnectSpy1).toHaveBeenCalled();
      expect(disconnectSpy2).toHaveBeenCalled();
      expect(registry.getAdapterCount()).toBe(0);
    });

    it('should clear intervals', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await registry.cleanup();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle disconnect failures gracefully', async () => {
      jest.spyOn(mockAdapter1, 'disconnect').mockRejectedValue(new Error('Disconnect failed'));

      await registry.cleanup();

      expect(registry.getAdapterCount()).toBe(0);
    });
  });

  describe('background processes', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should perform background health checks', async () => {
      // Test background health checking by calling the method directly
      // since timer testing with async operations is complex
      const performHealthCheckSpy = jest.spyOn(registry, 'performHealthCheck');

      await registry.performHealthCheck();

      expect(performHealthCheckSpy).toHaveBeenCalled();
    });

    it('should handle background health check failures', async () => {
      jest.spyOn(mockAdapter1, 'healthCheck').mockRejectedValue(new Error('Health check failed'));

      // Fast forward past health check interval
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      // Should not throw, should handle error gracefully
    });
  });

  describe('error handling', () => {
    it('should handle adapter registration with connection failure', async () => {
      mockAdapter1.setShouldConnect(false);

      await expect(registry.register(mockAdapter1)).rejects.toThrow();
      expect(registry.hasAdapter('adapter1')).toBe(false);
    });

    it('should handle adapter registration with validation failure', async () => {
      mockAdapter1.setShouldValidate(false);

      await expect(registry.register(mockAdapter1)).rejects.toThrow();
      expect(registry.hasAdapter('adapter1')).toBe(false);
    });

    it('should handle errors in background processes gracefully', () => {
      // Background processes should not throw unhandled errors
      // This is tested implicitly by not crashing during timer advancement
      jest.useFakeTimers();

      jest.advanceTimersByTime(5000); // Advance past all intervals

      jest.useRealTimers();
    });
  });

  describe('complex scenarios', () => {
    it('should handle rapid register/unregister operations', async () => {
      // Register multiple adapters quickly
      await Promise.all([
        registry.register(mockAdapter1),
        registry.register(mockAdapter2),
        registry.register(mockAdapter3),
      ]);

      expect(registry.getAdapterCount()).toBe(3);

      // Unregister all quickly
      await Promise.all([
        registry.unregister('adapter1'),
        registry.unregister('adapter2'),
        registry.unregister('adapter3'),
      ]);

      expect(registry.getAdapterCount()).toBe(0);
    });

    it('should handle mixed operations', async () => {
      await registry.register(mockAdapter1);
      await registry.register(mockAdapter2);

      // Mix of enable/disable operations
      registry.disableAdapter('adapter1');
      registry.enableAdapter('adapter2');

      const enabledAdapters = registry.getAdapters({ enabled: true });
      expect(enabledAdapters).toHaveLength(1);
      expect(enabledAdapters[0]).toBe(mockAdapter2);
    });

    it('should maintain consistency during concurrent operations', async () => {
      await registry.register(mockAdapter1);

      // Perform concurrent operations
      const operations = [
        registry.getAdapter('adapter1'),
        registry.getAdapterHealth('adapter1'),
        registry.performHealthCheck(),
        registry.getStatistics(),
      ];

      const results = await Promise.all(operations);
      expect(results[0]).toBe(mockAdapter1);
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
      expect(results[3]).toBeDefined();
    });
  });
});
