import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('WEBSOCKET_MANAGER');

export interface WebSocketConfig {
  url: string;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  pingInterval: number;
  pongTimeout: number;
}

export interface WebSocketSubscription {
  id: string;
  channel: string;
  params: Record<string, unknown>;
  callback: (data: unknown) => void;
}

export class WebSocketManager extends EventEmitter {
  private ws?: WebSocket;
  private config: WebSocketConfig;
  private subscriptions: Map<string, WebSocketSubscription> = new Map();
  private reconnectAttempts = 0;
  private isConnected = false;
  private isReconnecting = false;
  private pingTimer?: NodeJS.Timeout;
  private pongTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config: WebSocketConfig) {
    super();
    this.config = config;
    logger.info('WebSocketManager initialized', {
      url: config.url,
      reconnectDelay: config.reconnectDelay,
      maxReconnectAttempts: config.maxReconnectAttempts,
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected || this.isReconnecting) {
      return;
    }

    logger.info('Connecting to WebSocket', { url: this.config.url });

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.url);

      const connectTimeout = setTimeout(() => {
        logger.error('WebSocket connection timeout');
        this.ws?.terminate();
        reject(new Error('Connection timeout'));
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectTimeout);
        this.isConnected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        logger.info('WebSocket connected successfully');
        this.emit('connected');
        this.startPingPong();
        this.resubscribeAll();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', { error, data: data.toString() });
        }
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        clearTimeout(connectTimeout);
        this.isConnected = false;
        this.stopPingPong();

        logger.warn('WebSocket connection closed', {
          code,
          reason: reason.toString(),
        });

        this.emit('disconnected', { code, reason: reason.toString() });

        if (code !== 1000 && !this.isReconnecting) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error: Error) => {
        clearTimeout(connectTimeout);
        logger.error('WebSocket error', { error: error.message });
        this.emit('error', error);

        if (!this.isConnected) {
          reject(error);
        }
      });

      this.ws.on('pong', () => {
        if (this.pongTimer) {
          clearTimeout(this.pongTimer);
          this.pongTimer = undefined;
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.ws) {
      return;
    }

    logger.info('Disconnecting WebSocket');

    this.isReconnecting = false;
    this.stopPingPong();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Normal closure');
    } else {
      this.ws.terminate();
    }

    this.ws = undefined;
    this.isConnected = false;
    this.subscriptions.clear();
  }

  subscribe(subscription: WebSocketSubscription): void {
    this.subscriptions.set(subscription.id, subscription);

    if (this.isConnected) {
      this.sendSubscription(subscription);
    }

    logger.debug('Added subscription', {
      id: subscription.id,
      channel: subscription.channel,
    });
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    if (this.isConnected) {
      this.sendUnsubscription(subscription);
    }

    this.subscriptions.delete(subscriptionId);

    logger.debug('Removed subscription', { id: subscriptionId });
  }

  send(data: unknown): void {
    if (!this.isConnected || !this.ws) {
      logger.warn('Cannot send data - WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to send WebSocket message', { error, data });
    }
  }

  getConnectionStatus(): {
    connected: boolean;
    reconnecting: boolean;
    reconnectAttempts: number;
    subscriptionCount: number;
  } {
    return {
      connected: this.isConnected,
      reconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
      subscriptionCount: this.subscriptions.size,
    };
  }

  private handleMessage(message: unknown): void {
    this.emit('message', message);

    // Handle subscription data based on message structure
    if (typeof message === 'object' && message !== null && 'channel' in message) {
      const channelMessage = message as { channel: string; data: unknown };

      // Find matching subscriptions
      for (const subscription of this.subscriptions.values()) {
        if (subscription.channel === channelMessage.channel) {
          try {
            subscription.callback(channelMessage.data);
          } catch (error) {
            logger.error('Subscription callback error', {
              subscriptionId: subscription.id,
              channel: subscription.channel,
              error,
            });
          }
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    logger.info('Scheduling reconnect', {
      attempt: this.reconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('Reconnect failed', { error });
        this.scheduleReconnect();
      }
    }, delay);
  }

  private startPingPong(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    this.pingTimer = setInterval(() => {
      if (!this.isConnected || !this.ws) {
        return;
      }

      this.ws.ping();

      this.pongTimer = setTimeout(() => {
        logger.warn('Pong timeout - closing connection');
        this.ws?.terminate();
      }, this.config.pongTimeout);
    }, this.config.pingInterval);
  }

  private stopPingPong(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }

    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = undefined;
    }
  }

  private resubscribeAll(): void {
    for (const subscription of this.subscriptions.values()) {
      this.sendSubscription(subscription);
    }
  }

  private sendSubscription(subscription: WebSocketSubscription): void {
    const subscribeMessage = {
      method: 'subscribe',
      channel: subscription.channel,
      params: subscription.params,
      id: subscription.id,
    };

    this.send(subscribeMessage);
  }

  private sendUnsubscription(subscription: WebSocketSubscription): void {
    const unsubscribeMessage = {
      method: 'unsubscribe',
      channel: subscription.channel,
      id: subscription.id,
    };

    this.send(unsubscribeMessage);
  }
}
