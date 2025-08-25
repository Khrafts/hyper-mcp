# HyperLiquid Intelligence MCP

> ⚠️ **ALPHA SOFTWARE**: This project is in early development. APIs may change. Not recommended for production use.

An MCP (Model Context Protocol) server for advanced trading operations on HyperLiquid DEX, featuring market intelligence, risk management, and automated execution capabilities.

## Features

### Current (v0.1.0-alpha)

- ✅ MCP server infrastructure with tool registry
- ✅ Market data fetching from HyperLiquid
- ✅ Technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands)
- ✅ Risk management calculations (VaR, position sizing)
- ✅ Basic execution algorithms (TWAP, VWAP)
- ✅ Protocol adapter framework

### Upcoming

- 🚧 Full HyperLiquid authentication
- 🚧 WebSocket real-time data feeds
- 🚧 Advanced order types (stop-loss, take-profit)
- 🚧 Cross-chain integration via GlueX

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hyper-mcp.git
cd hyper-mcp

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

### Configuration

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
NODE_ENV=development
LOG_LEVEL=info

# HyperLiquid Configuration (optional for market data)
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_WS_URL=wss://api.hyperliquid.xyz/ws
HYPERLIQUID_PRIVATE_KEY=your_private_key_here  # Required for trading
HYPERLIQUID_ADDRESS=your_wallet_address_here   # Required for trading
HYPERLIQUID_TESTNET=false

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
```

### Running the Server

#### Development Mode

```bash
pnpm dev
```

#### Production Mode

```bash
pnpm start
```

#### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up

# Run in background
docker-compose up -d
```

## Usage

The MCP server exposes tools that can be used by AI assistants. Connect your MCP client to `http://localhost:3000`.

### Available Tools

#### Market Data

- `hyperliquid_get_markets` - Fetch all market mid prices
- `hyperliquid_get_orderbook` - Get order book for a symbol
- `hyperliquid_get_trades` - Get recent trades
- `hyperliquid_get_candles` - Get historical candles

#### Technical Analysis

- `calculate_sma` - Simple Moving Average
- `calculate_ema` - Exponential Moving Average
- `calculate_rsi` - Relative Strength Index
- `calculate_macd` - MACD indicator
- `calculate_bollinger_bands` - Bollinger Bands

#### Risk Management

- `calculate_var` - Value at Risk
- `calculate_position_size` - Kelly Criterion position sizing
- `analyze_portfolio_risk` - Portfolio risk metrics

#### Execution (requires authentication)

- `place_limit_order` - Place a limit order
- `place_market_order` - Place a market order
- `cancel_order` - Cancel an open order
- `get_open_orders` - List open orders

## Architecture

```
hyper-mcp/
├── src/
│   ├── server/          # MCP server implementation
│   ├── adapters/        # Protocol adapters (HyperLiquid, GlueX)
│   ├── tools/           # MCP tool implementations
│   ├── indicators/      # Technical analysis
│   ├── risk/            # Risk management
│   ├── execution/       # Execution algorithms
│   └── websocket/       # WebSocket managers
├── tests/               # Test suites
├── doc/                 # Documentation
└── docker/              # Docker configuration
```

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test tests/adapters/SimpleHyperLiquidAdapter.test.ts
```

### Linting

```bash
# Run ESLint
pnpm lint

# Fix lint issues
pnpm lint:fix
```

### Type Checking

```bash
# Run TypeScript compiler check
pnpm typecheck
```

## Roadmap

See [doc/production-readiness-plan.md](doc/production-readiness-plan.md) for detailed development phases.

### Phase 1 (Current Sprint)

- [ ] Fix HyperLiquid authentication
- [ ] Complete WebSocket integration
- [ ] Add integration tests

### Phase 2

- [ ] Full HyperLiquid adapter
- [ ] Performance optimization (<100ms latency)
- [ ] Advanced risk management

### Phase 3

- [ ] Security hardening
- [ ] High availability setup
- [ ] Production monitoring

## Known Issues

- WebSocket connections not yet implemented
- Authentication signatures need updating for HyperLiquid format
- No integration tests yet
- TypeScript `any` warnings (non-critical)

## Contributing

This project is in alpha. We welcome feedback and contributions! Please open an issue before submitting PRs for major changes.

## Security

⚠️ **IMPORTANT**:

- Never commit private keys or sensitive data
- Use environment variables for all credentials
- This is alpha software - use at your own risk
- Start with testnet before using mainnet

## License

MIT

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/khrafts/hyper-mcp/issues)
- Documentation: [docs/](docs/)

## Disclaimer

This software is provided "as is" without warranty of any kind. Trading cryptocurrencies carries significant risk. Always do your own research and never trade more than you can afford to lose.
