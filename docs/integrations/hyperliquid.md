# HyperLiquid Integration

Overview

- Base URL: HYPERLIQUID_API_BASE_URL (default https://api.hyperliquid.xyz)
- WebSocket: HYPERLIQUID_WS_URL (default wss://api.hyperliquid.xyz/ws)
- Authentication: API key + signature for private endpoints

Capabilities

- Market data: all mids, order book, trades, candles
- Account: user_state
- Orders: market, limit, cancel
- WebSocket: l2 book, user events

Environment

- HYPERLIQUID_API_BASE_URL
- HYPERLIQUID_WS_URL
- HYPERLIQUID_API_KEY (optional)
- HYPERLIQUID_SECRET_KEY (required for order placement)
- HYPERLIQUID_USER_ADDRESS (optional for account operations)

Common tools

- hyperliquid_get_all_prices
- hyperliquid_get_assets
- hyperliquid_get_order_book { symbol }
- hyperliquid_get_trades { symbol }
- hyperliquid_get_candles { symbol, interval, startTime?, endTime? }
- hyperliquid_get_account_info { address? }
- hyperliquid_place_market_order { assetId, isBuy, size, reduceOnly? }
- hyperliquid_place_limit_order { assetId, isBuy, price, size, timeInForce?, reduceOnly? }
- hyperliquid_cancel_order { assetId, orderId }
- hyperliquid_get_open_orders { address? }
- hyperliquid_get_user_fills { address? }
- hyperliquid_websocket_status

Notes

- Tool input schemas are enforced; validation errors are returned fast.
- Rate limits and retries handled by adapters.
- WebSocket auto-reconnect is enabled with WEBSOCKET_RECONNECT_DELAY_MS.
