# Configuration

All settings are managed via environment variables, validated by Zod in src/config/index.ts. Copy .env.example to .env and adjust as needed.

**Note**: GlueX integration has been removed. The server now focuses on HyperLiquid trading and community protocol contributions.

Server

- NODE_ENV: development | production | test (default: development)
- LOG_LEVEL: error | warn | info | debug (default: info)
- MCP_SERVER_PORT: number (default: 3000)

HyperLiquid (Required for Trading)

- **HYPERLIQUID_API_BASE_URL**: default https://api.hyperliquid.xyz
- **HYPERLIQUID_WS_URL**: default wss://api.hyperliquid.xyz/ws
- **HYPERLIQUID_PRIVATE_KEY**: **Required** for trading - your wallet private key
- **HYPERLIQUID_USER_ADDRESS**: **Required** for trading - your wallet address
- **HYPERLIQUID_TESTNET**: set to 'true' for testnet (recommended for development)

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

Community Protocol System (Optional)

- **ENABLE_COMMUNITY_SYSTEM**: default false - enables community protocol loading
- **GITHUB_TOKEN**: optional - for GitHub PR workflow integration
- **GITHUB_WEBHOOK_SECRET**: optional - for GitHub webhook validation
- **COMMUNITY_REPOSITORY**: default 'hyperliquid-intelligence/community-protocols'
- **COMMUNITY_AUTO_MERGE**: default false - auto-merge valid protocol PRs
- **COMMUNITY_MAX_ENDPOINTS**: default 10 - max endpoints per protocol
- **COMMUNITY_STRICT_MODE**: default true - strict validation mode
- **COMMUNITY_CACHE_TTL_MS**: default 3600000 (1 hour) - protocol cache TTL
- **COMMUNITY_VALIDATION_TIMEOUT_MS**: default 30000 - validation timeout
- **COMMUNITY_ALLOWED_DOMAINS**: optional - comma-separated list of allowed API domains

Development

- ENABLE_DEBUG_LOGGING: default false (set true for verbose logs)
- MOCK_EXTERNAL_APIS: default false (enables offline behavior in adapters)

Examples

```
# Minimum configuration for market data only
LOG_LEVEL=info
MCP_SERVER_PORT=3000
HYPERLIQUID_API_BASE_URL=https://api.hyperliquid.xyz
HYPERLIQUID_WS_URL=wss://api.hyperliquid.xyz/ws

# Enable trading (REQUIRED for trading tools)
HYPERLIQUID_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
HYPERLIQUID_USER_ADDRESS=0xYOUR_WALLET_ADDRESS
HYPERLIQUID_TESTNET=true  # Use testnet for development

# Community protocol system (optional)
ENABLE_COMMUNITY_SYSTEM=true
COMMUNITY_MAX_ENDPOINTS=20
COMMUNITY_STRICT_MODE=true

# Node Info (optional)
NODE_INFO_API_BASE_URL=https://api.nodeinfo.hyperliquid.xyz
```

Operational notes

- Missing or invalid values are validated at startup; errors are reported with field names.
- Secrets should be injected securely in production (Kubernetes secrets, cloud secret managers).
