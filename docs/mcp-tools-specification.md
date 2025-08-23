# HyperLiquid Intelligence MCP - Tools Specification

## Overview

This document provides complete specifications for all MCP tools exposed by the HyperLiquid Intelligence MCP server. Each tool includes detailed parameter schemas, return types, error conditions, and usage examples.

## Tool Categories

### 1. Market Data Tools (`market_data`)

#### `get_market_data`
**Purpose**: Retrieve real-time market data for specified assets
**Category**: market_data

**Parameters Schema**:
```typescript
{
  asset?: string;           // Optional: specific asset symbol (e.g., "BTC", "ETH")
  assets?: string[];        // Optional: array of asset symbols
  include_order_book?: boolean; // Default: false
  order_book_depth?: number;    // Default: 10, max: 100
  include_recent_trades?: boolean; // Default: false
  trades_limit?: number;        // Default: 50, max: 1000
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data: {
    timestamp: number;
    markets: Array<{
      asset: string;
      price: number;
      volume_24h: number;
      change_24h: number;
      high_24h: number;
      low_24h: number;
      bid: number;
      ask: number;
      spread: number;
      order_book?: {
        bids: Array<[number, number]>; // [price, size]
        asks: Array<[number, number]>;
      };
      recent_trades?: Array<{
        price: number;
        size: number;
        side: "buy" | "sell";
        timestamp: number;
      }>;
    }>;
  };
  error?: string;
}
```

**Error Conditions**:
- `INVALID_ASSET`: Asset symbol not supported
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `API_UNAVAILABLE`: HyperLiquid API not responding

---

#### `get_technical_indicators`
**Purpose**: Calculate technical analysis indicators for specified assets
**Category**: market_data

**Parameters Schema**:
```typescript
{
  asset: string;                    // Required: asset symbol
  indicators: string[];             // Required: array of indicator names
  timeframe?: "1m" | "5m" | "15m" | "1h" | "4h" | "1d"; // Default: "1h"
  period?: number;                  // Default: depends on indicator
  lookback_periods?: number;        // Default: 100, max: 1000
}
```

**Supported Indicators**:
- `sma`: Simple Moving Average
- `ema`: Exponential Moving Average
- `rsi`: Relative Strength Index
- `macd`: MACD with signal line
- `bollinger_bands`: Bollinger Bands
- `atr`: Average True Range
- `stochastic`: Stochastic Oscillator

**Return Schema**:
```typescript
{
  success: boolean;
  data: {
    asset: string;
    timeframe: string;
    indicators: {
      [indicatorName: string]: {
        current_value: number | {[key: string]: number};
        values: Array<{
          timestamp: number;
          value: number | {[key: string]: number};
        }>;
      };
    };
  };
  error?: string;
}
```

### 2. Account Management Tools (`account`)

#### `get_account_info`
**Purpose**: Retrieve account balance, positions, and portfolio summary
**Category**: account

**Parameters Schema**:
```typescript
{
  include_positions?: boolean;      // Default: true
  include_open_orders?: boolean;    // Default: true
  include_trade_history?: boolean;  // Default: false
  trade_history_limit?: number;     // Default: 100, max: 1000
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data: {
    account_value: number;
    available_balance: number;
    margin_used: number;
    margin_available: number;
    positions?: Array<{
      asset: string;
      side: "long" | "short";
      size: number;
      entry_price: number;
      current_price: number;
      unrealized_pnl: number;
      margin_used: number;
    }>;
    open_orders?: Array<{
      order_id: string;
      asset: string;
      side: "buy" | "sell";
      type: "limit" | "market" | "stop_loss" | "take_profit";
      size: number;
      price?: number;
      filled_size: number;
      status: "open" | "partially_filled";
      timestamp: number;
    }>;
    trade_history?: Array<{
      trade_id: string;
      asset: string;
      side: "buy" | "sell";
      size: number;
      price: number;
      fee: number;
      timestamp: number;
    }>;
  };
  error?: string;
}
```

### 3. Trading Tools (`trading`)

#### `place_order`
**Purpose**: Place buy/sell orders with comprehensive validation
**Category**: trading

