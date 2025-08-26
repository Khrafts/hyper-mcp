# Community Protocols Directory

Welcome to the community protocols directory! This is where you'll find documentation and examples for all community-contributed protocol integrations.

## What are Community Protocols?

Community protocols are JSON-defined API integrations that automatically generate MCP (Model Context Protocol) tools. They allow you to integrate any REST or GraphQL API with Claude Code and other MCP clients without writing custom code.

## Quick Start

1. **Browse Existing Protocols**: Check the `protocols/` directory for ready-to-use protocols
2. **Install a Protocol**: Place the JSON file in the `protocols/` directory at the project root
3. **Enable Community System**: Set `ENABLE_COMMUNITY_SYSTEM=true` in your environment
4. **Restart MCP Server**: Tools will be automatically generated and available

## Available Protocol Categories

### DeFi & Trading

- [**HyperLiquid**](hyperliquid/README.md) - Perpetual futures trading and market data
- [**GlueX**](gluex/README.md) - DeFi protocol aggregation and analytics

### Development Tools

- [**GitHub**](github/README.md) - Repository management and code analysis
- [**Vercel**](vercel/README.md) - Deployment and project management

### AI & Machine Learning

- [**OpenAI**](openai/README.md) - GPT models and AI services
- [**Anthropic**](anthropic/README.md) - Claude API integration

### Data & Analytics

- [**CoinGecko**](coingecko/README.md) - Cryptocurrency market data
- [**Alpha Vantage**](alphavantage/README.md) - Financial market data

## Protocol Status

| Protocol      | Status         | Version | Tools Generated | Last Updated |
| ------------- | -------------- | ------- | --------------- | ------------ |
| HyperLiquid   | ✅ Active      | 1.0.0   | 15              | 2024-01-15   |
| GlueX         | ✅ Active      | 1.2.0   | 6               | 2024-01-12   |
| GitHub        | 🧪 Beta        | 0.9.0   | 12              | 2024-01-10   |
| Vercel        | 🚧 Development | 0.5.0   | 8               | 2024-01-08   |
| OpenAI        | ✅ Active      | 2.1.0   | 10              | 2024-01-14   |
| Anthropic     | 🧪 Beta        | 1.0.0   | 7               | 2024-01-11   |
| CoinGecko     | ✅ Active      | 1.3.0   | 9               | 2024-01-13   |
| Alpha Vantage | ✅ Active      | 1.1.0   | 11              | 2024-01-09   |

## Contributing New Protocols

Want to add a new protocol? Follow these steps:

1. **Read the Guidelines**: Check [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions
2. **Use the Template**: Start with the [protocol template](template/protocol-template.json)
3. **Test Your Protocol**: Use the [testing guide](../developer/testing-debugging.md)
4. **Submit a PR**: Include documentation and examples

## Protocol Structure

Each protocol directory contains:

```
protocol-name/
├── README.md                 # Protocol documentation
├── protocol.json            # Protocol definition
├── examples/               # Usage examples
│   ├── basic-usage.md
│   └── advanced-usage.md
├── schemas/               # Response schemas (if complex)
│   └── api-responses.json
└── CHANGELOG.md          # Version history
```

## Authentication Setup

Many protocols require API keys or authentication. See the individual protocol documentation for setup instructions:

- **API Key**: Set environment variable (e.g., `GITHUB_TOKEN`)
- **OAuth**: Follow protocol-specific OAuth flow
- **Custom Auth**: Check protocol's authentication section

## Getting Help

- **Documentation Issues**: Check the [developer guides](../developer/)
- **Protocol Problems**: See [testing and debugging](../developer/testing-debugging.md)
- **Community Support**: Join our Discord or create an issue on GitHub

## License

All community protocols are open source and contributed under the MIT license unless otherwise specified.

---

## Protocol Directory Structure

Below are all available community protocols with quick access links:

### Production Ready (✅)

- [HyperLiquid](hyperliquid/) - Decentralized perpetual futures
- [GlueX](gluex/) - DeFi protocol integration
- [OpenAI](openai/) - GPT API integration
- [CoinGecko](coingecko/) - Crypto market data
- [Alpha Vantage](alphavantage/) - Financial data

### Beta Testing (🧪)

- [GitHub](github/) - Repository and code management
- [Anthropic](anthropic/) - Claude API wrapper

### In Development (🚧)

- [Vercel](vercel/) - Deployment platform
- [Discord](discord/) - Chat and community management
- [Stripe](stripe/) - Payment processing

## How It Works

The community protocol system uses an event-driven architecture to dynamically load and register tools:

1. **Protocol Discovery**: On startup, the MCP server scans the `protocols/` directory for `.json` files
2. **Protocol Loading**: Each protocol is validated and loaded by the `CommunityManager`
3. **Tool Generation**: The `ToolGenerator` creates MCP tools from protocol endpoints
4. **Tool Registration**: Tools are registered with naming pattern: `{protocolName}_{endpointName}`
5. **Event Handling**: The `protocol:loaded` event triggers tool registration in the MCP server

### Directory Structure

```
hyper-mcp/
├── protocols/                    # Community protocol files go here
│   ├── gluex-protocol.json      # Example: GlueX DeFi protocol
│   └── your-protocol.json       # Your custom protocols
├── src/
│   └── community/                # Community system implementation
│       ├── CommunityManager.ts   # Protocol lifecycle management
│       ├── generation/           # Tool generation logic
│       └── validation/           # Protocol validation
└── docs/community-protocols/     # Documentation and templates
```

## Quick Installation

To install any protocol:

1. **Copy protocol file to the protocols directory**:

   ```bash
   cp docs/community-protocols/template/protocol-template.json protocols/my-protocol.json
   ```

2. **Set up authentication** (if required):

   ```bash
   export MY_API_KEY="your-api-key"
   ```

3. **Enable community system**:

   ```bash
   export ENABLE_COMMUNITY_SYSTEM=true
   ```

4. **Restart your MCP server**:
   ```bash
   npm run build
   node dist/bin/hyperliquid-mcp.js
   ```

Your new tools will be automatically generated and available in Claude Code!

### Verifying Protocol Loading

Check the server logs for confirmation:

```
🌐 Initializing community protocol system...
📦 Found 1 protocol files: my-protocol.json
⚡ Loading protocol: my-protocol
✅ Loaded 6 tools from my-protocol
```

Tools will appear with the naming pattern: `protocolName_endpointName`
Example: `gluexDefi_getLiquidity`, `gluexDefi_searchTokens`
