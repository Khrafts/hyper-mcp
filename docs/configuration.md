# Configuration Guide

This guide covers all configuration options for hl-eco-mcp, including the differences between read-only and full-access modes.

## Operating Modes

hl-eco-mcp supports two distinct operating modes depending on your configuration:

### 🔍 Read-Only Mode

**Automatic when**: No private keys or sensitive credentials are configured
**Perfect for**: Market analysis, learning, portfolio viewing, and using community protocols without authentication

**Features Available**:

- ✅ Real-time market data and price feeds
- ✅ Portfolio analysis (view-only)
- ✅ Protocol information and analytics
- ✅ Community protocol tools (non-authenticated)
- ✅ Market intelligence and research tools
- ❌ Trading and order execution
- ❌ Account management operations
- ❌ Private account data access

### 🔐 Full-Access Mode

**Activated when**: Valid private keys and credentials are provided
**Required for**: Trading, account management, and authenticated protocol features

**Features Available**:

- ✅ Everything from read-only mode, plus:
- ✅ Trade execution and order management
- ✅ Account balance and position management
- ✅ Private account data access
- ✅ Risk management operations
- ✅ Authenticated community protocol features

## Environment Variables

### Core Server Configuration

| Variable          | Default       | Description                                            | Required |
| ----------------- | ------------- | ------------------------------------------------------ | -------- |
| `LOG_LEVEL`       | `info`        | Logging level (`debug`, `info`, `warn`, `error`)       | No       |
| `MCP_SERVER_PORT` | `3000`        | Port for MCP server to listen on                       | No       |
| `NODE_ENV`        | `development` | Environment mode (`development`, `production`, `test`) | No       |

### HyperLiquid Configuration

#### Required for Full-Access Mode

| Variable                   | Description             | Example    | Mode        |
| -------------------------- | ----------------------- | ---------- | ----------- |
| `HYPERLIQUID_PRIVATE_KEY`  | Your wallet private key | `0x123...` | Full-Access |
| `HYPERLIQUID_USER_ADDRESS` | Your wallet address     | `0xABC...` | Full-Access |

#### Optional Settings

| Variable                    | Default | Description                     | Mode        |
| --------------------------- | ------- | ------------------------------- | ----------- |
| `HYPERLIQUID_TESTNET`       | `false` | Use testnet instead of mainnet  | Both        |
| `HYPERLIQUID_API_URL`       | Auto    | Override default API URL        | Both        |
| `HYPERLIQUID_VAULT_ADDRESS` | None    | Vault address for vault trading | Full-Access |

### Community Protocol System

| Variable                   | Default                 | Description                                | Mode |
| -------------------------- | ----------------------- | ------------------------------------------ | ---- |
| `ENABLE_COMMUNITY_SYSTEM`  | `false`                 | Enable community protocol loading          | Both |
| `COMMUNITY_PROTOCOLS_PATH` | `./community-protocols` | Path to protocol definitions               | Both |
| `PROTOCOL_CACHE_TTL`       | `3600`                  | Cache TTL for protocol responses (seconds) | Both |

### Individual Protocol Keys

#### GlueX Integration

| Variable             | Description                    | Mode        |
| -------------------- | ------------------------------ | ----------- |
| `GLUEX_DEFI_API_KEY` | GlueX API key for DeFi routing | Full-Access |

#### Add more as community grows

| Variable                | Description                   | Mode   |
| ----------------------- | ----------------------------- | ------ |
| `PROTOCOL_NAME_API_KEY` | API key for specific protocol | Varies |

### Performance & Security

| Variable                  | Default | Description                     |
| ------------------------- | ------- | ------------------------------- |
| `MAX_CONCURRENT_REQUESTS` | `10`    | Maximum concurrent API requests |
| `REQUEST_TIMEOUT`         | `30000` | Request timeout in milliseconds |
| `RATE_LIMIT_REQUESTS`     | `100`   | Requests per minute rate limit  |
| `ENABLE_CORS`             | `true`  | Enable CORS for web clients     |
| `ALLOWED_ORIGINS`         | `*`     | Comma-separated allowed origins |

## Configuration Examples

### Minimal Read-Only Setup

Perfect for getting started or using in educational environments:

```bash
# .env file
LOG_LEVEL=info
ENABLE_COMMUNITY_SYSTEM=true
```

Start with:

```bash
hl-eco-mcp
```

### Read-Only with Community Protocols

Access all community protocols that don't require authentication:

```bash
# .env file
LOG_LEVEL=info
ENABLE_COMMUNITY_SYSTEM=true
COMMUNITY_PROTOCOLS_PATH=./my-protocols
```

