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
    apiBaseUrl: config.HYPERLIQUID_API_BASE_URL,
    wsUrl: config.HYPERLIQUID_WS_URL,
    apiKey: config.HYPERLIQUID_API_KEY,
    secretKey: config.HYPERLIQUID_SECRET_KEY,
    userAddress: config.HYPERLIQUID_USER_ADDRESS,
  },
  gluex: {
    apiBaseUrl: config.GLUEX_API_BASE_URL,
    apiKey: config.GLUEX_API_KEY,
  },
  nodeInfo: {
    apiBaseUrl: config.NODE_INFO_API_BASE_URL,
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
});
