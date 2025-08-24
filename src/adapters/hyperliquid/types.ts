// HyperLiquid API types and interfaces

export interface HyperLiquidConfig {
  baseUrl: string;
  wsUrl: string;
  privateKey?: string;
  address?: string;
  testnet?: boolean;
  timeout?: number;
  maxRetries?: number;
}

// Market Data Types
export interface AssetInfo {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated: boolean;
}

export interface MarketState {
  asset: string;
  dayNtlVlm: string;
  funding: string;
  impactPxs: string[];
  markPx: string;
  midPx: string;
  openInterest: string;
  oraclePx: string;
  premium: string;
  prevDayPx: string;
}

export interface Level {
  px: string;
  sz: string;
  n: number;
}

export interface OrderBook {
  coin: string;
  levels: [Level[], Level[]]; // [bids, asks]
  time: number;
}

export interface Trade {
  coin: string;
  side: 'A' | 'B'; // A = Ask (sell), B = Bid (buy)
  px: string;
  sz: string;
  time: number;
  tid: number;
}

// Account Types
export interface AssetPosition {
  coin: string;
  entryPx?: string;
  leverage: {
    type: 'cross' | 'isolated';
    value: number;
  };
  liquidationPx?: string;
  marginUsed: string;
  maxLeverage: number;
  positionValue: string;
  returnOnEquity: string;
  szi: string;
  unrealizedPnl: string;
}

export interface Balance {
  coin: string;
  hold: string;
  total: string;
}

export interface AccountState {
  assetPositions: AssetPosition[];
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
  withdrawable: string;
}

// Trading Types
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderSide = 'buy' | 'sell';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface OrderRequest {
  coin: string;
  is_buy: boolean;
  sz: number;
  limit_px: number;
  order_type: OrderType;
  reduce_only?: boolean;
  tif?: TimeInForce;
  cloid?: string;
}

export interface Order {
  coin: string;
  limitPx: string;
  oid: number;
  side: string;
  sz: string;
  timestamp: number;
  triggerCondition?: string;
  triggerPx?: string;
  children?: Order[];
  cloid?: string;
  orderType: string;
  origSz: string;
  reduceOnly: boolean;
  tif: string;
  isPositionTpsl: boolean;
}

export interface Fill {
  coin: string;
  px: string;
  sz: string;
  side: string;
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  liquidation?: boolean;
  tid: number;
  cloid?: string;
}

// WebSocket Types
export interface WSSubscription {
  method: 'subscribe';
  subscription: {
    type: 'l2Book' | 'trades' | 'orderUpdates' | 'userEvents' | 'candle' | 'notification';
    coin?: string;
    interval?: string;
    user?: string;
  };
}

export interface WSMessage {
  channel: string;
  data: unknown;
}

export interface L2BookUpdate {
  coin: string;
  levels: [Level[], Level[]];
  time: number;
}

export interface TradeUpdate {
  coin: string;
  side: 'A' | 'B';
  px: string;
  sz: string;
  time: number;
  tid: number;
}

export interface OrderUpdate {
  order: Order;
  status: 'open' | 'filled' | 'canceled' | 'triggered' | 'rejected';
  statusTimestamp: number;
}

export interface UserEvent {
  fills?: Fill[];
  liquidation?: {
    liquidatedPositions: AssetPosition[];
    accountValue: string;
  };
}

// API Response Types
export interface HyperLiquidResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface InfoResponse {
  universe: AssetInfo[];
}

export interface AllMidsResponse {
  [coin: string]: string;
}

export interface MetaResponse {
  universe: AssetInfo[];
}

export interface CandleSnapshot {
  c: string; // close
  h: string; // high
  l: string; // low
  n: number; // number of trades
  o: string; // open
  s: string; // start time (ms)
  t: number; // time (ms)
  v: string; // volume
}

export interface CandlesResponse {
  [coin: string]: CandleSnapshot[];
}
