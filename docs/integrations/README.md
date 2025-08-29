# Integrations Overview

> **Production-grade integrations** with HyperLiquid plus community protocol support 🔗

The **hl-eco-mcp** server features battle-tested integrations with HyperLiquid and a community protocol system that makes any API AI-accessible.

## 🏗️ Built-in Integrations

### HyperLiquid DEX Integration

**Status**: ✅ **Production Ready** | **Tools**: 32+ | **Coverage**: Complete

- **📊 Market Data**: Real-time prices, order books, candles, trade history
- **💹 Trading Operations**: Advanced order placement, position management, account info
- **⚡ Smart Execution**: TWAP, VWAP, Iceberg order algorithms
- **🛡️ Risk Management**: Portfolio analysis, limits, alerts, stress testing
- **🌐 WebSocket Feeds**: Live market updates and trade notifications
- **📈 Analytics**: Performance tracking, technical indicators, insights

**Configuration**: Requires `HYPERLIQUID_PRIVATE_KEY` and `HYPERLIQUID_USER_ADDRESS`

### HyperLiquid Network Monitoring

**Status**: ✅ **Production Ready** | **Tools**: 6+ | **Optional**: Yes

- **🔍 Network Health**: Chain metrics, validator performance, network status
- **📊 Performance Monitoring**: Block times, transaction throughput, network statistics
- **🎯 Validator Insights**: Validator rankings, performance metrics, network participation

**Configuration**: Uses `NODE_INFO_API_BASE_URL` (defaults to official endpoint)

## 🤝 Community Protocol System

### How It Works

1. **Protocol Definition**: Submit a JSON file describing your API
2. **Automatic Validation**: Our system validates structure, security, and best practices
3. **Tool Generation**: MCP tools are automatically generated from your specification
4. **AI Accessibility**: Every AI agent can now interact with your protocol

### Key Features

- **⚡ Zero-Code Integration**: JSON definition → MCP tools automatically
- **🛡️ Security Built-in**: Authentication, rate limiting, input validation
- **🔄 Auto-Updates**: Protocol updates trigger automatic tool regeneration
- **📊 Monitoring**: Usage analytics, error tracking, performance metrics
- **🌐 Multi-Chain Support**: Ethereum, Arbitrum, Polygon, and more

### Active Community Protocols

| Protocol       | Category           | Tools | Networks | Status    |
| -------------- | ------------------ | ----- | -------- | --------- |
| **GlueX DeFi** | Multi-chain Router | 6     | 7 chains | ✅ Active |

Want to add your protocol? [Submit a PR](../../CONTRIBUTING.md) - it takes about 30 minutes!

### Supported Protocol Types

- **🌐 DeFi Protocols**: DEXs, lending platforms, derivatives, yield farming
- **📋 Data Providers**: Price feeds, analytics, research, market intelligence
- **⚙️ Infrastructure**: RPCs, indexers, oracles, monitoring services
- **📊 Analytics**: Portfolio tracking, tax tools, performance analysis
- **🔗 Cross-Chain**: Bridges, aggregators, multi-chain protocols

### Integration Examples

#### REST API Integration

```json
{
  "name": "my-defi-protocol",
  "endpoints": [
    {
      "name": "getPoolInfo",
      "method": "GET",
      "path": "https://api.myprotocol.com/pools/{poolId}",
      "description": "Get liquidity pool information"
    }
  ]
}
```

**Result**: `my_defi_protocol_getPoolInfo` MCP tool for AI agents!

#### GraphQL API Integration

```json
{
  "name": "analytics-platform",
  "endpoints": [
    {
      "name": "getTokenMetrics",
      "method": "POST",
      "path": "https://api.analytics.com/graphql",
      "description": "Query token analytics data"
    }
  ]
}
```

**Result**: `analytics_platform_getTokenMetrics` MCP tool!

## 📖 Integration Documentation

### Built-in Integrations

- **[HyperLiquid Integration Guide](hyperliquid.md)** - Complete trading, market data, and risk management
- **[Node Info Integration Guide](node-info.md)** - Network monitoring and validator insights

### Community Protocol System

- **[Contributing Protocols Guide](../../CONTRIBUTING.md)** - Step-by-step protocol submission
- **[Protocol Examples](../../protocols/)** - Real-world protocol definitions
- **[Validation Requirements](../developer/README.md#validation-requirements)** - Technical requirements

## 🚀 Quick Start by Role

### For AI Agent Users

```bash
# Install and configure
npm install -g hl-eco-mcp

# Add to Claude Desktop config
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hl-eco-mcp",
      "env": {
        "HYPERLIQUID_PRIVATE_KEY": "your_key",
        "HYPERLIQUID_TESTNET": "true"
      }
    }
  }
}

# Start trading with AI!
"What's my HyperLiquid balance?"
"Place a buy order for 0.1 BTC"
```

### For Protocol Teams

```bash
# 1. Fork the repository
git clone https://github.com/khrafts/hyper-mcp.git

# 2. Create your protocol definition
cp protocols/gluex-protocol.json protocols/my-protocol.json
# Edit your protocol details...

# 3. Submit PR
git add protocols/my-protocol.json
git commit -m "feat: add my-protocol integration"
git push origin feature/my-protocol
# Open PR - tools generated automatically!
```

### For Developers

```bash
# Clone and setup development environment
git clone https://github.com/khrafts/hyper-mcp.git
cd hyper-mcp
pnpm install

# Run development server
pnpm run dev

# Extend with custom adapters, validation, etc.
```

## 🎆 Integration Benefits

### For Users

- **One Interface**: Access all DeFi protocols through your AI agent
- **Consistent Experience**: Same commands work across all integrated protocols
- **Security**: Built-in validation, rate limiting, and error handling
- **Real-time**: Live data feeds and instant execution

### For Protocol Teams

- **Instant AI Adoption**: Reach every AI agent user immediately
- **Zero Maintenance**: We handle all MCP infrastructure
- **Community Growth**: Tap into the growing AI trader ecosystem
- **Analytics**: Usage insights and community feedback

### For Developers

- **Battle-tested**: Production-ready integrations with comprehensive error handling
- **Extensible**: Add custom logic, validation, or monitoring
- **Community-driven**: Benefit from ecosystem contributions and improvements
- **Standards-based**: All integrations follow MCP specifications

---

**🔥 Growing Ecosystem!** New protocols are being added by the community. [Join the ecosystem](../../CONTRIBUTING.md) and make your API AI-accessible in 30 minutes!
