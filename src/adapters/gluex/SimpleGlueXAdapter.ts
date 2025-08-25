import { BaseAdapter, AdapterMetadata, AdapterHealthStatus } from '../BaseAdapter.js';
import { createComponentLogger } from '../../utils/logger.js';
import { z } from 'zod';
import type {
  ChainInfo,
  TokenInfo,
  RouteRequest,
  Quote,
  TransactionRequest,
  TransactionResponse,
  BridgeStatus,
  LiquidityPool,
  PriceData,
  TokenMetrics,
  GlueXResponse,
  PaginatedResponse,
} from './types.js';

const logger = createComponentLogger('SIMPLE_GLUEX_ADAPTER');

export interface SimpleGlueXConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export class SimpleGlueXAdapter extends BaseAdapter {
  private apiKey?: string;

  constructor(config: SimpleGlueXConfig) {
    const metadata: AdapterMetadata = {
      name: config.name,
      version: '1.0.0',
      description: 'GlueX cross-chain router adapter for DeFi operations',
      protocol: 'REST',
      baseUrl: config.baseUrl,
      endpoints: ['/liquidity', '/v1/price', '/v1/quote'],
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 20,
      },
      authentication: {
        type: 'api_key',
        required: false,
        fields: ['apiKey'],
      },
      capabilities: [
        'cross_chain',
        'token_routing',
        'liquidity_pools',
        'price_data',
        'bridge_monitoring',
        'multi_chain',
      ],
    };