**Parameters Schema**:
```typescript
{
  asset: string;                    // Required: asset symbol
  side: "buy" | "sell";            // Required: order side
  type: "market" | "limit" | "stop_loss" | "take_profit"; // Required
  size: number;                     // Required: position size
  price?: number;                   // Required for limit orders
  stop_price?: number;              // Required for stop orders
  time_in_force?: "gtc" | "ioc" | "fok"; // Default: "gtc"
  reduce_only?: boolean;            // Default: false
  post_only?: boolean;              // Default: false (limit orders only)
  client_order_id?: string;         // Optional: client-specified ID
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data?: {
    order_id: string;
    client_order_id?: string;
    status: "accepted" | "rejected";
    asset: string;
    side: "buy" | "sell";
    type: string;
    size: number;
    price?: number;
    timestamp: number;
  };
  error?: string;
  validation_errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

**Pre-trade Validations**:
- Position size limits
- Available margin check
- Risk management rules
- Asset trading status

---

#### `cancel_order`
**Purpose**: Cancel existing open orders
**Category**: trading

**Parameters Schema**:
```typescript
{
  order_id?: string;                // Either order_id or client_order_id required
  client_order_id?: string;
  asset?: string;                   // Optional: for validation
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data?: {
    order_id: string;
    status: "cancelled" | "not_found" | "already_filled";
    cancelled_size: number;
    remaining_size: number;
  };
  error?: string;
}
```

### 4. Smart Execution Tools (`execution`)

#### `smart_order_execution`
**Purpose**: Execute orders using advanced algorithms (TWAP, VWAP, Iceberg)
**Category**: execution

**Parameters Schema**:
```typescript
{
  asset: string;                    // Required
  side: "buy" | "sell";            // Required
  total_size: number;               // Required: total position size
  algorithm: "twap" | "vwap" | "iceberg"; // Required
  time_window_minutes?: number;     // Default: 60, for TWAP/VWAP
  slice_size?: number;              // Default: total_size/10, for Iceberg
  max_participation_rate?: number;  // Default: 0.1 (10%), for VWAP
  price_limit?: number;             // Optional: worst acceptable price
  start_immediately?: boolean;      // Default: true
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data?: {
    execution_id: string;
    status: "started" | "scheduled";
    algorithm: string;
    total_size: number;
    executed_size: number;
    remaining_size: number;
    average_price?: number;
    child_orders: string[];          // Array of order IDs
    estimated_completion: number;    // Timestamp
  };
  error?: string;
}
```

### 5. Risk Management Tools (`risk`)

#### `get_risk_metrics`
**Purpose**: Retrieve real-time position and portfolio risk assessments
**Category**: risk

**Parameters Schema**:
```typescript
{
  include_position_risk?: boolean;  // Default: true
  include_portfolio_risk?: boolean; // Default: true
  include_var_calculation?: boolean; // Default: false
  var_confidence_level?: number;    // Default: 0.95
  var_time_horizon_days?: number;   // Default: 1
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data: {
    position_risks?: Array<{
      asset: string;
      position_size: number;
      position_value: number;
      unrealized_pnl: number;
      daily_var: number;
      max_drawdown_24h: number;
      risk_score: number;           // 0-100 scale
    }>;
    portfolio_risk?: {
      total_exposure: number;
      net_exposure: number;
      gross_exposure: number;
      leverage: number;
      concentration_risk: number;   // 0-100 scale
      correlation_risk: number;     // 0-100 scale
      overall_risk_score: number;   // 0-100 scale
    };
    var_metrics?: {
      daily_var: number;
      weekly_var: number;
      confidence_level: number;
      methodology: "historical" | "parametric" | "monte_carlo";
    };
  };
  error?: string;
}
```

---

#### `set_risk_limits`
**Purpose**: Configure and update risk management parameters
**Category**: risk

**Parameters Schema**:
```typescript
{
  max_position_size?: number;
  max_portfolio_value?: number;
  max_daily_loss?: number;
  max_drawdown_percent?: number;
  position_concentration_limit?: number; // Max % of portfolio per position
  leverage_limit?: number;
  daily_trade_limit?: number;
  enable_auto_deleveraging?: boolean;
  stop_loss_percent?: number;        // Auto stop-loss threshold
}
```

### 6. Cross-Chain Tools (`cross_chain`)

#### `bridge_assets`
**Purpose**: Initiate cross-chain asset transfers via GlueX Router
**Category**: cross_chain

**Parameters Schema**:
```typescript
{
  from_chain: string;               // Required: source chain
  to_chain: string;                 // Required: destination chain
  asset: string;                    // Required: asset to bridge
  amount: number;                   // Required: amount to bridge
  recipient_address?: string;       // Optional: different recipient
  max_slippage_percent?: number;    // Default: 1.0
  deadline_minutes?: number;        // Default: 20
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data?: {
    bridge_id: string;
    transaction_hash?: string;
    estimated_time_minutes: number;
    estimated_fees: {
      bridge_fee: number;
      gas_fee: number;
      total_fee: number;
    };
    route: Array<{
      chain: string;
      protocol: string;
      step_type: "swap" | "bridge" | "deposit" | "withdraw";
    }>;
  };
  error?: string;
}
```

---

#### `get_bridge_status`
**Purpose**: Monitor cross-chain transaction status
**Category**: cross_chain

**Parameters Schema**:
```typescript
{
  bridge_id: string;                // Required
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data?: {
    bridge_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress_percent: number;
    current_step: string;
    transaction_hashes: {
      [chain: string]: string;
    };
    completion_time?: number;
    failure_reason?: string;
  };
  error?: string;
}
```

### 7. Portfolio Analysis Tools (`portfolio`)

#### `monitor_portfolio`
**Purpose**: Comprehensive portfolio monitoring and analytics
**Category**: portfolio

**Parameters Schema**:
```typescript
{
  include_performance_metrics?: boolean; // Default: true
  include_allocation_analysis?: boolean; // Default: true
  include_correlation_matrix?: boolean;  // Default: false
  performance_period_days?: number;      // Default: 30
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data: {
    performance_metrics?: {
      total_return_percent: number;
      annualized_return_percent: number;
      volatility_percent: number;
      sharpe_ratio: number;
      max_drawdown_percent: number;
      win_rate_percent: number;
      profit_factor: number;
    };
    allocation_analysis?: {
      positions: Array<{
        asset: string;
        value: number;
        weight_percent: number;
        pnl_24h: number;
        pnl_24h_percent: number;
      }>;
      sector_allocation?: {
        [sector: string]: number; // percentage
      };
    };
    correlation_matrix?: {
      [asset1: string]: {
        [asset2: string]: number; // correlation coefficient
      };
    };
  };
  error?: string;
}
```

### 8. Network Monitoring Tools (`network`)

#### `get_network_status`
**Purpose**: Monitor HyperLiquid network health and performance
**Category**: network

**Parameters Schema**:
```typescript
{
  include_node_info?: boolean;      // Default: true
  include_performance_metrics?: boolean; // Default: true
  include_recent_blocks?: boolean;  // Default: false
}
```

**Return Schema**:
```typescript
{
  success: boolean;
  data: {
    network_status: "healthy" | "degraded" | "maintenance";
    block_height: number;
    block_time_seconds: number;
    node_info?: {
      total_nodes: number;
      active_nodes: number;
      validator_count: number;
      network_version: string;
    };
    performance_metrics?: {
      avg_block_time: number;
      transaction_throughput: number;
      api_response_time_ms: number;
      websocket_latency_ms: number;
    };
    recent_blocks?: Array<{
      height: number;
      hash: string;
      timestamp: number;
      transaction_count: number;
    }>;
  };
  error?: string;
}
```

## Error Handling

### Standard Error Codes

All tools return consistent error codes:

- `INVALID_PARAMETERS`: Parameter validation failed
- `AUTHENTICATION_FAILED`: API key or authentication issue
- `RATE_LIMIT_EXCEEDED`: API rate limit reached
- `INSUFFICIENT_BALANCE`: Not enough funds for operation
- `MARKET_CLOSED`: Trading not available for asset
- `API_UNAVAILABLE`: External service unavailable
- `INTERNAL_ERROR`: Server-side processing error
- `RISK_LIMIT_EXCEEDED`: Operation violates risk limits
- `INVALID_ASSET`: Asset not supported
- `ORDER_NOT_FOUND`: Order ID not found
- `BRIDGE_FAILED`: Cross-chain operation failed

### Rate Limiting

- Default: 60 requests per minute per tool category
- Burst allowance: 10 requests per second
- Rate limit headers included in responses
- Exponential backoff recommended for retries

## Usage Examples

### Market Data Query
```json
{
  "tool": "get_market_data",
  "arguments": {
    "assets": ["BTC", "ETH"],
    "include_order_book": true,
    "order_book_depth": 5
  }
}
```

### Smart Order Execution
```json
{
  "tool": "smart_order_execution",
  "arguments": {
    "asset": "BTC",
    "side": "buy",
    "total_size": 1.5,
    "algorithm": "twap",
    "time_window_minutes": 30,
    "price_limit": 45000
  }
}
```

### Risk Assessment
```json
{
  "tool": "get_risk_metrics",
  "arguments": {
    "include_var_calculation": true,
    "var_confidence_level": 0.99
  }
}
```

This specification ensures all MCP tools are precisely defined with complete schemas, error conditions, and usage examples for reliable automated implementation.