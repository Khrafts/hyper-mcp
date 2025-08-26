# HyperLiquid Trading Tools

This section covers all 13 HyperLiquid trading and market data tools available through the MCP server.

## Overview

The HyperLiquid integration provides comprehensive access to:

- **Market Data** - Real-time prices, order books, trade history, and candle data
- **Account Management** - Account info, balances, positions, and trading history
- **Order Execution** - Market orders, limit orders, and order management
- **System Monitoring** - Health checks and WebSocket status

## Available Tools

### Market Data Tools (8 tools)

- [**get_all_prices**](hyperliquid_get_all_prices.md) - Get current prices for all trading pairs
- [**get_assets**](hyperliquid_get_assets.md) - Get information about all tradeable assets
- [**get_order_book**](hyperliquid_get_order_book.md) - Get order book depth for a specific pair
- [**get_trades**](hyperliquid_get_trades.md) - Get recent trade history for a pair
- [**get_candles**](hyperliquid_get_candles.md) - Get OHLCV candle data for charting

### Account & Trading Tools (5 tools)

- [**get_account_info**](hyperliquid_get_account_info.md) - Get account balance and position info
- [**place_market_order**](hyperliquid_place_market_order.md) - Execute market orders
- [**place_limit_order**](hyperliquid_place_limit_order.md) - Place limit orders
- [**cancel_order**](hyperliquid_cancel_order.md) - Cancel pending orders
- [**get_open_orders**](hyperliquid_get_open_orders.md) - List all open orders
- [**get_user_fills**](hyperliquid_get_user_fills.md) - Get trade execution history

### System Tools (2 tools)

- [**health_check**](hyperliquid_health_check.md) - Check API connectivity and status
- [**websocket_status**](hyperliquid_websocket_status.md) - Monitor WebSocket connections

## Configuration

### Read-Only Mode

All market data tools work without any API keys - perfect for analysis and research.

### Full-Access Mode

Trading tools require:

- `HYPERLIQUID_PRIVATE_KEY` - Your wallet private key
- `HYPERLIQUID_USER_ADDRESS` - Your wallet address
- `HYPERLIQUID_TESTNET=true` - Use testnet for safe testing

## Usage Examples

### Get Market Overview

```
Show me current prices for BTC and ETH on HyperLiquid
```

### Account Analysis

```
What's my account balance and current positions?
```

### Place Orders

```
Place a limit buy order for 0.1 BTC at $45000
```

### Risk Management

```
Show me all my open orders and recent fills
```

## Security Notes

- Always use testnet first for testing strategies
- Never share private keys
- Monitor your positions and orders regularly
- Use appropriate position sizing

For more information, see the [HyperLiquid Integration Guide](../integrations/hyperliquid.md).
