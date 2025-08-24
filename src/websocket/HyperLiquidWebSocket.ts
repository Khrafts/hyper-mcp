import { WebSocketManager, WebSocketConfig } from './WebSocketManager.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('HYPERLIQUID_WEBSOCKET');

export interface HyperLiquidSubscription {
  type: 'allMids' | 'l2Book' | 'trades' | 'candle' | 'orderUpdates' | 'userFills';
  coin?: string;
  user?: string;
  interval?: string;
}

export interface HyperLiquidMessage {
  channel: string;
  data: {
    coin?: string;
    levels?: Array<[string, string]>; // [price, size]
    trades?: Array<{
      coin: string;
      px: string;
      sz: string;
      time: number;
      side: string;
    }>;
    mids?: Record<string, string>;
    candle?: {
      coin: string;
      interval: string;
      candle: [number, string, string, string, string, string]; // [time, open, high, low, close, volume]
    };
    orders?: Array<{
      coin: string;
      side: string;
      limitPx: string;
      sz: string;
      oid: number;
      timestamp: number;
      origSz: string;
    }>;
    fills?: Array<{
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
    }>;
  };
}

export class HyperLiquidWebSocket {
  private wsManager: WebSocketManager;
  private subscriptionCallbacks: Map<string, (data: HyperLiquidMessage['data']) => void> =
    new Map();

  constructor(wsUrl: string, config?: Partial<WebSocketConfig>) {
    const defaultConfig: WebSocketConfig = {
      url: wsUrl,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      pingInterval: 30000,
      pongTimeout: 5000,
      ...config,
    };

    this.wsManager = new WebSocketManager(defaultConfig);
    this.setupEventHandlers();

    logger.info('HyperLiquidWebSocket initialized', { wsUrl });
  }

  private setupEventHandlers(): void {
    this.wsManager.on('connected', () => {
      logger.info('HyperLiquid WebSocket connected');
    });

    this.wsManager.on('disconnected', (info: { code: number; reason: string }) => {
      logger.warn('HyperLiquid WebSocket disconnected', info);
    });

    this.wsManager.on('error', (error: Error) => {
      logger.error('HyperLiquid WebSocket error', { error: error.message });
    });

    this.wsManager.on('message', (message: unknown) => {
      this.handleMessage(message);
    });
  }

  async connect(): Promise<void> {
    await this.wsManager.connect();
  }

  async disconnect(): Promise<void> {
    await this.wsManager.disconnect();
    this.subscriptionCallbacks.clear();
  }

  // Subscribe to all mids (current prices)
  subscribeToAllMids(callback: (mids: Record<string, string>) => void): string {
    const subscriptionId = this.generateSubscriptionId('allMids');

    this.wsManager.subscribe({
      id: subscriptionId,
      channel: 'allMids',
      params: { type: 'allMids' },
      callback: (data: unknown) => {
        const message = data as HyperLiquidMessage['data'];
        if (message.mids) {
          callback(message.mids);
        }
      },
    });

    return subscriptionId;
  }

  // Subscribe to level 2 order book for a specific coin
  subscribeToL2Book(
    coin: string,
    callback: (orderBook: { levels: Array<[string, string]> }) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId('l2Book', coin);

    this.wsManager.subscribe({
      id: subscriptionId,
      channel: 'l2Book',
      params: { type: 'l2Book', coin },
      callback: (data: unknown) => {
        const message = data as HyperLiquidMessage['data'];
        if (message.levels) {
          callback({ levels: message.levels });
        }
      },
    });

    return subscriptionId;
  }

  // Subscribe to trades for a specific coin
  subscribeToTrades(
    coin: string,
    callback: (trades: HyperLiquidMessage['data']['trades']) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId('trades', coin);

    this.wsManager.subscribe({
      id: subscriptionId,
      channel: 'trades',
      params: { type: 'trades', coin },
      callback: (data: unknown) => {
        const message = data as HyperLiquidMessage['data'];
        if (message.trades) {
          callback(message.trades);
        }
      },
    });

    return subscriptionId;
  }

