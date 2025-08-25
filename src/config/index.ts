import { config } from 'dotenv';
import { z } from 'zod';

config();

const ConfigSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  MCP_SERVER_PORT: z.coerce.number().default(3000),

  // HyperLiquid Configuration
  HYPERLIQUID_API_BASE_URL: z.string().default('https://api.hyperliquid.xyz'),
  HYPERLIQUID_WS_URL: z.string().default('wss://api.hyperliquid.xyz/ws'),
  HYPERLIQUID_API_KEY: z.string().optional(),
  HYPERLIQUID_SECRET_KEY: z.string().optional(),
  HYPERLIQUID_USER_ADDRESS: z.string().optional(),
  HYPERLIQUID_TESTNET: z.coerce.boolean().default(false),

  // GlueX Configuration
  GLUEX_API_BASE_URL: z.string().default('https://api.gluex.org/v1'),
  GLUEX_API_KEY: z.string().optional(),

  // Node Info API Configuration
  NODE_INFO_API_BASE_URL: z.string().default('https://api.nodeinfo.hyperliquid.xyz'),

  // Rate Limiting
  API_RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce.number().default(60),
  WEBSOCKET_RECONNECT_DELAY_MS: z.coerce.number().default(5000),
  API_TIMEOUT_MS: z.coerce.number().default(30000),

  // Risk Management
  DEFAULT_POSITION_LIMIT: z.coerce.number().default(1000000),
  DEFAULT_MAX_DRAWDOWN_PERCENT: z.coerce.number().default(10),
  DEFAULT_VAR_CONFIDENCE_LEVEL: z.coerce.number().default(0.95),

  // Caching and Performance
  CACHE_TTL_SECONDS: z.coerce.number().default(60),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().default(10),

  // Community System Configuration
  ENABLE_COMMUNITY_SYSTEM: z.coerce.boolean().default(false),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  COMMUNITY_REPOSITORY: z.string().default('hyperliquid-intelligence/community-protocols'),
  COMMUNITY_AUTO_MERGE: z.coerce.boolean().default(false),
  COMMUNITY_MAX_ENDPOINTS: z.coerce.number().default(10),
  COMMUNITY_STRICT_MODE: z.coerce.boolean().default(true),
  COMMUNITY_CACHE_TTL_MS: z.coerce.number().default(3600000), // 1 hour
  COMMUNITY_VALIDATION_TIMEOUT_MS: z.coerce.number().default(30000),
  COMMUNITY_ALLOWED_DOMAINS: z.string().optional(), // Comma-separated list

  // Development
  ENABLE_DEBUG_LOGGING: z.coerce.boolean().default(false),
  MOCK_EXTERNAL_APIS: z.coerce.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    cachedConfig = ConfigSchema.parse(process.env);
    return cachedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

export function validateConfig(): { valid: boolean; errors: string[] } {
  try {
    ConfigSchema.parse(process.env);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { valid: false, errors };
    }
    return { valid: false, errors: ['Unknown configuration error'] };
  }
}

// Export individual config sections for convenience
export const createConfigSections = (config: Config) => ({
  server: {
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
    port: config.MCP_SERVER_PORT,
  },
  hyperliquid: {
    apiBaseUrl: config.HYPERLIQUID_TESTNET
      ? 'https://api.hyperliquid-testnet.xyz'
      : config.HYPERLIQUID_API_BASE_URL,
    wsUrl: config.HYPERLIQUID_TESTNET
      ? 'wss://api.hyperliquid-testnet.xyz/ws'
      : config.HYPERLIQUID_WS_URL,
    apiKey: config.HYPERLIQUID_API_KEY,
    secretKey: config.HYPERLIQUID_SECRET_KEY,
    userAddress: config.HYPERLIQUID_USER_ADDRESS,
    testnet: config.HYPERLIQUID_TESTNET,
  },
  gluex: {
    apiBaseUrl: config.GLUEX_API_BASE_URL,
    apiKey: config.GLUEX_API_KEY,
  },
  nodeInfo: {
    apiBaseUrl: config.HYPERLIQUID_TESTNET
      ? 'https://api.hyperliquid-testnet.xyz/info'
      : config.NODE_INFO_API_BASE_URL,
  },
  rateLimiting: {
    requestsPerMinute: config.API_RATE_LIMIT_REQUESTS_PER_MINUTE,
    wsReconnectDelayMs: config.WEBSOCKET_RECONNECT_DELAY_MS,
    apiTimeoutMs: config.API_TIMEOUT_MS,
  },
  risk: {
    positionLimit: config.DEFAULT_POSITION_LIMIT,
    maxDrawdownPercent: config.DEFAULT_MAX_DRAWDOWN_PERCENT,
    varConfidenceLevel: config.DEFAULT_VAR_CONFIDENCE_LEVEL,
  },
  performance: {
    cacheTtlSeconds: config.CACHE_TTL_SECONDS,
    maxConcurrentRequests: config.MAX_CONCURRENT_REQUESTS,
  },
  development: {
    enableDebugLogging: config.ENABLE_DEBUG_LOGGING,
    mockExternalApis: config.MOCK_EXTERNAL_APIS,
  },
  community: {
    enabled: config.ENABLE_COMMUNITY_SYSTEM,
    repository: config.COMMUNITY_REPOSITORY,
    autoMerge: config.COMMUNITY_AUTO_MERGE,
    maxEndpoints: config.COMMUNITY_MAX_ENDPOINTS,
    strictMode: config.COMMUNITY_STRICT_MODE,
    cacheTtlMs: config.COMMUNITY_CACHE_TTL_MS,
    validationTimeoutMs: config.COMMUNITY_VALIDATION_TIMEOUT_MS,
    githubToken: config.GITHUB_TOKEN,
    githubWebhookSecret: config.GITHUB_WEBHOOK_SECRET,
    allowedDomains: config.COMMUNITY_ALLOWED_DOMAINS?.split(',')
      .map((d) => d.trim())
      .filter(Boolean),
  },
});

// Create community system configuration from main config
export function createCommunitySystemConfig(
  config: Config
): import('../community/types/index.js').CommunitySystemConfig {
  return {
    validation: {
      strictMode: config.COMMUNITY_STRICT_MODE,
      maxEndpoints: config.COMMUNITY_MAX_ENDPOINTS,
      allowedDomains: config.COMMUNITY_ALLOWED_DOMAINS?.split(',')
        .map((d) => d.trim())
        .filter(Boolean),
      requiredFields: ['name', 'version', 'description', 'author', 'license'],
    },
    loading: {
      timeout: config.COMMUNITY_VALIDATION_TIMEOUT_MS,
      retries: 3,
      cacheTTL: config.COMMUNITY_CACHE_TTL_MS,
    },
    github: {
      repository: config.COMMUNITY_REPOSITORY,
      token: config.GITHUB_TOKEN,
      webhookSecret: config.GITHUB_WEBHOOK_SECRET,
      autoMerge: config.COMMUNITY_AUTO_MERGE,
    },
  };
}
