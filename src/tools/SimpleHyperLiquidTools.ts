import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SimpleHyperLiquidAdapter } from '../adapters/hyperliquid/SimpleHyperLiquidAdapter.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('SIMPLE_HYPERLIQUID_TOOLS');

export class SimpleHyperLiquidTools {
  private adapter: SimpleHyperLiquidAdapter;

  constructor(adapter: SimpleHyperLiquidAdapter) {
    this.adapter = adapter;
  }

  // Tool definitions
  getToolDefinitions() {
    return [
      {
        name: 'hyperliquid_get_all_prices',
        description: 'Get current market prices for all assets on HyperLiquid',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_get_assets',
        description: 'Get information about all available trading assets',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_get_order_book',
        description: 'Get order book data for a specific asset',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Trading symbol (e.g., BTC, ETH)',
            },
          },
          required: ['symbol'],
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_get_trades',
        description: 'Get recent trades for a specific asset',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Trading symbol (e.g., BTC, ETH)',
            },
          },
          required: ['symbol'],
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_get_candles',
        description: 'Get candlestick data for a specific asset',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Trading symbol (e.g., BTC, ETH)',
            },
            interval: {
              type: 'string',
              description: 'Time interval (e.g., 1m, 5m, 1h, 1d)',
              enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
            },
            startTime: {
              type: 'number',
              description: 'Optional start time in milliseconds',
            },
            endTime: {
              type: 'number',
              description: 'Optional end time in milliseconds',
            },
          },
          required: ['symbol', 'interval'],
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_get_account_info',
        description: 'Get account information including balances and positions',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Optional wallet address. Uses default if not provided.',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_health_check',
        description: 'Check the health and connectivity of HyperLiquid adapter',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_place_market_order',
        description: 'Place a market order on HyperLiquid (requires private key)',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: {
              type: 'number',
              description: 'Asset ID for the trading pair',
            },
            isBuy: {
              type: 'boolean',
              description: 'True for buy order, false for sell order',
            },
            size: {
              type: 'string',
              description: 'Order size (amount to trade)',
            },
            reduceOnly: {
              type: 'boolean',
              description: 'Whether this is a reduce-only order',
              default: false,
            },
          },
          required: ['assetId', 'isBuy', 'size'],
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_place_limit_order',
        description: 'Place a limit order on HyperLiquid (requires private key)',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: {
              type: 'number',
              description: 'Asset ID for the trading pair',
            },
            isBuy: {
              type: 'boolean',
              description: 'True for buy order, false for sell order',
            },
            price: {
              type: 'string',
              description: 'Limit price for the order',
            },
            size: {
              type: 'string',
              description: 'Order size (amount to trade)',
            },
            timeInForce: {
              type: 'string',
              description: 'Time in force for the order',
              enum: ['Alo', 'Ioc', 'Gtc'],
              default: 'Gtc',
            },
            reduceOnly: {
              type: 'boolean',
              description: 'Whether this is a reduce-only order',
              default: false,
            },
          },
          required: ['assetId', 'isBuy', 'price', 'size'],
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_cancel_order',
        description: 'Cancel an existing order on HyperLiquid (requires private key)',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: {
              type: 'number',
              description: 'Asset ID for the trading pair',
            },
            orderId: {
              type: 'number',
              description: 'Order ID to cancel',
            },
          },
          required: ['assetId', 'orderId'],
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_get_open_orders',
        description: 'Get open orders for the account',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Optional wallet address. Uses default if not provided.',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_get_user_fills',
        description: 'Get recent fills/trades for the account',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Optional wallet address. Uses default if not provided.',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'hyperliquid_websocket_status',
        description: 'Get WebSocket connection status and active subscriptions',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
    ];
  }

  // Tool handlers
  async handleToolCall(name: string, args: unknown): Promise<CallToolResult> {
    try {
      logger.info('Handling tool call', { tool: name, args });

      switch (name) {
        case 'hyperliquid_get_all_prices':
          return await this.getAllPrices();

        case 'hyperliquid_get_assets':
          return await this.getAssets();

        case 'hyperliquid_get_order_book':
          return await this.getOrderBook(args);

        case 'hyperliquid_get_trades':
          return await this.getTrades(args);

        case 'hyperliquid_get_candles':
          return await this.getCandles(args);

        case 'hyperliquid_get_account_info':
          return await this.getAccountInfo(args);

        case 'hyperliquid_health_check':
          return await this.healthCheck();

        case 'hyperliquid_place_market_order':
          return await this.placeMarketOrder(args);

        case 'hyperliquid_place_limit_order':
          return await this.placeLimitOrder(args);

        case 'hyperliquid_cancel_order':
          return await this.cancelOrder(args);

        case 'hyperliquid_get_open_orders':
          return await this.getOpenOrders(args);

        case 'hyperliquid_get_user_fills':
          return await this.getUserFills(args);

        case 'hyperliquid_websocket_status':
          return await this.getWebSocketStatus();

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error('Tool call failed', { tool: name, error });

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
      };
    }
  }

  // Individual tool implementations
  private async getAllPrices(): Promise<CallToolResult> {
    const prices = await this.adapter.getAllMids();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              prices,
              timestamp: new Date().toISOString(),
              count: Object.keys(prices).length,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getAssets(): Promise<CallToolResult> {
    const assets = await this.adapter.getAssets();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              assets,
              timestamp: new Date().toISOString(),
              count: Array.isArray(assets) ? assets.length : 0,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getOrderBook(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      symbol: z.string(),
    });

    const parsed = schema.parse(args);
    const orderBook = await this.adapter.getOrderBook(parsed.symbol);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              symbol: parsed.symbol,
              orderBook,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getTrades(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      symbol: z.string(),
    });

    const parsed = schema.parse(args);
    const trades = await this.adapter.getTrades(parsed.symbol);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              symbol: parsed.symbol,
              trades,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getCandles(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      symbol: z.string(),
      interval: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']),
      startTime: z.number().optional(),
      endTime: z.number().optional(),
    });

    const parsed = schema.parse(args);
    const candles = await this.adapter.getCandles(
      parsed.symbol,
      parsed.interval,
      parsed.startTime,
      parsed.endTime
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              symbol: parsed.symbol,
              interval: parsed.interval,
              candles,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getAccountInfo(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      address: z.string().optional(),
    });

    const parsed = schema.parse(args);

    try {
      const accountInfo = await this.adapter.getAccountState(parsed.address);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                address: parsed.address || 'default',
                accountInfo,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                address: parsed.address || 'default',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async healthCheck(): Promise<CallToolResult> {
    const health = await this.adapter.healthCheck(true);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              healthy: health.healthy,
              latencyMs: health.latencyMs,
              details: health.details,
              errors: health.errors,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async placeMarketOrder(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      assetId: z.number(),
      isBuy: z.boolean(),
      size: z.string(),
      reduceOnly: z.boolean().default(false),
    });

    const parsed = schema.parse(args);

    try {
      const result = await this.adapter.placeMarketOrder(
        parsed.assetId,
        parsed.isBuy,
        parsed.size,
        parsed.reduceOnly
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'place_market_order',
                assetId: parsed.assetId,
                isBuy: parsed.isBuy,
                size: parsed.size,
                reduceOnly: parsed.reduceOnly,
                result,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'place_market_order',
                error: error instanceof Error ? error.message : 'Unknown error',
                assetId: parsed.assetId,
                isBuy: parsed.isBuy,
                size: parsed.size,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async placeLimitOrder(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      assetId: z.number(),
      isBuy: z.boolean(),
      price: z.string(),
      size: z.string(),
      timeInForce: z.enum(['Alo', 'Ioc', 'Gtc']).default('Gtc'),
      reduceOnly: z.boolean().default(false),
    });

    const parsed = schema.parse(args);

    try {
      const result = await this.adapter.placeLimitOrder(
        parsed.assetId,
        parsed.isBuy,
        parsed.price,
        parsed.size,
        parsed.timeInForce,
        parsed.reduceOnly
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'place_limit_order',
                assetId: parsed.assetId,
                isBuy: parsed.isBuy,
                price: parsed.price,
                size: parsed.size,
                timeInForce: parsed.timeInForce,
                reduceOnly: parsed.reduceOnly,
                result,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'place_limit_order',
                error: error instanceof Error ? error.message : 'Unknown error',
                assetId: parsed.assetId,
                price: parsed.price,
                size: parsed.size,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async cancelOrder(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      assetId: z.number(),
      orderId: z.number(),
    });

    const parsed = schema.parse(args);

    try {
      const result = await this.adapter.cancelOrder(parsed.assetId, parsed.orderId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'cancel_order',
                assetId: parsed.assetId,
                orderId: parsed.orderId,
                result,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'cancel_order',
                error: error instanceof Error ? error.message : 'Unknown error',
                assetId: parsed.assetId,
                orderId: parsed.orderId,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async getOpenOrders(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      address: z.string().optional(),
    });

    const parsed = schema.parse(args);

    try {
      const orders = await this.adapter.getOpenOrders(parsed.address);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                address: parsed.address || 'default',
                orders,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                address: parsed.address || 'default',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async getUserFills(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      address: z.string().optional(),
    });

    const parsed = schema.parse(args);

    try {
      const fills = await this.adapter.getUserFills(parsed.address);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                address: parsed.address || 'default',
                fills,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                address: parsed.address || 'default',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async getWebSocketStatus(): Promise<CallToolResult> {
    try {
      const status = this.adapter.getWebSocketStatus();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                websocket_status: status,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                websocket_status: {
                  error: error instanceof Error ? error.message : 'Unknown error',
                },
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }
}
