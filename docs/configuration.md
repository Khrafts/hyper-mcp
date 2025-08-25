# Configuration

All settings are managed via environment variables, validated by Zod in src/config/index.ts. Copy .env.example to .env and adjust as needed.

Server

- NODE_ENV: development | production | test (default: development)
- LOG_LEVEL: error | warn | info | debug (default: info)
- MCP_SERVER_PORT: number (default: 3000)

HyperLiquid

- HYPERLIQUID_API_BASE_URL: default https://api.hyperliquid.xyz
- HYPERLIQUID_WS_URL: default wss://api.hyperliquid.xyz/ws
- HYPERLIQUID_API_KEY: optional, for private endpoints
- HYPERLIQUID_SECRET_KEY: optional, required for order placement
- HYPERLIQUID_USER_ADDRESS: optional, defaults to configured address for account queries

GlueX

- GLUEX_API_BASE_URL: default https://router.gluex.xyz
- GLUEX_API_KEY: optional, x-api-key header for router access

Node Info API

- NODE_INFO_API_BASE_URL: default https://api.nodeinfo.hyperliquid.xyz
  - Node Info tools are optional. The server performs a health check on startup and enables these tools only if healthy.

Rate Limiting and Timeouts

- API_RATE_LIMIT_REQUESTS_PER_MINUTE: default 60
- WEBSOCKET_RECONNECT_DELAY_MS: default 5000
- API_TIMEOUT_MS: default 30000

Risk Management defaults

- DEFAULT_POSITION_LIMIT: default 1000000
- DEFAULT_MAX_DRAWDOWN_PERCENT: default 10
- DEFAULT_VAR_CONFIDENCE_LEVEL: default 0.95

Performance and caching

- CACHE_TTL_SECONDS: default 60
- MAX_CONCURRENT_REQUESTS: default 10

Community system (optional)

- ENABLE_COMMUNITY_SYSTEM: default false
- GITHUB_TOKEN, GITHUB_WEBHOOK_SECRET: optional
- COMMUNITY_REPOSITORY: default hyperliquid-intelligence/community-protocols
- COMMUNITY_AUTO_MERGE: default false
- COMMUNITY_MAX_ENDPOINTS: default 10
- COMMUNITY_STRICT_MODE: default true
- COMMUNITY_CACHE_TTL_MS: default 3600000
- COMMUNITY_VALIDATION_TIMEOUT_MS: default 30000
- COMMUNITY_ALLOWED_DOMAINS: optional, comma-separated

Development

- ENABLE_DEBUG_LOGGING: default false (set true for verbose logs)
- MOCK_EXTERNAL_APIS: default false (enables offline behavior in adapters)

Examples

```
# Minimum env for public market data
LOG_LEVEL=info
MCP_SERVER_PORT=3000
HYPERLIQUID_API_BASE_URL=https://api.hyperliquid.xyz
HYPERLIQUID_WS_URL=wss://api.hyperliquid.xyz/ws

# Enable trading
HYPERLIQUID_SECRET_KEY=0xYOUR_PRIVATE_KEY
HYPERLIQUID_USER_ADDRESS=0xYOUR_ADDRESS

# GlueX (optional)
GLUEX_API_BASE_URL=https://router.gluex.xyz
GLUEX_API_KEY=your_gluex_api_key

# Node Info (optional)
NODE_INFO_API_BASE_URL=https://api.nodeinfo.hyperliquid.xyz
```

Operational notes

- Missing or invalid values are validated at startup; errors are reported with field names.
- Secrets should be injected securely in production (Kubernetes secrets, cloud secret managers).
