# HyperLiquid Intelligence MCP - API Integration Specifications

## Overview

This document provides detailed specifications for all external API integrations used by the HyperLiquid Intelligence MCP server, including authentication flows, request/response formats, error handling, and rate limiting strategies.

## 1. HyperLiquid API Integration

### Base Configuration
- **REST Base URL**: `https://api.hyperliquid.xyz`
- **WebSocket URL**: `wss://api.hyperliquid.xyz/ws`
- **API Version**: v1
- **Authentication**: API Key + Secret (HMAC-SHA256)
- **Rate Limits**: 
  - REST: 1200 requests/minute (20 req/sec)
  - WebSocket: 5 connections max per account

### Authentication Flow

#### REST API Authentication
```typescript
interface AuthHeaders {
  'HL-API-KEY': string;
  'HL-API-SIGNATURE': string;
  'HL-API-TIMESTAMP': string;
  'Content-Type': 'application/json';
}

// HMAC-SHA256 signature calculation
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(timestamp + method + path + body)
  .digest('hex');
```

#### WebSocket Authentication
```json
{
  "method": "subscribe",
  "subscription": {
    "type": "authenticate",
    "user": "USER_ADDRESS",
    "signature": "HMAC_SIGNATURE",
    "timestamp": 1234567890
  }
}
```

### REST API Endpoints

#### Account Information
**Endpoint**: `GET /info/user_state`
**Parameters**:
```typescript
{
  user: string; // User wallet address
}
```
**Response**:
```typescript
{
  assetPositions: Array<{
    position: {
      coin: string;
      entryPx: string;
      positionValue: string;
      returnOnEquity: string;
      szi: string; // Size
      unrealizedPnl: string;
    };
    type: "oneWay";
  }>;
  crossMaintenanceMarginUsed: string;
  crossMarginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  time: number;
}
```

#### Market Data
**Endpoint**: `GET /info/all_mids`
**Response**:
```typescript
{
  [symbol: string]: string; // asset -> mid price
}
```

**Endpoint**: `GET /info/l2/{symbol}`
**Response**:
```typescript
{
  coin: string;
  levels: Array<Array<{
    px: string; // Price
    sz: string; // Size
    n: number;  // Number of orders
  }>>;
  time: number;
}
```

#### Order Management
**Endpoint**: `POST /exchange/order`
**Request**:
```typescript
{
  action: {
    type: "order";
    orders: Array<{
      a: number;        // Asset index
      b: boolean;       // Is buy
      p: string;        // Price (limit orders)
      s: string;        // Size
      r: boolean;       // Reduce only
      t: {              // Order type
        limit?: {
          tif: "Gtc" | "Ioc" | "Alo";
        };
        trigger?: {
          triggerPx: string;
          isMarket: boolean;
          tpsl: "tp" | "sl";
        };
      };
    }>;
  };
  nonce: number;
  signature: {
    r: string;
    s: string;
    v: number;
  };
  vaultAddress?: string;
}
```
**Response**:
```typescript
{
  status: "ok" | "err";
  response?: {
    type: "order";
    data: {
      statuses: Array<{
        resting?: {
          oid: number; // Order ID
        };
        error?: string;
        filled?: {
          totalSz: string;
          avgPx: string;
          oid: number;
        };
      }>;
    };
  };
}
```

### WebSocket API Streams

#### Market Data Subscription
```json
{
  "method": "subscribe",
  "subscription": {
    "type": "l2Book",
    "coin": "BTC"
  }
}
```

**L2 Book Updates**:
```typescript
{
  channel: "l2Book";
  data: {
    coin: string;
    levels: Array<[Array<{px: string, sz: string, n: number}>, Array<{px: string, sz: string, n: number}>]>;
    time: number;
  };
}
```

#### User Data Subscription
```json
{
  "method": "subscribe",
  "subscription": {
    "type": "user_events",
    "user": "USER_ADDRESS"
  }
}
```

**User Events**:
```typescript
{
  channel: "user_events";
  data: {
    fills?: Array<{
      coin: string;
      px: string;
      sz: string;
      side: "A" | "B"; // Ask/Bid
      time: number;
      startPosition: string;
      dir: string;
      closedPnl: string;
      hash: string;
      oid: number;
      crossed: boolean;
      fee: string;
    }>;
    liquidation?: {
      // Liquidation event structure
    };
  };
}
```

