# HyperLiquid MCP Server

> Transform any AI agent into a HyperLiquid trading powerhouse! 🚀

**hl-eco-mcp** is a community-driven Model Context Protocol (MCP) server that provides comprehensive AI integration for the HyperLiquid DEX ecosystem. Any protocol can contribute their API via simple JSON definitions that automatically become AI-accessible tools. Compatible with Claude Desktop, Cursor, and any MCP-enabled application.

## 🌟 Features

- **🎯 Full HyperLiquid Integration** - Complete access to all HyperLiquid trading functionality
- **🤖 AI-Native Design** - Purpose-built for AI agents with natural language interfaces
- **⚡ Real-Time Data** - Live market data, order book updates, and position monitoring
- **🛡️ Advanced Risk Management** - Built-in position limits, drawdown monitoring, and alerts
- **📊 Market Intelligence** - Technical analysis, sentiment data, and smart execution
- **🔧 Easy Setup** - One command installation with comprehensive documentation

## 🚀 Quick Start

### Installation

```bash
npm install -g hl-eco-mcp
```

### Setup Environment Variables

```bash
export HYPERLIQUID_PRIVATE_KEY="0x1234567890abcdef..."
export HYPERLIQUID_USER_ADDRESS="0xYourWalletAddress"
export HYPERLIQUID_TESTNET="true"  # Start with testnet
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hl-eco-mcp",
      "env": {
        "HYPERLIQUID_PRIVATE_KEY": "your_private_key_here",
        "HYPERLIQUID_USER_ADDRESS": "your_address_here",
        "HYPERLIQUID_TESTNET": "true"
      }
    }
  }
}
```

### Start Trading with AI

```
Ask Claude: "Check my HyperLiquid account balance and show my current positions"
Ask Claude: "Place a buy order for 0.1 BTC at $45,000 with stop-loss at $43,000"
Ask Claude: "Analyze the ETH market and recommend a trading strategy"
```

## 🛠️ Available Tools

The server provides 32+ MCP tools across these categories:

- **HyperLiquid Trading** - Orders, positions, account management
- **Market Data** - Real-time prices, order books, trade history
- **Risk Management** - Portfolio analysis, risk limits, alerts
- **Market Intelligence** - Technical analysis, sentiment data
- **Smart Execution** - TWAP, VWAP, iceberg orders

## 📖 Documentation

- **[Installation Guide](./INSTALL.md)** - Detailed setup instructions
- **[API Reference](./docs/)** - Complete tool documentation
- **[Examples](./examples/)** - Usage examples and tutorials

## 🔒 Security

- Never commit private keys to version control
- Use testnet for development and testing
- Consider hardware wallets for mainnet trading
- Monitor API access and permissions regularly

## 🤝 Contributing

This is a community-driven project! Multiple ways to contribute:

### 🎯 Protocol Contributors (Most Common)

1. **Create a Protocol**: Define your API in a simple JSON file
2. **Submit PR**: Add to `protocols/your-protocol.json`
3. **Automatic Tools**: Your API becomes MCP tools instantly!

### 👨‍💻 Core Development

1. **Fork** the repository
2. **Create** a feature branch for core improvements
3. **Submit** a pull request

### 📖 Community Protocol Demo

```json
{
  "name": "my-defi-protocol",
  "version": "1.0.0",
  "description": "My DeFi protocol API for AI agents",
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

**Result**: Automatic `my_defi_protocol_getPoolInfo` MCP tool for AI agents!

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the complete protocol contribution guide.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📚 [Documentation](./docs/)
- 🐛 [Issues](https://github.com/khrafts/hyper-mcp/issues)
- 💬 [Discussions](https://github.com/khrafts/hyper-mcp/discussions)

---

**Ready to trade with AI?** Install `hl-eco-mcp` now and transform your AI agent into a HyperLiquid trading expert! 💪
