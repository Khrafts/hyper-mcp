// Base Protocol Adapter Interface
export * from './BaseAdapter.js';
export * from './AdapterRegistry.js';

// Re-export commonly used types for convenience
export type {
  AdapterMetadata,
  AdapterHealthStatus,
  AdapterStatistics,
  AdapterConfig,
  ConnectionOptions,
  RequestContext,
} from './BaseAdapter.js';

export type {
  AdapterRegistryEntry,
  AdapterFilter,
  AdapterRegistryStatistics,
  IAdapterRegistry,
} from './AdapterRegistry.js';
