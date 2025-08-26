# Getting Started

> Get your AI agent trading on HyperLiquid and accessing DeFi protocols in 5 minutes! 🚀

This guide will help you install **hl-eco-mcp** and start using AI agents for DeFi trading and protocol interactions.

## 🎯 What You'll Achieve

By the end of this guide, your AI agent will be able to:

- Execute HyperLiquid trades with natural language commands
- Access real-time market data and portfolio information
- Interact with community-contributed DeFi protocols
- Perform advanced risk management and smart execution

## 📋 Prerequisites

### Required

- **Node.js 18+** and **pnpm** (for development setup)
- **MCP Client** (Claude Desktop, Cursor, or any MCP-enabled application)

### For Trading (Optional)

- **HyperLiquid Account** with API credentials
- **Wallet Private Key** and **Address** (for trading operations)

### For Development (Optional)

- **Docker** and **Docker Compose** (for containerized deployment)
- **GitHub Account** (for contributing community protocols)

## ⚡ Quick Install (Recommended)

### Option 1: NPM Package (Easiest)

```bash
# Install globally
npm install -g hl-eco-mcp

# Or with pnpm
pnpm add -g hl-eco-mcp
```

### Option 2: Development Setup

```bash
# Clone and setup
git clone https://github.com/khrafts/hyper-mcp.git
cd hyper-mcp
pnpm install

# Copy environment template
cp .env.example .env

# Edit your configuration
nano .env  # or your preferred editor
```

## ⚙️ Configuration

hl-eco-mcp supports two modes:

### 🔍 Read-Only Mode (Recommended for beginners)

**No API keys required!** Perfect for market analysis and learning:

```bash
# Minimal configuration - works immediately
export LOG_LEVEL=info
export ENABLE_COMMUNITY_SYSTEM="true"  # Access community protocols
```

**Available in read-only mode:**

- Real-time market data and price feeds
- Protocol information and analytics
- Portfolio analysis (view-only)
- All community protocol tools that don't require authentication

### 🔑 Full-Access Mode (For trading)

**API keys required** for trading and account management:

```bash
# HyperLiquid trading credentials
export HYPERLIQUID_PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
export HYPERLIQUID_USER_ADDRESS="0xYOUR_WALLET_ADDRESS"
export HYPERLIQUID_TESTNET="true"  # Start with testnet!

# Community protocols
export ENABLE_COMMUNITY_SYSTEM="true"
export GLUEX_DEFI_API_KEY="your_gluex_key"  # Optional
```

**Additional features in full-access mode:**

- Execute trades and manage positions
- Account management and transfers
- Risk management tools
- All protocol features requiring authentication

💡 **Security Tip**: Never commit private keys! Use environment variables or secure secret management.

### 🌐 Community Protocols

Add any REST or GraphQL API as tools without coding:

```bash
# 1. Enable community system
export ENABLE_COMMUNITY_SYSTEM="true"

# 2. Add protocol files to protocols/ directory
cp docs/community-protocols/template/protocol-template.json protocols/my-api.json

# 3. Set API keys if needed
export MY_API_KEY="your_api_key"

# 4. Restart server - tools auto-generate!
```

**Currently available protocol**: GlueX DeFi (6 tools)

- `gluexDefi_getLiquidity` - Get liquidity across chains
- `gluexDefi_searchTokens` - Search for tokens
- `gluexDefi_getOptimalRoute` - Find best swap routes
- And more...

For complete configuration options, see [Configuration Guide](configuration.md).

## 🚀 Run the Server

### NPM Package

**Read-only mode (no setup required):**

```bash
# Start immediately - perfect for market data
hl-eco-mcp

# Enable community protocols
ENABLE_COMMUNITY_SYSTEM=true hl-eco-mcp
```

**Full-access mode (API keys required):**

```bash
# Run with environment variables
HYPERLIQUID_TESTNET=true HYPERLIQUID_PRIVATE_KEY=your_key hl-eco-mcp

# Or with config file
hl-eco-mcp --config ./my-config.env
```

