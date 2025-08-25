# Tools Overview

The HyperLiquid Ecosystem MCP Server provides tools from two main sources: built-in HyperLiquid integration and community-contributed protocols. All tools use JSON schemas for inputs and return structured results.

## Core Categories

### HyperLiquid Native Tools

- **hyperliquid**: Market data, trading orders, account management
- **execution**: Smart order execution algorithms (TWAP, VWAP, Iceberg)
- **risk_management**: Portfolio risk metrics, position limits, alerts
- **market_intelligence**: Technical analysis and market insights
- **node_info**: Network health and validator insights (optional)

### Community Protocol Tools

- **Dynamic Categories**: Tools generated from community protocol contributions
- **Ecosystem APIs**: DeFi protocols, data providers, infrastructure services
- **Custom Integrations**: Any REST API can become MCP tools via protocol definitions

## Quick Reference

### Built-in HyperLiquid Tools

- **HyperLiquid Trading**: [hyperliquid integration](../integrations/hyperliquid.md)
  - Individual tools: `hyperliquid/*.md`
- **Smart Execution**: [execution tools](execution.md)
  - Individual tools: `execution/*.md`
- **Risk Management**: [risk management tools](risk-management.md)
  - Individual tools: `risk-management/*.md`
- **Market Intelligence**: [market intelligence tools](market-intelligence.md)
  - Individual tools: `market-intelligence/*.md`
- **Node Info**: [node info tools](../integrations/node-info.md) (optional)
  - Individual tools: `node-info/*.md`

### Community Protocol System

- **Contributing Protocols**: See [CONTRIBUTING.md](../../CONTRIBUTING.md) for submission guidelines
- **Protocol Validation**: Automatic validation and tool generation
- **Tool Categories**: Community tools are organized by protocol name

### Getting Started

1. **For Users**: Configure HyperLiquid credentials and start trading with AI agents
2. **For Contributors**: Submit JSON protocol definitions to add your API as MCP tools
3. **For Developers**: Extend the server with custom validation or generation logic
