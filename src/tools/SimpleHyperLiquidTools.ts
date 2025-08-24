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
}
