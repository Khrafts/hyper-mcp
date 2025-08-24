// GlueX Router API types and interfaces

export interface GlueXConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

// Chain and Token Types
export interface ChainInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  supported: boolean;
}

export interface TokenInfo {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags: string[];
  coingeckoId?: string;
}

// Route and Quote Types
export interface RouteRequest {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage?: number;
  userAddress?: string;
  recipient?: string;
}

export interface RouteStep {
  type: 'swap' | 'bridge' | 'wrap' | 'unwrap';
  protocol: string;
  fromChainId: number;
  toChainId: number;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  minToAmount: string;
  exchangeRate: string;
  priceImpact: number;
  fee: {
    amount: string;
    percentage: number;
    breakdown: Array<{
      type: string;
      amount: string;
      percentage: number;
    }>;
  };
  estimatedGas: string;
  estimatedTime: number; // seconds
}

export interface Route {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  minToAmount: string;
  steps: RouteStep[];
  totalGasCost: string;
  totalTime: number;
  totalPriceImpact: number;
  totalFee: {
    amount: string;
    percentage: number;
  };
  confidence: number; // 0-1
  tags: string[];
}

export interface Quote {
  routes: Route[];
  requestId: string;
  timestamp: number;
  validFor: number; // seconds
  bestRoute: Route;
}

// Transaction Types
export interface TransactionRequest {
  routeId: string;
  userAddress: string;
  slippage: number;
  deadline?: number;
  referrer?: string;
}

export interface TransactionData {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId: number;
}

export interface TransactionResponse {
  transactionRequest: TransactionData;
  approvalRequest?: TransactionData;
  routeId: string;
  estimatedProcessingTime: number;
}

// Status and Monitoring Types
export interface TransactionStatus {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  chainId: number;
  blockNumber?: number;
  blockHash?: string;
  confirmations: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  error?: string;
}

export interface BridgeStatus {
  sourceChain: {
    txHash: string;
    status: TransactionStatus;
    amount: string;
    token: TokenInfo;
  };
  destinationChain?: {
    txHash?: string;
    status?: TransactionStatus;
    amount?: string;
    token?: TokenInfo;
    estimatedArrival?: number;
  };
  bridgeStatus: 'initiated' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  estimatedCompletion?: number;
}

// Liquidity and Pool Types
export interface LiquidityPool {
  chainId: number;
  address: string;
  token0: TokenInfo;
  token1: TokenInfo;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  fee: number;
  protocol: string;
  apy?: number;
  volume24h?: string;
  tvl?: string;
}

export interface LiquidityPosition {
  poolAddress: string;
  chainId: number;
  userAddress: string;
  token0Amount: string;
  token1Amount: string;
  lpTokenAmount: string;
  share: number; // percentage of pool
  unclaimedFees: {
    token0: string;
    token1: string;
  };
}

// Analytics and Historical Data
export interface PriceData {
  chainId: number;
  tokenAddress: string;
  price: number;
  priceChange24h: number;
  volume24h: string;
  marketCap?: string;
  timestamp: number;
}

export interface HistoricalPrice {
  timestamp: number;
  price: number;
  volume: string;
}

export interface TokenMetrics {
  chainId: number;
  tokenAddress: string;
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;
  volume24h: string;
  marketCap: string;
  totalSupply: string;
  circulatingSupply: string;
  holders: number;
  transfers24h: number;
  liquidity: string;
  fdv: string; // Fully diluted valuation
}

// API Response Types
export interface GlueXResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// WebSocket Event Types
export interface WSSubscription {
  type: 'price' | 'route' | 'transaction' | 'liquidity';
  params: {
    chainId?: number;
    tokenAddress?: string;
    routeId?: string;
    txHash?: string;
    poolAddress?: string;
  };
}

export interface WSPriceUpdate {
  chainId: number;
  tokenAddress: string;
  price: number;
  priceChange: number;
  volume: string;
  timestamp: number;
}

export interface WSRouteUpdate {
  routeId: string;
  status: 'active' | 'expired' | 'executed';
  updatedRoute?: Route;
  timestamp: number;
}

export interface WSTransactionUpdate {
  txHash: string;
  chainId: number;
  status: TransactionStatus;
  bridgeStatus?: BridgeStatus;
  timestamp: number;
}

export interface WSLiquidityUpdate {
  poolAddress: string;
  chainId: number;
  reserve0: string;
  reserve1: string;
  price0: number;
  price1: number;
  timestamp: number;
}

export type WSMessage =
  | { type: 'price'; data: WSPriceUpdate }
  | { type: 'route'; data: WSRouteUpdate }
  | { type: 'transaction'; data: WSTransactionUpdate }
  | { type: 'liquidity'; data: WSLiquidityUpdate };
