import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SimpleGlueXAdapter } from '../adapters/gluex/SimpleGlueXAdapter.js';
import { createComponentLogger } from '../utils/logger.js';
import type { RouteRequest, TransactionRequest } from '../adapters/gluex/types.js';

const logger = createComponentLogger('SIMPLE_GLUEX_TOOLS');

export class SimpleGlueXTools {
  private adapter: SimpleGlueXAdapter;

  constructor(adapter: SimpleGlueXAdapter) {
    this.adapter = adapter;
  }

  // Tool definitions
  getToolDefinitions() {
    return [
      {
        name: 'gluex_get_supported_chains',
        description:
          'Get all supported blockchain networks and liquidity modules from GlueX router',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_get_tokens',
        description: 'Get supported tokens, optionally filtered by chain or search term',
        inputSchema: {
          type: 'object',
          properties: {
            chainId: {
              type: 'number',
              description: 'Optional chain ID to filter tokens',
            },
            search: {
              type: 'string',
              description: 'Optional search term for token name or symbol',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tokens to return',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            offset: {
              type: 'number',
              description: 'Number of tokens to skip (for pagination)',
              minimum: 0,
              default: 0,
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_get_token_info',
        description: 'Get detailed information about a specific token',
        inputSchema: {
          type: 'object',
          properties: {
            chainId: {
              type: 'number',
              description: 'Chain ID where the token exists',
            },
            tokenAddress: {
              type: 'string',
              description: 'Token contract address',
            },
          },
          required: ['chainId', 'tokenAddress'],
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_get_quote',
        description: 'Get routing quote for cross-chain token swap',
        inputSchema: {
          type: 'object',
          properties: {
            fromChainId: {
              type: 'number',
              description: 'Source chain ID',
            },
            toChainId: {
              type: 'number',
              description: 'Destination chain ID',
            },
            fromTokenAddress: {
              type: 'string',
              description: 'Source token contract address',
            },
            toTokenAddress: {
              type: 'string',
              description: 'Destination token contract address',
            },
            amount: {
              type: 'string',
              description: 'Amount to swap (in token units)',
            },
            slippage: {
              type: 'number',
              description: 'Maximum slippage tolerance in percentage (default: 0.5)',
              minimum: 0,
              maximum: 50,
              default: 0.5,
            },
            userAddress: {
              type: 'string',
              description: 'Optional user wallet address for personalized quotes',
            },
          },
          required: ['fromChainId', 'toChainId', 'fromTokenAddress', 'toTokenAddress', 'amount'],
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_get_best_route',
        description: 'Get the best routing option for cross-chain swap',
        inputSchema: {
          type: 'object',
          properties: {
            fromChainId: {
              type: 'number',
              description: 'Source chain ID',
            },
            toChainId: {
              type: 'number',
              description: 'Destination chain ID',
            },
            fromTokenAddress: {
              type: 'string',
              description: 'Source token contract address',
            },
            toTokenAddress: {
              type: 'string',
              description: 'Destination token contract address',
            },
            amount: {
              type: 'string',
              description: 'Amount to swap (in token units)',
            },
            slippage: {
              type: 'number',
              description: 'Maximum slippage tolerance in percentage',
              minimum: 0,
              maximum: 50,
            },
            userAddress: {
              type: 'string',
              description: 'User wallet address',
            },
          },
          required: [
            'fromChainId',
            'toChainId',
            'fromTokenAddress',
            'toTokenAddress',
            'amount',
            'userAddress',
          ],
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_create_transaction',
        description: 'Create transaction data for executing a cross-chain route',
        inputSchema: {
          type: 'object',
          properties: {
            routeId: {
              type: 'string',
              description: 'Route ID from quote response',
            },
            userAddress: {
              type: 'string',
              description: 'User wallet address',
            },
            slippage: {
              type: 'number',
              description: 'Slippage tolerance in percentage',
              minimum: 0,
              maximum: 50,
            },
            deadline: {
              type: 'number',
              description: 'Optional transaction deadline (Unix timestamp)',
            },
          },
          required: ['routeId', 'userAddress', 'slippage'],
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_track_transaction',
        description: 'Track the status of a cross-chain transaction',
        inputSchema: {
          type: 'object',
          properties: {
            txHash: {
              type: 'string',
              description: 'Transaction hash to track',
            },
            chainId: {
              type: 'number',
              description: 'Chain ID where transaction was initiated',
            },
          },
          required: ['txHash', 'chainId'],
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_get_liquidity_pools',
        description: 'Get liquidity pools information',
        inputSchema: {
          type: 'object',
          properties: {
            chainId: {
              type: 'number',
              description: 'Optional chain ID to filter pools',
            },
            tokenAddress: {
              type: 'string',
              description: 'Optional token address to find pools containing this token',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_get_token_price',
        description: 'Get current price data for a specific token',
        inputSchema: {
          type: 'object',
          properties: {
            chainId: {
              type: 'number',
              description: 'Chain ID where the token exists',
            },
            tokenAddress: {
              type: 'string',
              description: 'Token contract address',
            },
          },
          required: ['chainId', 'tokenAddress'],
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_get_token_metrics',
        description: 'Get comprehensive analytics and metrics for a token',
        inputSchema: {
          type: 'object',
          properties: {
            chainId: {
              type: 'number',
              description: 'Chain ID where the token exists',
            },
            tokenAddress: {
              type: 'string',
              description: 'Token contract address',
            },
          },
          required: ['chainId', 'tokenAddress'],
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_get_multiple_prices',
        description: 'Get price data for multiple tokens at once',
        inputSchema: {
          type: 'object',
          properties: {
            tokens: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  chainId: { type: 'number' },
                  tokenAddress: { type: 'string' },
                },
                required: ['chainId', 'tokenAddress'],
              },
              description: 'Array of tokens to get prices for',
              minItems: 1,
              maxItems: 50,
            },
          },
          required: ['tokens'],
          additionalProperties: false,
        },
      },
      {
        name: 'gluex_health_check',
        description: 'Check the health and connectivity of GlueX router adapter',
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
      logger.info('Handling GlueX tool call', { tool: name, args });

      switch (name) {
        case 'gluex_get_supported_chains':
          return await this.getSupportedChains();

        case 'gluex_get_tokens':
          return await this.getTokens(args);

        case 'gluex_get_token_info':
          return await this.getTokenInfo(args);

        case 'gluex_get_quote':
          return await this.getQuote(args);

        case 'gluex_get_best_route':
          return await this.getBestRoute(args);

        case 'gluex_create_transaction':
          return await this.createTransaction(args);

        case 'gluex_track_transaction':
          return await this.trackTransaction(args);

        case 'gluex_get_liquidity_pools':
          return await this.getLiquidityPools(args);

        case 'gluex_get_token_price':
          return await this.getTokenPrice(args);

        case 'gluex_get_token_metrics':
          return await this.getTokenMetrics(args);

        case 'gluex_get_multiple_prices':
          return await this.getMultiplePrices(args);

        case 'gluex_health_check':
          return await this.healthCheck();

        default:
          throw new Error(`Unknown GlueX tool: ${name}`);
      }
    } catch (error) {
      logger.error('GlueX tool call failed', { tool: name, error });

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
  private async getSupportedChains(): Promise<CallToolResult> {
    const chains = await this.adapter.getSupportedChains();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              chains,
              count: chains.length,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getTokens(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      chainId: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    });

    const parsed = schema.parse(args);
    const tokens = await this.adapter.getTokens(
      parsed.chainId,
      parsed.search,
      parsed.limit,
      parsed.offset
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tokens,
              count: tokens.length,
              filters: {
                chainId: parsed.chainId,
                search: parsed.search,
              },
              pagination: {
                limit: parsed.limit,
                offset: parsed.offset,
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

  private async getTokenInfo(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      chainId: z.number(),
      tokenAddress: z.string(),
    });

    const parsed = schema.parse(args);
    const tokenInfo = await this.adapter.getTokenInfo(parsed.chainId, parsed.tokenAddress);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              chainId: parsed.chainId,
              tokenAddress: parsed.tokenAddress,
              tokenInfo,
              found: !!tokenInfo,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getQuote(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      fromChainId: z.number(),
      toChainId: z.number(),
      fromTokenAddress: z.string(),
      toTokenAddress: z.string(),
      amount: z.string(),
      slippage: z.number().min(0).max(50).default(0.5),
      userAddress: z.string().optional(),
    });

    const parsed = schema.parse(args);

    // Validate the route request
    const validation = await this.adapter.validateRouteRequest(parsed);
    if (!validation.valid) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid route request',
                validation_errors: validation.errors,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const quote = await this.adapter.getQuote(parsed as RouteRequest);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              request: parsed,
              quote,
              hasQuote: !!quote,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getBestRoute(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      fromChainId: z.number(),
      toChainId: z.number(),
      fromTokenAddress: z.string(),
      toTokenAddress: z.string(),
      amount: z.string(),
      slippage: z.number().min(0).max(50),
      userAddress: z.string(),
    });

    const parsed = schema.parse(args);
    const quote = await this.adapter.getBestRoute(parsed as RouteRequest);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              request: parsed,
              bestRoute: quote?.bestRoute,
              estimatedTime: quote?.bestRoute?.totalTime,
              totalFee: quote?.bestRoute?.totalFee,
              confidence: quote?.bestRoute?.confidence,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async createTransaction(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      routeId: z.string(),
      userAddress: z.string(),
      slippage: z.number().min(0).max(50),
      deadline: z.number().optional(),
    });

    const parsed = schema.parse(args);
    const transaction = await this.adapter.createTransaction(parsed as TransactionRequest);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              routeId: parsed.routeId,
              transaction,
              hasTransaction: !!transaction,
              estimatedProcessingTime: transaction?.estimatedProcessingTime,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async trackTransaction(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      txHash: z.string(),
      chainId: z.number(),
    });

    const parsed = schema.parse(args);
    const status = await this.adapter.trackBridge(parsed.txHash, parsed.chainId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              txHash: parsed.txHash,
              chainId: parsed.chainId,
              bridgeStatus: status,
              progress: status?.progress,
              estimatedCompletion: status?.estimatedCompletion,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getLiquidityPools(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      chainId: z.number().optional(),
      tokenAddress: z.string().optional(),
    });

    const parsed = schema.parse(args);
    const pools = await this.adapter.getLiquidityPools(parsed.chainId, parsed.tokenAddress);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              pools,
              count: pools.length,
              filters: {
                chainId: parsed.chainId,
                tokenAddress: parsed.tokenAddress,
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

  private async getTokenPrice(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      chainId: z.number(),
      tokenAddress: z.string(),
    });

    const parsed = schema.parse(args);
    const priceData = await this.adapter.getTokenPrice(parsed.chainId, parsed.tokenAddress);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              chainId: parsed.chainId,
              tokenAddress: parsed.tokenAddress,
              priceData,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getTokenMetrics(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      chainId: z.number(),
      tokenAddress: z.string(),
    });

    const parsed = schema.parse(args);
    const metrics = await this.adapter.getTokenMetrics(parsed.chainId, parsed.tokenAddress);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              chainId: parsed.chainId,
              tokenAddress: parsed.tokenAddress,
              metrics,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getMultiplePrices(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      tokens: z
        .array(
          z.object({
            chainId: z.number(),
            tokenAddress: z.string(),
          })
        )
        .min(1)
        .max(50),
    });

    const parsed = schema.parse(args);
    const prices = await this.adapter.getMultipleTokenPrices(parsed.tokens);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              requestedTokens: parsed.tokens.length,
              prices,
              pricesFound: prices.length,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
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