### Error Handling

#### REST API Errors
```typescript
{
  status: "err";
  response: {
    type: "error";
    payload: string; // Error message
  };
}
```

#### Common Error Codes
- `"Invalid signature"`: Authentication failed
- `"Rate limit exceeded"`: Too many requests
- `"Insufficient margin"`: Not enough funds
- `"Invalid coin"`: Asset not supported
- `"Market closed"`: Trading suspended
- `"Order not found"`: Invalid order ID

---

## 2. GlueX Router API Integration

### Base Configuration
- **Base URL**: `https://api.gluex.org/v1`
- **Authentication**: Bearer Token (API Key)
- **Rate Limits**: 100 requests/minute
- **Timeout**: 30 seconds

### Authentication
```typescript
const headers = {
  'Authorization': `Bearer ${process.env.GLUEX_API_KEY}`,
  'Content-Type': 'application/json',
  'X-API-Version': '1.0'
};
```

### Supported Chains
- Ethereum (eth)
- Polygon (polygon)  
- Arbitrum (arbitrum)
- Optimism (optimism)
- Base (base)
- HyperLiquid (hyperliquid)

### Bridge Endpoints

#### Quote Bridge Transaction
**Endpoint**: `GET /bridge/quote`
**Parameters**:
```typescript
{
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: number; // Default: 1.0 (1%)
}
```
**Response**:
```typescript
{
  success: boolean;
  data: {
    fromChain: string;
    toChain: string;
    fromToken: {
      address: string;
      symbol: string;
      decimals: number;
    };
    toToken: {
      address: string;
      symbol: string;
      decimals: number;
    };
    fromAmount: string;
    toAmount: string;
    estimatedGas: string;
    fees: {
      bridgeFee: string;
      gasFee: string;
      protocolFee: string;
      totalFee: string;
    };
    route: Array<{
      protocol: string;
      chain: string;
      stepType: "swap" | "bridge";
      fromToken: string;
      toToken: string;
      estimatedTime: number; // seconds
    }>;
    estimatedTime: number; // total time in seconds
    slippage: number;
    deadline: number; // timestamp
  };
}
```

#### Execute Bridge Transaction
**Endpoint**: `POST /bridge/execute`
**Request**:
```typescript
{
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  recipient: string;
  slippage: number;
  deadline?: number;
  userAddress: string;
  signature: string; // Transaction signature
}
```
**Response**:
```typescript
{
  success: boolean;
  data: {
    bridgeId: string;
    transactionHash: string;
    status: "pending" | "processing" | "completed" | "failed";
    fromChain: string;
    toChain: string;
    estimatedTime: number;
    trackingUrl: string;
  };
}
```

#### Track Bridge Status
**Endpoint**: `GET /bridge/status/{bridgeId}`
**Response**:
```typescript
{
  success: boolean;
  data: {
    bridgeId: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress: {
      currentStep: number;
      totalSteps: number;
      description: string;
    };
    transactions: Array<{
      chain: string;
      hash: string;
      status: "pending" | "confirmed" | "failed";
      confirmations: number;
      requiredConfirmations: number;
    }>;
    fromAmount: string;
    toAmount?: string; // Available when completed
    fees: {
      totalPaid: string;
    };
    completedAt?: number;
    failureReason?: string;
  };
}
```

### Error Handling

#### Standard Error Response
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

#### Common Error Codes
- `INVALID_CHAIN`: Chain not supported
- `INVALID_TOKEN`: Token not supported on chain
- `INSUFFICIENT_LIQUIDITY`: Not enough liquidity for swap
- `SLIPPAGE_EXCEEDED`: Price moved beyond slippage tolerance
- `TRANSACTION_FAILED`: Blockchain transaction failed
- `BRIDGE_TIMEOUT`: Bridge operation timed out
- `INVALID_SIGNATURE`: Transaction signature invalid

---

## 3. Node Info API Integration

### Base Configuration
- **Base URL**: `https://api.nodeinfo.hyperliquid.xyz`
- **Authentication**: None (public API)
- **Rate Limits**: 60 requests/minute
- **Timeout**: 15 seconds

### Network Status Endpoints