  // Subscribe to candle data for a specific coin and interval
  subscribeToCandles(
    coin: string,
    interval: string,
    callback: (candle: HyperLiquidMessage['data']['candle']) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId('candle', coin, interval);

    this.wsManager.subscribe({
      id: subscriptionId,
      channel: 'candle',
      params: { type: 'candle', coin, interval },
      callback: (data: unknown) => {
        const message = data as HyperLiquidMessage['data'];
        if (message.candle) {
          callback(message.candle);
        }
      },
    });

    return subscriptionId;
  }

  // Subscribe to user order updates (requires authentication)
  subscribeToOrderUpdates(
    user: string,
    callback: (orders: HyperLiquidMessage['data']['orders']) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId('orderUpdates', user);

    this.wsManager.subscribe({
      id: subscriptionId,
      channel: 'orderUpdates',
      params: { type: 'orderUpdates', user },
      callback: (data: unknown) => {
        const message = data as HyperLiquidMessage['data'];
        if (message.orders) {
          callback(message.orders);
        }
      },
    });

    return subscriptionId;
  }

  // Subscribe to user fills/trades (requires authentication)
  subscribeToUserFills(
    user: string,
    callback: (fills: HyperLiquidMessage['data']['fills']) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId('userFills', user);

    this.wsManager.subscribe({
      id: subscriptionId,
      channel: 'userFills',
      params: { type: 'userFills', user },
      callback: (data: unknown) => {
        const message = data as HyperLiquidMessage['data'];
        if (message.fills) {
          callback(message.fills);
        }
      },
    });

    return subscriptionId;
  }

  // Unsubscribe from a specific subscription
  unsubscribe(subscriptionId: string): void {
    this.wsManager.unsubscribe(subscriptionId);
    this.subscriptionCallbacks.delete(subscriptionId);
  }

  // Get connection and subscription status
  getStatus(): {
    connected: boolean;
    reconnecting: boolean;
    reconnectAttempts: number;
    subscriptionCount: number;
    activeSubscriptions: string[];
  } {
    const wsStatus = this.wsManager.getConnectionStatus();

    return {
      ...wsStatus,
      activeSubscriptions: Array.from(this.subscriptionCallbacks.keys()),
    };
  }

  private handleMessage(message: unknown): void {
    try {
      // HyperLiquid WebSocket message handling
      if (typeof message === 'object' && message !== null) {
        const hlMessage = message as HyperLiquidMessage;

        logger.debug('Received HyperLiquid message', {
          channel: hlMessage.channel,
          dataKeys: Object.keys(hlMessage.data || {}),
        });

        // The WebSocketManager will route to appropriate subscription callbacks
      }
    } catch (error) {
      logger.error('Error handling HyperLiquid message', { error, message });
    }
  }

  private generateSubscriptionId(type: string, ...params: string[]): string {
    const timestamp = Date.now();
    const paramStr = params.length > 0 ? '_' + params.join('_') : '';
    return `${type}${paramStr}_${timestamp}`;
  }

  // Utility methods for common operations
  async subscribeToMultipleCoins(
    coins: string[],
    subscriptionType: 'l2Book' | 'trades' | 'candles',
    callback: (coin: string, data: unknown) => void,
    interval?: string
  ): Promise<string[]> {
    const subscriptionIds: string[] = [];

    for (const coin of coins) {
      let subscriptionId: string;

      switch (subscriptionType) {
        case 'l2Book':
          subscriptionId = this.subscribeToL2Book(coin, (data) => callback(coin, data));
          break;
        case 'trades':
          subscriptionId = this.subscribeToTrades(coin, (data) => callback(coin, data));
          break;
        case 'candles':
          if (!interval) throw new Error('Interval required for candle subscriptions');
          subscriptionId = this.subscribeToCandles(coin, interval, (data) => callback(coin, data));
          break;
        default:
          throw new Error(`Unsupported subscription type: ${subscriptionType}`);
      }

      subscriptionIds.push(subscriptionId);
    }

    return subscriptionIds;
  }

  // Clean shutdown
  async shutdown(): Promise<void> {
    logger.info('Shutting down HyperLiquid WebSocket');
    await this.disconnect();
  }
}
