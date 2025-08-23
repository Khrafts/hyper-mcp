import { BaseAdapter, AdapterHealthStatus } from './BaseAdapter.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('ADAPTER_REGISTRY');

export interface AdapterRegistryEntry {
  adapter: BaseAdapter;
  registeredAt: number;
  lastUsed: number;
  useCount: number;
  enabled: boolean;
}

export interface AdapterFilter {
  protocol?: string;
  capability?: string;
  enabled?: boolean;
  healthy?: boolean;
}

export interface AdapterRegistryStatistics {
  totalAdapters: number;
  enabledAdapters: number;
  disabledAdapters: number;
  healthyAdapters: number;
  unhealthyAdapters: number;
  protocolCounts: Record<string, number>;
  capabilityCounts: Record<string, number>;
  averageResponseTime: number;
  totalRequests: number;
}

export interface IAdapterRegistry {
  register(adapter: BaseAdapter): Promise<void>;
  unregister(adapterName: string): Promise<void>;
  getAdapter(adapterName: string): BaseAdapter | undefined;
  getAdapters(filter?: AdapterFilter): BaseAdapter[];
  listAdapterNames(filter?: AdapterFilter): string[];
  enableAdapter(adapterName: string): void;
  disableAdapter(adapterName: string): void;
  getAdapterHealth(adapterName: string): Promise<AdapterHealthStatus>;
  getAllAdapterHealth(): Promise<Record<string, AdapterHealthStatus>>;
  getStatistics(): AdapterRegistryStatistics;
  performHealthCheck(): Promise<Record<string, AdapterHealthStatus>>;
  cleanup(): Promise<void>;
}