    const adapterConfig = {
      name: config.name,
      baseUrl: config.baseUrl,
      timeout: config.timeout || 30000,
      retries: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
      },
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 20,
      },
    };

    super(metadata, adapterConfig);

    this.apiKey = config.apiKey;

    logger.info('SimpleGlueXAdapter created', {
      base_url: config.baseUrl,
      has_api_key: !!config.apiKey,
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test connection with a simple API call to liquidity endpoint
      await this.getLiquidityInfo();
      logger.info('GlueX adapter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize GlueX adapter', { error });
      throw error;
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      const liquidityInfo = await this.getLiquidityInfo();
      return (
        liquidityInfo &&
        liquidityInfo.chains &&
        Array.isArray(liquidityInfo.chains) &&
        liquidityInfo.chains.length > 0
      );
    } catch (error) {
      logger.error('Connection validation failed', { error });
      return false;
    }
  }

  getEndpointInfo(endpoint: string): { path: string; method: string; schema?: z.ZodSchema } {
    const endpoints = {
      '/liquidity': {
        path: '/liquidity',
        method: 'GET',
      },
      '/tokens': {
        path: '/tokens',
        method: 'GET',
        schema: z.object({
          chainId: z.number().optional(),
          search: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }),
      },
      '/quote': {
        path: '/quote',
        method: 'POST',
        schema: z.object({
          fromChainId: z.number(),
          toChainId: z.number(),
          fromTokenAddress: z.string(),
          toTokenAddress: z.string(),
          amount: z.string(),
          slippage: z.number().optional(),
          userAddress: z.string().optional(),
        }),
      },
      '/route': {
        path: '/route',
        method: 'POST',
        schema: z.object({
          routeId: z.string(),
          userAddress: z.string(),
          slippage: z.number(),
          deadline: z.number().optional(),
        }),
      },
      '/status': {
        path: '/status',
        method: 'GET',
        schema: z.object({
          txHash: z.string(),
          chainId: z.number(),
        }),
      },
    };

    const info = endpoints[endpoint as keyof typeof endpoints];
    if (!info) {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    return info;
  }

  // Chain and Token Methods
  async getLiquidityInfo(): Promise<{
    chains: ChainInfo[];
    liquidityModules: Record<string, unknown>;
  }> {
    const response = await this.makeRequest('/liquidity');
    return response as { chains: ChainInfo[]; liquidityModules: Record<string, unknown> };
  }

  async getSupportedChains(): Promise<ChainInfo[]> {
    const liquidityInfo = await this.getLiquidityInfo();
    return liquidityInfo.chains || [];
  }

  async getTokens(
    chainId?: number,
    search?: string,
    limit?: number,
    offset?: number
  ): Promise<TokenInfo[]> {
    const params = new URLSearchParams();
    if (chainId) params.append('chainId', chainId.toString());
    if (search) params.append('search', search);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const url = `/tokens${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.makeRequest(url);

    const data = (response as GlueXResponse<TokenInfo[] | PaginatedResponse<TokenInfo>>).data;
    if (Array.isArray(data)) {
      return data;
    } else if (data && 'data' in data) {
      return (data as PaginatedResponse<TokenInfo>).data;
    }
    return [];
  }

  async getTokenInfo(chainId: number, tokenAddress: string): Promise<TokenInfo | null> {
    const url = `/tokens/${chainId}/${tokenAddress}`;
    const response = await this.makeRequest(url);
    return (response as GlueXResponse<TokenInfo>).data || null;
  }

  // Routing and Quote Methods
  async getQuote(request: RouteRequest): Promise<Quote | null> {
    const response = await this.makeRequest('/quote', request, 'POST');
    return (response as GlueXResponse<Quote>).data || null;
  }

  async getBestRoute(request: RouteRequest): Promise<Quote | null> {
    const quote = await this.getQuote(request);
    return quote;
  }

  async createTransaction(request: TransactionRequest): Promise<TransactionResponse | null> {
    const response = await this.makeRequest('/route', request, 'POST');
    return (response as GlueXResponse<TransactionResponse>).data || null;
  }

  // Transaction and Status Methods
  async getTransactionStatus(txHash: string, chainId: number): Promise<BridgeStatus | null> {
    const url = `/status?txHash=${txHash}&chainId=${chainId}`;
    const response = await this.makeRequest(url);
    return (response as GlueXResponse<BridgeStatus>).data || null;
  }

  async trackBridge(txHash: string, chainId: number): Promise<BridgeStatus | null> {
    return await this.getTransactionStatus(txHash, chainId);
  }

  // Liquidity and Pool Methods
  async getLiquidityPools(chainId?: number, tokenAddress?: string): Promise<LiquidityPool[]> {
    const params = new URLSearchParams();
    if (chainId) params.append('chainId', chainId.toString());
    if (tokenAddress) params.append('tokenAddress', tokenAddress);

    const url = `/pools${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.makeRequest(url);

    const data = (response as GlueXResponse<LiquidityPool[] | PaginatedResponse<LiquidityPool>>)
      .data;
    if (Array.isArray(data)) {
      return data;
    } else if (data && 'data' in data) {
      return (data as PaginatedResponse<LiquidityPool>).data;
    }
    return [];
  }

  async getPoolInfo(chainId: number, poolAddress: string): Promise<LiquidityPool | null> {
    const url = `/pools/${chainId}/${poolAddress}`;
    const response = await this.makeRequest(url);
    return (response as GlueXResponse<LiquidityPool>).data || null;
  }

  // Price and Analytics Methods
  async getTokenPrice(chainId: number, tokenAddress: string): Promise<PriceData | null> {
    const url = `/prices/${chainId}/${tokenAddress}`;
    const response = await this.makeRequest(url);
    return (response as GlueXResponse<PriceData>).data || null;
  }

  async getTokenMetrics(chainId: number, tokenAddress: string): Promise<TokenMetrics | null> {
    const url = `/analytics/token/${chainId}/${tokenAddress}`;
    const response = await this.makeRequest(url);
    return (response as GlueXResponse<TokenMetrics>).data || null;
  }

  async getMultipleTokenPrices(
    requests: Array<{ chainId: number; tokenAddress: string }>
  ): Promise<PriceData[]> {
    const response = await this.makeRequest('/prices/batch', { tokens: requests }, 'POST');
    return (response as GlueXResponse<PriceData[]>).data || [];
  }

  // Health check override
  async healthCheck(force = false): Promise<AdapterHealthStatus> {
    const now = Date.now();

    // Use cached result if recent and not forced
    if (!force && this.getHealthStatus().lastChecked > now - 30000) {
      return this.getHealthStatus();
    }

    const startTime = Date.now();
    let healthy = false;
    let latencyMs: number | undefined;
    const errors: string[] = [];

    try {
      const liquidityInfo = await this.getLiquidityInfo();
      latencyMs = Date.now() - startTime;
      healthy =
        liquidityInfo &&
        liquidityInfo.chains &&
        Array.isArray(liquidityInfo.chains) &&
        liquidityInfo.chains.length > 0;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    const healthStatus: AdapterHealthStatus = {
      healthy,
      lastChecked: now,
      latencyMs,
      errors: errors.length > 0 ? errors : undefined,
      details: {
        adapter: this.metadata.name,
        base_url: this.config.baseUrl,
        has_api_key: !!this.apiKey,
        uptime: now - this.startTime,
      },
    };

    return healthStatus;
  }

  // Private helper method
  private async makeRequest(
    endpoint: string,
    data?: unknown,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<unknown> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      if (method === 'GET') {
        return await this.apiClient.get(endpoint, { headers });
      } else {
        return await this.apiClient.post(endpoint, data, { headers });
      }
    } catch (error) {
      logger.error('Request failed', { endpoint, method, error });
      throw error;
    }
  }

  // Getters for configuration
  getApiKey(): string | undefined {
    return this.apiKey;
  }

  // Utility methods for cross-chain operations
  async estimateBridgeTime(fromChainId: number, toChainId: number): Promise<number> {
    // Return estimated time in seconds based on chain combination
    const chainTimeMap: Record<string, number> = {
      '1-137': 900, // Ethereum to Polygon: 15 minutes
      '137-1': 1800, // Polygon to Ethereum: 30 minutes
      '1-56': 300, // Ethereum to BSC: 5 minutes
      '56-1': 600, // BSC to Ethereum: 10 minutes
      '1-43114': 600, // Ethereum to Avalanche: 10 minutes
      '43114-1': 600, // Avalanche to Ethereum: 10 minutes
    };

    const key = `${fromChainId}-${toChainId}`;
    return chainTimeMap[key] || 1200; // Default 20 minutes
  }

  async calculateMinimumReceived(amount: string, slippage: number): Promise<string> {
    const amountNum = parseFloat(amount);
    const minReceived = amountNum * (1 - slippage / 100);
    return minReceived.toString();
  }

  async validateRouteRequest(request: RouteRequest): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (
      request.fromChainId === request.toChainId &&
      request.fromTokenAddress.toLowerCase() === request.toTokenAddress.toLowerCase()
    ) {
      errors.push('Source and destination cannot be the same');
    }

    if (parseFloat(request.amount) <= 0) {
      errors.push('Amount must be positive');
    }

    if (request.slippage && (request.slippage < 0 || request.slippage > 50)) {
      errors.push('Slippage must be between 0 and 50 percent');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