### Development Mode

```bash
# Hot reload during development
pnpm run dev

# Build and start production
pnpm run build
pnpm start
```

**Read-only mode output:**

```
🚀 HyperLiquid MCP Server starting...
⚠️  Running in READ-ONLY mode (no private key configured)
✅ Server initialized on port 3000
📊 HyperLiquid integration: ACTIVE (market data only)
🌐 Community protocols: 6 loaded (GlueX, others...)
🎯 Ready for AI agent connections!
```

**Full-access mode output:**

```
🚀 HyperLiquid MCP Server starting...
✅ Server initialized on port 3000
📊 HyperLiquid integration: ACTIVE (full trading access)
🌐 Community protocols: 6 loaded (GlueX, others...)
🎯 Ready for AI agent connections!
```

### Docker Deployment

```bash
# Quick start with Docker
docker run --rm -p 3000:3000 \
  -e HYPERLIQUID_TESTNET=true \
  -e HYPERLIQUID_PRIVATE_KEY=your_key_here \
  khrafts/hl-eco-mcp:latest

# Or build from source
docker build -t hl-eco-mcp:local .
docker run --rm -p 3000:3000 --env-file .env hl-eco-mcp:local
```

## 🔧 MCP Client Setup

### Claude Desktop Configuration

**Read-only mode configuration:**

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

**Full-access mode configuration:**

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hl-eco-mcp",
      "env": {
        "HYPERLIQUID_PRIVATE_KEY": "your_private_key_here",
        "HYPERLIQUID_USER_ADDRESS": "your_address_here",
        "HYPERLIQUID_TESTNET": "true",
        "ENABLE_COMMUNITY_SYSTEM": "true",
        "GLUEX_DEFI_API_KEY": "your_gluex_key"
      }
    }
  }
}
```

### Other MCP Clients

For Cursor, VS Code, or other MCP clients, configure according to their MCP integration documentation.

## ✅ Verify Installation

### Test Basic Functionality

Ask your AI agent:

```
"Check if the HyperLiquid MCP server is working"
```

### Test Read-Only Features

Ask your AI agent:

```
"What's the current BTC price on HyperLiquid?"
"Show me market data for ETH-USD"
"What community protocols are available?"
```

### Test Full-Access Features (if configured)

Ask your AI agent:

```
"What's my HyperLiquid account balance?"
"Show me my current positions"
"Create a small test order on testnet"
```

### Development Testing

```bash
# Run type checking
pnpm run typecheck

# Run linting
pnpm run lint

# Run test suite
pnpm test
```

## 🎯 Next Steps

### For Traders & Users

1. **[Explore Available Tools](tools/overview.md)** - Discover all 32+ MCP tools for trading and analysis
2. **[Security Best Practices](operations/security.md)** - Secure your setup for production trading
3. **[Advanced Configuration](configuration.md)** - Customize risk limits, rate limiting, and features

### For Protocol Teams

1. **[Contribute Your Protocol](../CONTRIBUTING.md)** - Add your API to the ecosystem in 30 minutes
2. **[Protocol Examples](../protocols/)** - See real examples like GlueX integration
3. **[Community Guidelines](../CONTRIBUTING.md#community-guidelines)** - Join our growing community

### For Developers

1. **[Developer Guide](developer/README.md)** - Architecture overview and contribution workflow
2. **[Operations Guide](operations/README.md)** - Production deployment and monitoring
3. **[Integration Examples](integrations/README.md)** - Learn from existing integrations

## 🆘 Getting Help

- **Documentation Issues**: Check [troubleshooting guide](operations/troubleshooting.md)
- **Bug Reports**: [GitHub Issues](https://github.com/khrafts/hyper-mcp/issues)
- **Questions**: [GitHub Discussions](https://github.com/khrafts/hyper-mcp/discussions)
- **Protocol Contributions**: See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**🎉 Congratulations!** Your AI agent is now connected to the HyperLiquid ecosystem. Start trading with natural language commands and explore the growing world of AI-accessible DeFi protocols!
