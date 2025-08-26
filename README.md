# HyperLiquid Ecosystem MCP Server

> Transform ANY API into AI-accessible tools in 60 seconds! 🚀

**hl-eco-mcp** is a revolutionary Model Context Protocol (MCP) server that makes every DeFi protocol instantly accessible to AI agents. Simply submit a JSON definition of your API, and watch it automatically transform into tools that Claude, ChatGPT, and any AI agent can use. No coding required, no complex integrations - just unlimited extensibility for the entire DeFi ecosystem.

## 🌟 Core Features

- **♾️ Unlimited Extensibility** - Any REST API, GraphQL endpoint, or WebSocket feed becomes AI tools
- **🤖 Zero-Code Integration** - JSON protocol definitions automatically generate MCP tools
- **🌐 Community-Driven** - Protocols contributed by the community, for the community
- **⚡ Instant Deployment** - Submit PR, get AI tools - it's that simple
- **🛡️ Security Built-in** - Authentication, rate limiting, and validation for every protocol
- **📊 Production Ready** - Battle-tested with HyperLiquid integration as the flagship example

## 🚀 Quick Start

### 🔍 Read-Only Mode (No API Keys Required)

Get started instantly with market data and read-only features:

```bash
# Install the MCP server
npm install -g hl-eco-mcp

# Run in read-only mode - perfect for market analysis
hl-eco-mcp
```

**Available in read-only mode**: Market data, price feeds, analytics, protocol information, and more!

### 🔑 Full-Access Mode (API Keys Required)

For trading and account management, add your API keys:

```bash
# Set your credentials for trading features
export HYPERLIQUID_PRIVATE_KEY="your_key_here"
export GLUEX_DEFI_API_KEY="your_key_here"

# Now access all features including trading
hl-eco-mcp
```

### For Protocol Teams - Add Your API in 30 Minutes

```json
// docs/community-protocols/template/protocol-template.json
{
  "name": "your-defi-protocol",
  "version": "1.0.0",
  "description": "Your protocol description",
  "baseUrl": "https://api.yourprotocol.com/v1",
  "endpoints": [
    {
      "name": "getPoolInfo",
      "method": "GET",
      "path": "/pools/{poolId}",
      "description": "Get liquidity pool information"
    }
  ]
}
```

**Result**: Your API is now accessible to every AI agent as `your_defi_protocol_getPoolInfo`!

### Claude Desktop Configuration

**Read-Only Mode** (market data and analytics only):

```json
{
  "mcpServers": {
    "defi-ecosystem": {
      "command": "hl-eco-mcp",
      "env": {
        "ENABLE_COMMUNITY_SYSTEM": "true"
      }
    }
  }
}
```

**Full-Access Mode** (includes trading capabilities):

```json
{
  "mcpServers": {
    "defi-ecosystem": {
      "command": "hl-eco-mcp",
      "env": {
        "ENABLE_COMMUNITY_SYSTEM": "true",
        "HYPERLIQUID_PRIVATE_KEY": "your_private_key",
        "HYPERLIQUID_USER_ADDRESS": "your_wallet_address",
        "GLUEX_DEFI_API_KEY": "your_api_key"
      }
    }
  }
}
```

## 🛠️ What's Included

### Community Protocol System (Unlimited Tools)

Any protocol can join the ecosystem:

- **DeFi Protocols** - DEXs, lending platforms, yield aggregators
- **Data Providers** - Price feeds, analytics, on-chain data
- **Infrastructure** - RPCs, indexers, oracles
- **Cross-Chain** - Bridges, aggregators, multi-chain protocols
- **Your Protocol** - Whatever API you have, we can integrate!

### Example: HyperLiquid Integration (32+ Built-in Tools)

As a demonstration of what's possible, we include a complete HyperLiquid integration:

- **Trading** - Orders, positions, account management
- **Market Data** - Real-time prices, order books, trade history
- **Risk Management** - Portfolio analysis, risk limits, alerts
- **Smart Execution** - TWAP, VWAP, iceberg orders
- **Market Intelligence** - Technical analysis, sentiment data

## 📖 Documentation

🚀 **[Complete Documentation on GitBook](https://khrafts.gitbook.io/hyper-mcp)** 🚀

### Quick Links

#### For Users

- **[Getting Started](https://khrafts.gitbook.io/hyper-mcp/getting-started)** - Setup and basic usage
- **[Configuration Guide](https://khrafts.gitbook.io/hyper-mcp/configuration)** - Read-only vs full-access modes
- **[Available Tools](https://khrafts.gitbook.io/hyper-mcp/user-guide/mcp-tools-32+-available)** - Complete tool catalog

#### For Developers

- **[Protocol Development](https://khrafts.gitbook.io/hyper-mcp/developer-guide/protocol-development)** - Create new protocol integrations
- **[JSON Schema Reference](https://khrafts.gitbook.io/hyper-mcp/developer-guide/json-schema-reference)** - Complete protocol specification
- **[Tool Generation Process](https://khrafts.gitbook.io/hyper-mcp/developer-guide/tool-generation-process)** - How protocols become MCP tools
- **[SDK Documentation](https://khrafts.gitbook.io/hyper-mcp/developer-guide/sdk-documentation)** - TypeScript SDK for protocol development
- **[Testing & Debugging](https://khrafts.gitbook.io/hyper-mcp/developer-guide/testing-and-debugging)** - Development workflow and troubleshooting

#### Community

- **[Community Protocols](https://khrafts.gitbook.io/hyper-mcp/community-protocols)** - Browse and contribute protocols
- **[Contributing Guide](https://khrafts.gitbook.io/hyper-mcp/community-protocols/contributing-guide)** - Add your API to the ecosystem
- **[Protocol Templates](https://khrafts.gitbook.io/hyper-mcp/community-protocols/templates-and-examples)** - Quick start templates

## 🔒 Security

- Never commit private keys to version control
- Use testnet for development and testing
- Consider hardware wallets for mainnet trading
- Monitor API access and permissions regularly

## 🤝 Join the Ecosystem

### 🎯 For Protocol Teams

**Get your protocol AI-ready in 30 minutes:**

1. **Fork** this repository
2. **Create** a JSON definition of your API
3. **Submit** a pull request
4. **Done!** Your protocol is now accessible to every AI agent

No SDK integration, no code changes, no maintenance - we handle everything.

### 🌟 Success Stories

- **GlueX**: Multi-chain routing protocol - 6 endpoints via json specification
- **HyperLiquid**: Complete DEX integration - 32+ tools demonstrating full capabilities
- **Your Protocol**: Next success story - [Start here](./CONTRIBUTING.md)

### 👨‍💻 For Developers

Extend the platform:

- Enhance protocol validation
- Improve tool generation
- Add new authentication methods
- Contribute to core infrastructure

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for detailed contribution guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📚 [Documentation](https://khrafts.gitbook.io/hyper-mcp)
- 🐛 [Issues](https://github.com/khrafts/hyper-mcp/issues)
- 💬 [Discussions](https://github.com/khrafts/hyper-mcp/discussions)

---

**Ready to make your API AI-accessible?** Join the ecosystem today - your protocol could be live in 30 minutes! 🚀

**For traders:** Access the entire DeFi ecosystem through natural language with your AI agent.
**For builders:** Make your protocol instantly available to thousands of AI users.
**For everyone:** The future of DeFi is AI-native, and it starts here.