#### Get Network Overview
**Endpoint**: `GET /network/status`
**Response**:
```typescript
{
  network: {
    name: "hyperliquid";
    chainId: number;
    blockHeight: number;
    blockTime: number;
    avgBlockTime: number; // seconds
    validators: {
      total: number;
      active: number;
    };
    version: string;
  };
  performance: {
    tps: number; // transactions per second
    avgLatency: number; // milliseconds
    uptime: number; // percentage
  };
  status: "healthy" | "degraded" | "maintenance";
}
```

#### Get Node Information
**Endpoint**: `GET /nodes`
**Response**:
```typescript
{
  nodes: Array<{
    id: string;
    status: "online" | "offline" | "syncing";
    version: string;
    location: string;
    syncHeight: number;
    latestHeight: number;
    uptime: number; // seconds
    peers: number;
  }>;
  summary: {
    totalNodes: number;
    onlineNodes: number;
    avgUptime: number;
  };
}
```

#### Get Recent Blocks
**Endpoint**: `GET /blocks/recent`
**Parameters**:
```typescript
{
  limit?: number; // Default: 10, max: 100
}
```
**Response**:
```typescript
{
  blocks: Array<{
    height: number;
    hash: string;
    timestamp: number;
    transactionCount: number;
    validator: string;
    size: number; // bytes
    gasUsed: string;
    gasLimit: string;
  }>;
}
```

---

## 4. Rate Limiting Strategy

### Global Rate Limiting
```typescript
interface RateLimitConfig {
  hyperliquid: {
    rest: {
      requestsPerMinute: 1200;
      burstLimit: 20;
    };
    websocket: {
      maxConnections: 5;
      messagesPerSecond: 10;
    };
  };
  gluex: {
    requestsPerMinute: 100;
    burstLimit: 5;
  };
  nodeInfo: {
    requestsPerMinute: 60;
    burstLimit: 10;
  };
}
```

### Rate Limiting Implementation
```typescript
class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  
  async checkLimit(endpoint: string): Promise<boolean> {
    const bucket = this.buckets.get(endpoint);
    return bucket?.consume() ?? false;
  }
  
  async waitForAvailable(endpoint: string): Promise<void> {
    const bucket = this.buckets.get(endpoint);
    if (bucket && !bucket.hasTokens()) {
      await bucket.waitForTokens();
    }
  }
}
```

### Retry Strategy
```typescript
interface RetryConfig {
  maxRetries: 3;
  baseDelay: 1000; // ms
  maxDelay: 30000; // ms
  backoffMultiplier: 2;
  retryableErrors: [
    'RATE_LIMIT_EXCEEDED',
    'API_UNAVAILABLE',
    'TIMEOUT',
    'NETWORK_ERROR'
  ];
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}
```

---

## 5. Connection Management

### WebSocket Connection Handling
```typescript
class WebSocketManager {
  private connections = new Map<string, WebSocket>();
  private reconnectAttempts = new Map<string, number>();
  
  async connect(endpoint: string): Promise<WebSocket> {
    const ws = new WebSocket(endpoint);
    
    ws.on('open', () => {
      this.reconnectAttempts.set(endpoint, 0);
      this.setupHeartbeat(ws);
    });
    
    ws.on('close', () => {
      this.scheduleReconnect(endpoint);
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error on ${endpoint}:`, error);
    });
    
    return ws;
  }
  
  private scheduleReconnect(endpoint: string): void {
    const attempts = this.reconnectAttempts.get(endpoint) || 0;
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
    
    setTimeout(() => {
      this.reconnectAttempts.set(endpoint, attempts + 1);
      this.connect(endpoint);
    }, delay);
  }
}
```

### HTTP Connection Pooling
```typescript
import axios, { AxiosInstance } from 'axios';

class ApiClient {
  private clients = new Map<string, AxiosInstance>();
  
  getClient(baseURL: string): AxiosInstance {
    if (!this.clients.has(baseURL)) {
      const client = axios.create({
        baseURL,
        timeout: 30000,
        maxRedirects: 3,
        httpsAgent: new https.Agent({
          keepAlive: true,
          maxSockets: 50,
          maxFreeSockets: 10,
        }),
      });
      
      this.clients.set(baseURL, client);
    }
    
    return this.clients.get(baseURL)!;
  }
}
```

---

## 6. Error Recovery and Fallbacks

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

This comprehensive API specification ensures all external integrations are precisely defined with complete authentication flows, request/response formats, error handling strategies, and connection management patterns for reliable implementation.