export class AdapterRegistry implements IAdapterRegistry {
  private adapters = new Map<string, AdapterRegistryEntry>();
  private readonly healthCheckInterval: NodeJS.Timeout;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    healthCheckIntervalMs = 60000, // 1 minute
    cleanupIntervalMs = 300000 // 5 minutes
  ) {
    logger.info('AdapterRegistry initialized', {
      health_check_interval_ms: healthCheckIntervalMs,
      cleanup_interval_ms: cleanupIntervalMs,
    });

    // Start background health monitoring
    this.healthCheckInterval = setInterval(
      () => this.performBackgroundHealthCheck(),
      healthCheckIntervalMs
    );

    // Start background cleanup
    this.cleanupInterval = setInterval(
      () => this.performBackgroundCleanup(),
      cleanupIntervalMs
    );
  }

  async register(adapter: BaseAdapter): Promise<void> {
    const adapterName = adapter.getName();
    
    // Check if adapter already exists
    if (this.adapters.has(adapterName)) {
      logger.warn('Adapter already exists, replacing', {
        adapter_name: adapterName,
        previous_version: this.adapters.get(adapterName)?.adapter.getVersion(),
        new_version: adapter.getVersion(),
      });
      
      // Cleanup existing adapter
      await this.unregister(adapterName);
    }

    try {
      // Connect the adapter
      await adapter.connect();

      // Register the adapter
      const entry: AdapterRegistryEntry = {
        adapter,
        registeredAt: Date.now(),
        lastUsed: Date.now(),
        useCount: 0,
        enabled: true,
      };

      this.adapters.set(adapterName, entry);

      logger.info('Adapter registered successfully', {
        adapter_name: adapterName,
        version: adapter.getVersion(),
        protocol: adapter.getProtocol(),
        capabilities: adapter.getCapabilities(),
        total_adapters: this.adapters.size,
      });

      // Perform initial health check
      await adapter.healthCheck();

    } catch (error) {
      logger.error('Failed to register adapter', {
        adapter_name: adapterName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async unregister(adapterName: string): Promise<void> {
    const entry = this.adapters.get(adapterName);
    if (!entry) {
      logger.warn('Attempted to unregister non-existent adapter', {
        adapter_name: adapterName,
      });
      return;
    }

    try {
      // Disconnect the adapter
      await entry.adapter.disconnect();

      // Remove from registry
      this.adapters.delete(adapterName);

      logger.info('Adapter unregistered', {
        adapter_name: adapterName,
        uptime_ms: Date.now() - entry.registeredAt,
        use_count: entry.useCount,
        remaining_adapters: this.adapters.size,
      });

    } catch (error) {
      // Remove from registry even if disconnect fails
      this.adapters.delete(adapterName);
      
      logger.error('Error during adapter unregistration', {
        adapter_name: adapterName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  getAdapter(adapterName: string): BaseAdapter | undefined {
    const entry = this.adapters.get(adapterName);
    if (!entry || !entry.enabled) {
      logger.debug('Adapter not found or disabled', {
        adapter_name: adapterName,
        found: !!entry,
        enabled: entry?.enabled,
      });
      return undefined;
    }

    // Update usage statistics
    entry.lastUsed = Date.now();
    entry.useCount++;

    logger.debug('Adapter retrieved', {
      adapter_name: adapterName,
      use_count: entry.useCount,
      healthy: entry.adapter.isHealthy(),
    });

    return entry.adapter;
  }

  getAdapters(filter?: AdapterFilter): BaseAdapter[] {
    const adapters: BaseAdapter[] = [];

    for (const [, entry] of this.adapters.entries()) {
      // Apply filters
      if (filter?.enabled !== undefined && entry.enabled !== filter.enabled) {
        continue;
      }

      const adapter = entry.adapter;
      
      if (filter?.protocol && adapter.getProtocol() !== filter.protocol) {
        continue;
      }

      if (filter?.capability && !adapter.getCapabilities().includes(filter.capability)) {
        continue;
      }

      if (filter?.healthy !== undefined && adapter.isHealthy() !== filter.healthy) {
        continue;
      }

      adapters.push(adapter);
    }

    logger.debug('Adapters filtered', {
      filter,
      total_adapters: this.adapters.size,
      filtered_count: adapters.length,
    });

    return adapters;
  }

  listAdapterNames(filter?: AdapterFilter): string[] {
    return this.getAdapters(filter).map(adapter => adapter.getName());
  }

  enableAdapter(adapterName: string): void {
    const entry = this.adapters.get(adapterName);
    if (!entry) {
      logger.warn('Attempted to enable non-existent adapter', {
        adapter_name: adapterName,
      });
      return;
    }

    entry.enabled = true;
    logger.info('Adapter enabled', {
      adapter_name: adapterName,
      protocol: entry.adapter.getProtocol(),
    });
  }

  disableAdapter(adapterName: string): void {
    const entry = this.adapters.get(adapterName);
    if (!entry) {
      logger.warn('Attempted to disable non-existent adapter', {
        adapter_name: adapterName,
      });
      return;
    }

    entry.enabled = false;
    logger.info('Adapter disabled', {
      adapter_name: adapterName,
      protocol: entry.adapter.getProtocol(),
    });
  }

  async getAdapterHealth(adapterName: string): Promise<AdapterHealthStatus> {
    const entry = this.adapters.get(adapterName);
    if (!entry) {
      throw new Error(`Adapter not found: ${adapterName}`);
    }

    return await entry.adapter.healthCheck();
  }

  async getAllAdapterHealth(): Promise<Record<string, AdapterHealthStatus>> {
    const healthStatuses: Record<string, AdapterHealthStatus> = {};

    const healthChecks = Array.from(this.adapters.entries()).map(async ([name, entry]) => {
      try {
        const health = await entry.adapter.healthCheck();
        healthStatuses[name] = health;
      } catch (error) {
        healthStatuses[name] = {
          healthy: false,
          lastChecked: Date.now(),
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          details: { error: 'Health check failed' },
        };
      }
    });

    await Promise.allSettled(healthChecks);
    return healthStatuses;
  }

  getStatistics(): AdapterRegistryStatistics {
    let enabledCount = 0;
    let disabledCount = 0;
    let healthyCount = 0;
    let unhealthyCount = 0;
    let totalRequests = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    const protocolCounts: Record<string, number> = {};
    const capabilityCounts: Record<string, number> = {};

    for (const [, entry] of this.adapters.entries()) {
      const adapter = entry.adapter;
      const stats = adapter.getStatistics();

      // Count enabled/disabled
      if (entry.enabled) {
        enabledCount++;
      } else {
        disabledCount++;
      }

      // Count healthy/unhealthy
      if (adapter.isHealthy()) {
        healthyCount++;
      } else {
        unhealthyCount++;
      }

      // Count protocols
      const protocol = adapter.getProtocol();
      protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;

      // Count capabilities
      for (const capability of adapter.getCapabilities()) {
        capabilityCounts[capability] = (capabilityCounts[capability] || 0) + 1;
      }

      // Aggregate request statistics
      totalRequests += stats.totalRequests;
      if (stats.averageResponseTime > 0) {
        totalResponseTime += stats.averageResponseTime * stats.totalRequests;
        responseTimeCount += stats.totalRequests;
      }
    }

    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    return {
      totalAdapters: this.adapters.size,
      enabledAdapters: enabledCount,
      disabledAdapters: disabledCount,
      healthyAdapters: healthyCount,
      unhealthyAdapters: unhealthyCount,
      protocolCounts,
      capabilityCounts,
      averageResponseTime,
      totalRequests,
    };
  }

  async performHealthCheck(): Promise<Record<string, AdapterHealthStatus>> {
    logger.debug('Performing registry-wide health check', {
      adapter_count: this.adapters.size,
    });

    return await this.getAllAdapterHealth();
  }

  // Background health monitoring
  private async performBackgroundHealthCheck(): Promise<void> {
    try {
      const healthStatuses = await this.getAllAdapterHealth();
      
      let healthyCount = 0;
      let unhealthyCount = 0;
      const unhealthyAdapters: string[] = [];

      for (const [name, status] of Object.entries(healthStatuses)) {
        if (status.healthy) {
          healthyCount++;
        } else {
          unhealthyCount++;
          unhealthyAdapters.push(name);
        }
      }

      logger.debug('Background health check completed', {
        total_adapters: this.adapters.size,
        healthy_adapters: healthyCount,
        unhealthy_adapters: unhealthyCount,
        unhealthy_adapter_names: unhealthyAdapters,
      });

      if (unhealthyAdapters.length > 0) {
        logger.warn('Unhealthy adapters detected', {
          unhealthy_adapters: unhealthyAdapters,
        });
      }

    } catch (error) {
      logger.error('Background health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Background cleanup of unused adapters
  private async performBackgroundCleanup(): Promise<void> {
    try {
      const now = Date.now();
      const maxIdleTime = 24 * 60 * 60 * 1000; // 24 hours
      const adaptersToCleanup: string[] = [];

      for (const [name, entry] of this.adapters.entries()) {
        const idleTime = now - entry.lastUsed;
        const unhealthy = !entry.adapter.isHealthy();
        
        // Mark for cleanup if idle for too long or persistently unhealthy
        if ((idleTime > maxIdleTime && entry.useCount === 0) || 
            (unhealthy && idleTime > 60 * 60 * 1000)) { // 1 hour for unhealthy
          adaptersToCleanup.push(name);
        }
      }

      if (adaptersToCleanup.length > 0) {
        logger.info('Cleaning up idle/unhealthy adapters', {
          adapters_to_cleanup: adaptersToCleanup,
        });

        for (const adapterName of adaptersToCleanup) {
          await this.unregister(adapterName);
        }
      }

    } catch (error) {
      logger.error('Background cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Registry management
  async cleanup(): Promise<void> {
    logger.info('Starting adapter registry cleanup', {
      adapter_count: this.adapters.size,
    });

    // Clear intervals
    clearInterval(this.healthCheckInterval);
    clearInterval(this.cleanupInterval);

    // Disconnect all adapters
    const disconnectPromises = Array.from(this.adapters.keys()).map(
      adapterName => this.unregister(adapterName)
    );

    await Promise.allSettled(disconnectPromises);

    logger.info('Adapter registry cleanup completed', {
      remaining_adapters: this.adapters.size,
    });
  }

  // Bulk operations
  async enableAll(): Promise<void> {
    const adapterNames = Array.from(this.adapters.keys());
    adapterNames.forEach(name => this.enableAdapter(name));
    
    logger.info('All adapters enabled', {
      adapter_count: adapterNames.length,
    });
  }

  async disableAll(): Promise<void> {
    const adapterNames = Array.from(this.adapters.keys());
    adapterNames.forEach(name => this.disableAdapter(name));
    
    logger.info('All adapters disabled', {
      adapter_count: adapterNames.length,
    });
  }

  async enableByProtocol(protocol: string): Promise<void> {
    let enabledCount = 0;
    
    for (const [name, entry] of this.adapters.entries()) {
      if (entry.adapter.getProtocol() === protocol) {
        this.enableAdapter(name);
        enabledCount++;
      }
    }

    logger.info('Adapters enabled by protocol', {
      protocol,
      enabled_count: enabledCount,
    });
  }

  async disableByProtocol(protocol: string): Promise<void> {
    let disabledCount = 0;
    
    for (const [name, entry] of this.adapters.entries()) {
      if (entry.adapter.getProtocol() === protocol) {
        this.disableAdapter(name);
        disabledCount++;
      }
    }

    logger.info('Adapters disabled by protocol', {
      protocol,
      disabled_count: disabledCount,
    });
  }

  // Utility methods
  hasAdapter(adapterName: string): boolean {
    return this.adapters.has(adapterName);
  }

  getAdapterCount(): number {
    return this.adapters.size;
  }

  getEnabledAdapterCount(): number {
    return Array.from(this.adapters.values()).filter(entry => entry.enabled).length;
  }

  getProtocols(): string[] {
    const protocols = new Set<string>();
    for (const entry of this.adapters.values()) {
      protocols.add(entry.adapter.getProtocol());
    }
    return Array.from(protocols);
  }

  getCapabilities(): string[] {
    const capabilities = new Set<string>();
    for (const entry of this.adapters.values()) {
      entry.adapter.getCapabilities().forEach(cap => capabilities.add(cap));
    }
    return Array.from(capabilities);
  }
}