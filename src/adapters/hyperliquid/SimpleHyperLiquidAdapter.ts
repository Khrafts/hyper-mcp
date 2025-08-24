import { BaseAdapter, AdapterMetadata, AdapterHealthStatus } from '../BaseAdapter.js';
import { createComponentLogger } from '../../utils/logger.js';
import {
  HyperLiquidSigner,
  createHyperLiquidSigner,
  validateAction,
  OrderAction,
} from '../../utils/crypto.js';
import { z } from 'zod';

const logger = createComponentLogger('SIMPLE_HYPERLIQUID_ADAPTER');

export interface SimpleHyperLiquidConfig {
  name: string;
  baseUrl: string;
  wsUrl: string;
  privateKey?: string;
  address?: string;
  testnet?: boolean;
  timeout?: number;
}

export class SimpleHyperLiquidAdapter extends BaseAdapter {
  private wsUrl: string;
  private privateKey?: string;
  private userAddress?: string;
  private testnet: boolean;
  private signer?: HyperLiquidSigner;

  constructor(config: SimpleHyperLiquidConfig) {
    const metadata: AdapterMetadata = {
      name: config.name,
      version: '1.0.0',
      description: 'HyperLiquid DEX adapter for trading and market data',
      protocol: 'REST/WebSocket',
      baseUrl: config.baseUrl,
      endpoints: ['/info', '/exchange'],
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 20,
      },
      authentication: {
        type: 'custom',
        required: false,
        fields: ['privateKey', 'address'],
      },
      capabilities: [
        'market_data',
        'account_info',
        'trading',
        'websocket',
        'order_book',
        'trades',
        'candles',
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

    this.wsUrl = config.wsUrl;
    this.privateKey = config.privateKey;
    this.userAddress = config.address;
    this.testnet = config.testnet || false;

    // Initialize signer if private key is provided
    if (this.privateKey) {
      this.signer = createHyperLiquidSigner(this.privateKey);
      // Update user address from signer if not provided
      if (!this.userAddress) {
        this.userAddress = this.signer.getAddress();
      }
    }

    logger.info('SimpleHyperLiquidAdapter created', {
      base_url: config.baseUrl,
      ws_url: config.wsUrl,
      testnet: this.testnet,
      has_auth: !!(config.privateKey && config.address),
      signer_address: this.signer?.getAddress(),
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test connection with a simple API call
      await this.makeRequest('/info', { type: 'allMids' });
      logger.info('HyperLiquid adapter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize HyperLiquid adapter', { error });
      throw error;
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/info', { type: 'allMids' });
      return !!response && typeof response === 'object';
    } catch (error) {
      logger.error('Connection validation failed', { error });
      return false;
    }
  }

  getEndpointInfo(endpoint: string): { path: string; method: string; schema?: z.ZodSchema } {
    const endpoints = {
      '/info': {
        path: '/info',
        method: 'POST',
        schema: z.object({
          type: z.string(),
          coin: z.string().optional(),
          user: z.string().optional(),
        }),
      },
      '/exchange': {
        path: '/exchange',
        method: 'POST',
        schema: z.object({
          action: z.object({}),
          nonce: z.number(),
          signature: z.string(),
        }),
      },
    };

    const info = endpoints[endpoint as keyof typeof endpoints];
    if (!info) {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    return info;
  }

  // Market Data Methods
  async getAllMids(): Promise<Record<string, string>> {
    const response = await this.makeRequest('/info', { type: 'allMids' });
    return response as Record<string, string>;
  }

  async getAssets(): Promise<unknown[]> {
    const response = await this.makeRequest('/info', { type: 'meta' });
    return (response as { universe?: unknown[] }).universe || [];
  }

  async getOrderBook(coin: string): Promise<unknown> {
    return await this.makeRequest('/info', { type: 'l2Book', coin });
  }

  async getTrades(coin: string): Promise<unknown> {
    return await this.makeRequest('/info', { type: 'recentTrades', coin });
  }

  async getMarketState(user: string): Promise<unknown> {
    return await this.makeRequest('/info', { type: 'clearinghouseState', user });
  }

  async getCandles(
    coin: string,
    interval: string,
    startTime?: number,
    endTime?: number
  ): Promise<unknown> {
    return await this.makeRequest('/info', {
      type: 'candleSnapshot',
      req: {
        coin,
        interval,
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
      },
    });
  }

  // Account Methods
  async getAccountState(address?: string): Promise<unknown> {
    const userAddress = address || this.userAddress;
    if (!userAddress) {
      throw new Error('No address provided and no default address configured');
    }
    return await this.makeRequest('/info', { type: 'clearinghouseState', user: userAddress });
  }

  async getOpenOrders(address?: string): Promise<unknown> {
    const userAddress = address || this.userAddress;
    if (!userAddress) {
      throw new Error('No address provided and no default address configured');
    }
    return await this.makeRequest('/info', { type: 'openOrders', user: userAddress });
  }

  async getUserFills(address?: string): Promise<unknown> {
    const userAddress = address || this.userAddress;
    if (!userAddress) {
      throw new Error('No address provided and no default address configured');
    }
    return await this.makeRequest('/info', { type: 'userFills', user: userAddress });
  }

  // Trading Methods with proper signing
  async placeOrder(orderAction: OrderAction): Promise<unknown> {
    if (!this.signer) {
      throw new Error('Trading requires a private key and signer');
    }

    // Validate the action
    const validation = validateAction(orderAction);
    if (!validation.valid) {
      throw new Error(`Invalid order action: ${validation.errors.join(', ')}`);
    }

    const nonce = Date.now();
    const signature = await this.signer.signAction(orderAction, nonce);

    logger.debug('Placing order with signature', {
      action_type: orderAction.type,
      order_count: orderAction.orders.length,
      nonce,
    });

    return await this.makeRequest('/exchange', {
      action: orderAction,
      nonce,
      signature,
    });
  }

  async cancelOrder(assetId: number, orderId: number): Promise<unknown> {
    if (!this.signer) {
      throw new Error('Trading requires a private key and signer');
    }

    const cancelAction = this.signer.createCancelOrderAction(assetId, orderId);
    const nonce = Date.now();
    const signature = await this.signer.signAction(cancelAction, nonce);

    logger.debug('Cancelling order with signature', {
      asset_id: assetId,
      order_id: orderId,
      nonce,
    });

    return await this.makeRequest('/exchange', {
      action: cancelAction,
      nonce,
      signature,
    });
  }

  async modifyOrder(
    orderId: number,
    assetId: number,
    isBuy: boolean,
    price: string,
    size: string,
    timeInForce: 'Alo' | 'Ioc' | 'Gtc' = 'Gtc',
    reduceOnly: boolean = false
  ): Promise<unknown> {
    if (!this.signer) {
      throw new Error('Trading requires a private key and signer');
    }

    const modifyAction = this.signer.createModifyOrderAction(
      orderId,
      assetId,
      isBuy,
      price,
      size,
      timeInForce,
      reduceOnly
    );
    const nonce = Date.now();
    const signature = await this.signer.signAction(modifyAction, nonce);

    logger.debug('Modifying order with signature', {
      order_id: orderId,
      asset_id: assetId,
      price,
      size,
      nonce,
    });

    return await this.makeRequest('/exchange', {
      action: modifyAction,
      nonce,
      signature,
    });
  }

  // Convenience methods for common order types
  async placeMarketOrder(
    assetId: number,
    isBuy: boolean,
    size: string,
    reduceOnly: boolean = false
  ): Promise<unknown> {
    if (!this.signer) {
      throw new Error('Trading requires a private key and signer');
    }

    const orderAction = this.signer.createMarketOrderAction(assetId, isBuy, size, reduceOnly);
    return await this.placeOrder(orderAction);
  }

  async placeLimitOrder(
    assetId: number,
    isBuy: boolean,
    price: string,
    size: string,
    timeInForce: 'Alo' | 'Ioc' | 'Gtc' = 'Gtc',
    reduceOnly: boolean = false
  ): Promise<unknown> {
    if (!this.signer) {
      throw new Error('Trading requires a private key and signer');
    }

    const orderAction = this.signer.createLimitOrderAction(
      assetId,
      isBuy,
      price,
      size,
      timeInForce,
      reduceOnly
    );
    return await this.placeOrder(orderAction);
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
      const response = await this.getAllMids();
      latencyMs = Date.now() - startTime;
      healthy = !!response && typeof response === 'object';
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
        testnet: this.testnet,
        has_auth: !!this.privateKey,
        uptime: now - this.startTime,
      },
    };

    return healthStatus;
  }

  // Private helper method
  private async makeRequest(endpoint: string, data: unknown): Promise<unknown> {
    try {
      return await this.apiClient.post(endpoint, data);
    } catch (error) {
      logger.error('Request failed', { endpoint, error });
      throw error;
    }
  }

  // Getters for configuration
  getWsUrl(): string {
    return this.wsUrl;
  }

  getPrivateKey(): string | undefined {
    return this.privateKey;
  }

  getUserAddress(): string | undefined {
    return this.userAddress;
  }

  isTestnet(): boolean {
    return this.testnet;
  }

  getSigner(): HyperLiquidSigner | undefined {
    return this.signer;
  }
}
