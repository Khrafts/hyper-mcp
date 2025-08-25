# HyperLiquid MCP Server Installation Guide

Transform any AI agent into a HyperLiquid trading powerhouse! This guide shows you how to install and configure the HyperLiquid MCP Server for use with Claude Desktop, Cursor, and other AI applications.

## 🚀 Quick Start

### Option 1: NPM Installation (Recommended)

```bash
# Install globally
npm install -g hl-eco-mcp

# Verify installation
hl-eco-mcp --version
```

### Option 2: From Source

```bash
# Clone repository
git clone https://github.com/your-org/hyperliquid-mcp
cd hyperliquid-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Link for global usage
npm link
```

## ⚙️ Configuration

### Required Environment Variables

Create a `.env` file or set these environment variables:

```bash
# Required - Your HyperLiquid wallet credentials
HYPERLIQUID_PRIVATE_KEY=0x1234567890abcdef...
HYPERLIQUID_USER_ADDRESS=0xYourWalletAddress

# Network selection (default: mainnet)
HYPERLIQUID_TESTNET=false  # Set to 'true' for testnet

# Optional - GlueX integration for cross-chain functionality
GLUEX_API_KEY=your_gluex_api_key_here
```

### Security Best Practices

⚠️ **IMPORTANT**: Never commit your private keys to version control!

- Use environment variables or secure credential management
- Consider using a dedicated trading wallet with limited funds
- Test on testnet first before using mainnet
- Rotate keys regularly

## 🖥️ Client Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hl-eco-mcp",
      "env": {
        "HYPERLIQUID_PRIVATE_KEY": "your_private_key_here",
        "HYPERLIQUID_USER_ADDRESS": "your_address_here",
        "HYPERLIQUID_TESTNET": "false"
      }
    }
  }
}
```

**Config file locations:**

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Cursor (VS Code)

1. Install the MCP extension for Cursor/VS Code
2. Add to your workspace settings:

```json
{
  "mcp.servers": {
    "hyperliquid": {
      "command": "hl-eco-mcp",
      "env": {
        "HYPERLIQUID_PRIVATE_KEY": "your_private_key_here",
        "HYPERLIQUID_USER_ADDRESS": "your_address_here"
      }
    }
  }
}
```

### Custom Applications

Any MCP-compatible application can use the server:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

const serverProcess = spawn('hl-eco-mcp', [], {
  env: {
    ...process.env,
    HYPERLIQUID_PRIVATE_KEY: 'your_key_here',
    HYPERLIQUID_USER_ADDRESS: 'your_address_here',
  },
});

const transport = new StdioClientTransport({
  stderr: serverProcess.stderr,
  stdin: serverProcess.stdin,
  stdout: serverProcess.stdout,
});

const client = new Client(
  {
    name: 'my-app',
    version: '1.0.0',
  },
  { capabilities: {} }
);

await client.connect(transport);
```

## 🧪 Testing Your Setup

### 1. Test Server Connection

```bash
# Start server manually to verify it works
HYPERLIQUID_PRIVATE_KEY=your_key HYPERLIQUID_USER_ADDRESS=your_address hl-eco-mcp
```

You should see:

```
🚀 HyperLiquid MCP Server starting...
📡 Network: TESTNET/MAINNET
👛 Address: 0x...
✅ Server ready with 32 tools available
🔄 MCP Server is running and waiting for client connections...
```

### 2. Test with Claude Desktop

1. Restart Claude Desktop after adding the configuration
2. Start a new conversation
3. Try asking: "What tools are available for HyperLiquid trading?"
4. Test a simple command: "Check my HyperLiquid account balance"

### 3. Verify Tool Availability

The server provides these tool categories:

- **HyperLiquid Trading**: Place orders, check balances, get positions
- **Market Data**: Prices, order books, trade history, candles
- **Risk Management**: Portfolio analysis, risk limits, alerts
- **Market Intelligence**: Technical analysis, sentiment data
- **Execution Engine**: Advanced order management
- **GlueX Integration**: Cross-chain functionality (if configured)

## 🔧 Advanced Configuration

### Custom Configuration File

Create `hyperliquid-mcp-config.json`:

```json
{
  "server": {
    "port": 3000,
    "logLevel": "info"
  },
  "hyperliquid": {
    "testnet": false,
    "timeout": 30000,
    "rateLimit": {
      "requestsPerMinute": 60
    }
  },
  "risk": {
    "positionLimit": 1000000,
    "maxDrawdownPercent": 10
  }
}
```

### Docker Deployment

```bash
# Create docker-compose.yml
version: '3.8'
services:
  hyperliquid-mcp:
    image: hyperliquid-intelligence-mcp
    environment:
      - HYPERLIQUID_PRIVATE_KEY=your_key_here
      - HYPERLIQUID_USER_ADDRESS=your_address_here
      - HYPERLIQUID_TESTNET=false
    ports:
      - "3000:3000"
    restart: unless-stopped

# Run with Docker
docker-compose up -d
```

## 🛠️ Troubleshooting

### Common Issues

**Server won't start:**

```bash
# Check if all required environment variables are set
hl-eco-mcp --check-config
```

**Connection issues:**

- Verify your private key format (should start with 0x)
- Ensure your wallet address matches your private key
- Check network connectivity
- Try testnet first: `HYPERLIQUID_TESTNET=true`

**Tool execution failures:**

- Verify you have sufficient balance for trading operations
- Check if your account is activated on the network
- Ensure API rate limits aren't exceeded

### Debug Mode

Enable debug logging:

```bash
ENABLE_DEBUG_LOGGING=true hl-eco-mcp
```

### Getting Help

1. Check the [troubleshooting guide](./docs/TROUBLESHOOTING.md)
2. Review server logs for error messages
3. Test with minimal configuration first
4. Open an issue on GitHub with logs and configuration (redact private keys!)

## 📚 Next Steps

Once installed, you can:

1. **Trade with AI**: Ask Claude to place orders, check balances, analyze positions
2. **Market Analysis**: Get real-time market data and technical indicators
3. **Risk Management**: Set up alerts and portfolio monitoring
4. **Cross-chain**: Use GlueX integration for multi-chain operations
5. **Custom Strategies**: Build automated trading workflows

## 🔒 Security Notes

- Never share your private keys
- Use testnet for development and testing
- Consider using a hardware wallet for mainnet
- Regularly audit your API access and permissions
- Monitor your accounts for unusual activity

---

**Ready to trade with AI?** Your HyperLiquid MCP Server is now installed and configured! 🚀
