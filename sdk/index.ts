// Main SDK exports
export * from './types/index.js';
export * from './utilities/ProtocolBuilder.js';
export * from './templates/index.js';

// Import functions for use in this file
import { createProtocol, createEndpoint } from './utilities/ProtocolBuilder.js';

// Utilities
export {
  CommunityProtocolBuilder,
  CommunityEndpointBuilder,
  CommunityParameterBuilder,
  createProtocol,
  createEndpoint,
  createParameter,
} from './utilities/ProtocolBuilder.js';

// Templates
export {
  protocolTemplates,
  getTemplate,
  getTemplatesByCategory,
  getAllTemplates,
  getTemplateCategories,
} from './templates/index.js';

// SDK version and info
export const SDK_VERSION = '1.0.0';
export const SDK_NAME = 'HyperMCP Community SDK';

// Helper functions
export function validateProtocolName(name: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name);
}

export function validateVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

export function generateProtocolId(name: string, version: string): string {
  return `${name}@${version}`;
}

// Common authentication configurations
export const AUTH_CONFIGS = {
  API_KEY_HEADER: {
    type: 'api_key' as const,
    location: 'header' as const,
    name: 'X-API-Key',
  },
  API_KEY_QUERY: {
    type: 'api_key' as const,
    location: 'query' as const,
    name: 'api_key',
  },
  BEARER_TOKEN: {
    type: 'bearer_token' as const,
  },
  BASIC_AUTH: {
    type: 'basic' as const,
  },
  OAUTH2: {
    type: 'oauth2' as const,
  },
};

// Common rate limit configurations
export const RATE_LIMITS = {
  VERY_LOW: { requests: 10, window: '1m' },
  LOW: { requests: 100, window: '1h' },
  MEDIUM: { requests: 1000, window: '1h' },
  HIGH: { requests: 5000, window: '1h' },
  VERY_HIGH: { requests: 10000, window: '1h' },
};

// Common parameter types
export const PARAMETER_TYPES = {
  STRING: 'string' as const,
  NUMBER: 'number' as const,
  BOOLEAN: 'boolean' as const,
  OBJECT: 'object' as const,
  ARRAY: 'array' as const,
};

// Common HTTP methods
export const HTTP_METHODS = {
  GET: 'GET' as const,
  POST: 'POST' as const,
  PUT: 'PUT' as const,
  DELETE: 'DELETE' as const,
  PATCH: 'PATCH' as const,
};

// Validation helpers
export function createQuickProtocol(config: {
  name: string;
  version?: string;
  description: string;
  author: string;
  license?: string;
  endpoints: Array<{
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    description: string;
  }>;
}) {
  const builder = createProtocol()
    .setName(config.name)
    .setVersion(config.version || '1.0.0')
    .setDescription(config.description)
    .setAuthor(config.author)
    .setLicense(config.license || 'MIT');

  for (const endpoint of config.endpoints) {
    const endpointBuilder = createEndpoint()
      .setName(endpoint.name)
      .setMethod(endpoint.method)
      .setPath(endpoint.path)
      .setDescription(endpoint.description)
      .setResponse({
        type: 'object',
        description: 'Response data',
      });

    builder.addEndpoint(endpointBuilder.build());
  }

  return builder.build();
}