### Testnet Trading Setup

Safe environment for testing trading strategies:

```bash
# .env file
HYPERLIQUID_TESTNET=true
HYPERLIQUID_PRIVATE_KEY=0x123...
HYPERLIQUID_USER_ADDRESS=0xABC...
ENABLE_COMMUNITY_SYSTEM=true
LOG_LEVEL=debug
```

### Production Trading Setup

Full production configuration with all features:

```bash
# .env file
NODE_ENV=production
LOG_LEVEL=info

# HyperLiquid Production
HYPERLIQUID_TESTNET=false
HYPERLIQUID_PRIVATE_KEY=0x123...
HYPERLIQUID_USER_ADDRESS=0xABC...

# Community Protocols
ENABLE_COMMUNITY_SYSTEM=true
GLUEX_DEFI_API_KEY=your_gluex_key

# Performance
MAX_CONCURRENT_REQUESTS=20
REQUEST_TIMEOUT=60000
RATE_LIMIT_REQUESTS=200
```

### Development Setup

Configuration for development and contributing:

```bash
# .env file
NODE_ENV=development
LOG_LEVEL=debug
HYPERLIQUID_TESTNET=true
HYPERLIQUID_PRIVATE_KEY=0x123...
HYPERLIQUID_USER_ADDRESS=0xABC...
ENABLE_COMMUNITY_SYSTEM=true

# Development features
ENABLE_CORS=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

## MCP Client Configuration

### Claude Desktop

#### Read-Only Configuration

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hl-eco-mcp",
      "env": {
        "ENABLE_COMMUNITY_SYSTEM": "true",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Full-Access Configuration

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hl-eco-mcp",
      "env": {
        "HYPERLIQUID_PRIVATE_KEY": "0x123...",
        "HYPERLIQUID_USER_ADDRESS": "0xABC...",
        "HYPERLIQUID_TESTNET": "true",
        "ENABLE_COMMUNITY_SYSTEM": "true",
        "GLUEX_DEFI_API_KEY": "your_key",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Production Configuration

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hl-eco-mcp",
      "env": {
        "NODE_ENV": "production",
        "HYPERLIQUID_PRIVATE_KEY": "0x123...",
        "HYPERLIQUID_USER_ADDRESS": "0xABC...",
        "ENABLE_COMMUNITY_SYSTEM": "true",
        "MAX_CONCURRENT_REQUESTS": "20",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Configuration Validation

The server validates your configuration on startup and provides clear feedback:

### Read-Only Mode Detection

```
⚠️  Running in READ-ONLY mode (no private key configured)
✅ Server initialized on port 3000
📊 HyperLiquid integration: ACTIVE (market data only)
🌐 Community protocols: 1 loaded (GlueX)
```

### Full-Access Mode Confirmation

```
✅ Server initialized on port 3000
📊 HyperLiquid integration: ACTIVE (full trading access)
🌐 Community protocols: 1 loaded with authentication
🔐 Wallet: 0xABC...DEF (testnet)
```

### Configuration Errors

```
❌ Configuration Error: Invalid private key format
❌ Configuration Error: HYPERLIQUID_USER_ADDRESS required when HYPERLIQUID_PRIVATE_KEY is set
❌ Configuration Error: Cannot access mainnet without explicit confirmation
```

## Security Best Practices

### Environment Variables

- **Never commit** `.env` files containing secrets
- Use `.env.example` for templates
- Rotate API keys regularly
- Use testnet for development and testing

### Private Key Management

```bash
# ✅ Good - Environment variable
export HYPERLIQUID_PRIVATE_KEY="0x123..."

# ❌ Bad - Hardcoded in config
"HYPERLIQUID_PRIVATE_KEY": "0x123..."
```

### Production Deployment

```bash
# Use secure secret management
kubectl create secret generic hl-eco-mcp-secrets \
  --from-literal=HYPERLIQUID_PRIVATE_KEY="0x123..." \
  --from-literal=GLUEX_DEFI_API_KEY="abc123"
```

### Access Control

```bash
# Limit access to specific origins
ALLOWED_ORIGINS=https://your-domain.com,https://trusted-client.com
ENABLE_CORS=true
```

## Getting Help

- **Configuration Issues**: [GitHub Issues](https://github.com/khrafts/hyper-mcp/issues)
- **Security Concerns**: Email security@khrafts.com
- **Feature Requests**: [GitHub Discussions](https://github.com/khrafts/hyper-mcp/discussions)

---

Now that you understand the configuration options, check out the [Getting Started Guide](getting-started.md) to set up your first instance!
