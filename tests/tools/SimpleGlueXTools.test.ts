import { SimpleGlueXTools } from '../../src/tools/SimpleGlueXTools.js';
import { SimpleGlueXAdapter } from '../../src/adapters/gluex/SimpleGlueXAdapter.js';

jest.mock('../../src/utils/logger.js', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('SimpleGlueXTools', () => {
  let tools: SimpleGlueXTools;
  let mockAdapter: jest.Mocked<SimpleGlueXAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdapter = {
      getSupportedChains: jest.fn(),
      getTokens: jest.fn(),
      getTokenInfo: jest.fn(),
      getQuote: jest.fn(),
      validateRouteRequest: jest.fn(),
      getBestRoute: jest.fn(),
      createTransaction: jest.fn(),
      getTransactionStatus: jest.fn(),
      trackBridge: jest.fn(),
      getLiquidityPools: jest.fn(),
      getTokenPrice: jest.fn(),
      getTokenMetrics: jest.fn(),
      getMultipleTokenPrices: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    tools = new SimpleGlueXTools(mockAdapter);
  });

  describe('getToolDefinitions', () => {
    it('should return all tool definitions', () => {
      const definitions = tools.getToolDefinitions();

      expect(definitions).toHaveLength(12);
      expect(definitions.map((d) => d.name)).toEqual([
        'gluex_get_supported_chains',
        'gluex_get_tokens',
        'gluex_get_token_info',
        'gluex_get_quote',
        'gluex_get_best_route',
        'gluex_create_transaction',
        'gluex_track_transaction',
        'gluex_get_liquidity_pools',
        'gluex_get_token_price',
        'gluex_get_token_metrics',
        'gluex_get_multiple_prices',
        'gluex_health_check',
      ]);
    });

    it('should have correct schema for gluex_get_tokens', () => {
      const definitions = tools.getToolDefinitions();
      const tokensTool = definitions.find((d) => d.name === 'gluex_get_tokens')!;

      expect(tokensTool.description).toBe(
        'Get supported tokens, optionally filtered by chain or search term'
      );
      expect(tokensTool.inputSchema.properties.chainId).toBeDefined();
      expect(tokensTool.inputSchema.properties.search).toBeDefined();
      expect(tokensTool.inputSchema.properties.limit).toBeDefined();
    });

    it('should have correct schema for gluex_get_quote', () => {
      const definitions = tools.getToolDefinitions();
      const quoteTool = definitions.find((d) => d.name === 'gluex_get_quote')!;

      expect(quoteTool.description).toBe('Get routing quote for cross-chain token swap');
      expect(quoteTool.inputSchema.properties.fromTokenAddress).toBeDefined();
      expect(quoteTool.inputSchema.properties.toTokenAddress).toBeDefined();
      expect(quoteTool.inputSchema.properties.amount).toBeDefined();
      expect(quoteTool.inputSchema.properties.fromChainId).toBeDefined();
    });
  });

  describe('handleToolCall', () => {
    describe('gluex_get_supported_chains', () => {
      const mockChains = [
        {
          chainId: 1,
          name: 'Ethereum',
          rpcUrl: 'https://mainnet.infura.io',
          blockExplorer: 'https://etherscan.io',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          supported: true,
        },
        {
          chainId: 137,
          name: 'Polygon',
          rpcUrl: 'https://polygon-rpc.com',
          blockExplorer: 'https://polygonscan.com',
          nativeCurrency: { name: 'Matic', symbol: 'MATIC', decimals: 18 },
          supported: true,
        },
      ];

      beforeEach(() => {
        mockAdapter.getSupportedChains.mockResolvedValue(mockChains);
      });

      it('should get supported chains successfully', async () => {
        const result = await tools.handleToolCall('gluex_get_supported_chains', {});

        expect(mockAdapter.getSupportedChains).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.chains).toHaveLength(2);
        expect(content.count).toBe(2);
        expect(content.chains[0].name).toBe('Ethereum');
        expect(content.chains[1].name).toBe('Polygon');
      });

      it('should handle errors in getting chains', async () => {
        const error = new Error('Chain API failed');
        mockAdapter.getSupportedChains.mockRejectedValue(error);

        const result = await tools.handleToolCall('gluex_get_supported_chains', {});

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Chain API failed');
      });
    });

    describe('gluex_get_tokens', () => {
      const mockTokens = [
        {
          address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          name: 'Uniswap',
          symbol: 'UNI',
          decimals: 18,
          chainId: 1,
          logoURI: 'https://tokens.1inch.io/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984.png',
          tags: ['defi', 'dex'],
        },
        {
          address: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          chainId: 1,
          logoURI: 'https://tokens.1inch.io/0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2.png',
          tags: ['stablecoin'],
        },
      ];

      beforeEach(() => {
        mockAdapter.getTokens.mockResolvedValue(mockTokens);
      });

      it('should get tokens successfully', async () => {
        const result = await tools.handleToolCall('gluex_get_tokens', {
          chainId: 1,
          limit: 10,
        });

        expect(mockAdapter.getTokens).toHaveBeenCalledWith(1, undefined, 10, 0);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.tokens).toHaveLength(2);
        expect(content.count).toBe(2);
        expect(content.tokens[0].symbol).toBe('UNI');
        expect(content.tokens[1].symbol).toBe('USDC');
      });

      it('should handle search parameter', async () => {
        const result = await tools.handleToolCall('gluex_get_tokens', {
          search: 'USD',
          limit: 5,
        });

        expect(mockAdapter.getTokens).toHaveBeenCalledWith(
          undefined, // chainId
          'USD', // search
          5, // limit
          0 // offset (default)
        );
        expect(result.isError).toBeUndefined();
      });

      it('should validate input schema', async () => {
        const result = await tools.handleToolCall('gluex_get_tokens', {
          limit: 150, // exceeds maximum
        });

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });
    });

    describe('gluex_get_token_info', () => {
      const mockTokenInfo = {
        address: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        chainId: 1,
        logoURI: 'https://tokens.1inch.io/0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2.png',
        tags: ['stablecoin'],
      };

      beforeEach(() => {
        mockAdapter.getTokenInfo.mockResolvedValue(mockTokenInfo);
      });

      it('should get token info successfully', async () => {
        const result = await tools.handleToolCall('gluex_get_token_info', {
          tokenAddress: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
          chainId: 1,
        });

        expect(mockAdapter.getTokenInfo).toHaveBeenCalledWith(
          1, // chainId first
          '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2' // tokenAddress second
        );
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.chainId).toBe(1);
        expect(content.tokenAddress).toBe('0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2');
        expect(content.tokenInfo.symbol).toBe('USDC');
        expect(content.tokenInfo.tags).toContain('stablecoin');
        expect(content.found).toBe(true);
      });

      it('should handle missing required parameters', async () => {
        const result = await tools.handleToolCall('gluex_get_token_info', {
          chainId: 1, // missing tokenAddress
        });

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });
    });

    describe('gluex_get_quote', () => {
      const mockQuote = {
        routes: [
          {
            id: 'route_1',
            fromChainId: 1,
            toChainId: 1,
            fromToken: {
              address: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
              symbol: 'USDC',
              decimals: 6,
              chainId: 1,
              name: 'USD Coin',
              tags: ['stablecoin'],
            },
            toToken: {
              address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
              symbol: 'UNI',
              decimals: 18,
              chainId: 1,
              name: 'Uniswap',
              tags: ['defi'],
            },
            fromAmount: '1000000',
            toAmount: '142857142857142857',
            minToAmount: '141571428571428571',
            steps: [],
            totalGasCost: '150000',
            totalTime: 30,
            totalPriceImpact: 0.01,
            totalFee: { amount: '3000', percentage: 0.3 },
            confidence: 0.95,
            tags: ['fast'],
          },
        ],
        requestId: 'req_123',
        timestamp: Date.now(),
        validFor: 300,
        bestRoute: {
          id: 'route_1',
          fromChainId: 1,
          toChainId: 1,
          fromToken: {
            address: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
            symbol: 'USDC',
            decimals: 6,
            chainId: 1,
            name: 'USD Coin',
            tags: ['stablecoin'],
          },
          toToken: {
            address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
            symbol: 'UNI',
            decimals: 18,
            chainId: 1,
            name: 'Uniswap',
            tags: ['defi'],
          },
          fromAmount: '1000000',
          toAmount: '142857142857142857',
          minToAmount: '141571428571428571',
          steps: [],
          totalGasCost: '150000',
          totalTime: 30,
          totalPriceImpact: 0.01,
          totalFee: { amount: '3000', percentage: 0.3 },
          confidence: 0.95,
          tags: ['fast'],
        },
      };

      beforeEach(() => {
        mockAdapter.validateRouteRequest.mockResolvedValue({ valid: true, errors: [] });
        mockAdapter.getQuote.mockResolvedValue(mockQuote);
      });

      it('should get quote successfully', async () => {
        const result = await tools.handleToolCall('gluex_get_quote', {
          fromTokenAddress: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
          toTokenAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          amount: '1000000',
          fromChainId: 1,
          toChainId: 1,
        });

        expect(mockAdapter.getQuote).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.hasQuote).toBe(true);
        expect(content.quote.bestRoute.fromToken.symbol).toBe('USDC');
        expect(content.quote.bestRoute.toToken.symbol).toBe('UNI');
        expect(content.quote.routes).toHaveLength(1);
        expect(content.request.fromChainId).toBe(1);
        expect(content.request.toChainId).toBe(1);
      });

      it('should include optional parameters', async () => {
        const result = await tools.handleToolCall('gluex_get_quote', {
          fromTokenAddress: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
          toTokenAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          amount: '1000000',
          fromChainId: 1,
          toChainId: 137,
          slippage: 0.5,
          userAddress: '0x742d35Cc3b4aED7F4F2d2b5fD0C5db18a16F2d8e',
        });

        expect(mockAdapter.getQuote).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();
      });
    });

    describe('gluex_get_best_route', () => {
      const mockRoute = {
        routes: [
          {
            id: 'route_1',
            fromChainId: 1,
            toChainId: 1,
            fromToken: {
              address: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
              symbol: 'USDC',
              decimals: 6,
              chainId: 1,
              name: 'USD Coin',
              tags: ['stablecoin'],
            },
            toToken: {
              address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
              symbol: 'UNI',
              decimals: 18,
              chainId: 1,
              name: 'Uniswap',
              tags: ['defi'],
            },
            fromAmount: '1000000',
            toAmount: '142857142857142857',
            minToAmount: '141571428571428571',
            steps: [],
            totalGasCost: '150000',
            totalTime: 30,
            totalPriceImpact: 0.01,
            totalFee: { amount: '3000', percentage: 0.3 },
            confidence: 0.95,
            tags: ['fast'],
          },
        ],
        requestId: 'req_123',
        timestamp: Date.now(),
        validFor: 300,
        bestRoute: {
          id: 'route_1',
          fromChainId: 1,
          toChainId: 1,
          fromToken: {
            address: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
            symbol: 'USDC',
            decimals: 6,
            chainId: 1,
            name: 'USD Coin',
            tags: ['stablecoin'],
          },
          toToken: {
            address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
            symbol: 'UNI',
            decimals: 18,
            chainId: 1,
            name: 'Uniswap',
            tags: ['defi'],
          },
          fromAmount: '1000000',
          toAmount: '142857142857142857',
          minToAmount: '141571428571428571',
          steps: [],
          totalGasCost: '150000',
          totalTime: 30,
          totalPriceImpact: 0.01,
          totalFee: { amount: '3000', percentage: 0.3 },
          confidence: 0.95,
          tags: ['fast'],
        },
      };

      beforeEach(() => {
        mockAdapter.getBestRoute.mockResolvedValue(mockRoute);
      });

      it('should get best route successfully', async () => {
        const result = await tools.handleToolCall('gluex_get_best_route', {
          fromTokenAddress: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
          toTokenAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          amount: '1000000',
          fromChainId: 1,
          toChainId: 1,
          slippage: 0.5,
          userAddress: '0x742d35Cc3b4aED7F4F2d2b5fD0C5db18a16F2d8e',
        });

        expect(mockAdapter.getBestRoute).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.bestRoute).toBeDefined();
        expect(content.bestRoute.fromToken.symbol).toBe('USDC');
        expect(content.bestRoute.toToken.symbol).toBe('UNI');
        expect(content.estimatedTime).toBe(30);
        expect(content.request.fromChainId).toBe(1);
        expect(content.request.toChainId).toBe(1);
      });
    });

    describe('gluex_create_transaction', () => {
      const mockTransaction = {
        transactionRequest: {
          to: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          data: '0xa9059cbb0000...',
          value: '0',
          gasLimit: '150000',
          gasPrice: '20000000000',
          chainId: 1,
        },
        routeId: 'route_123',
        estimatedProcessingTime: 30,
      };

      beforeEach(() => {
        mockAdapter.createTransaction.mockResolvedValue(mockTransaction);
      });

      it('should create transaction successfully', async () => {
        const result = await tools.handleToolCall('gluex_create_transaction', {
          routeId: 'route_123',
          userAddress: '0x742d35Cc3b4aED7F4F2d2b5fD0C5db18a16F2d8e',
          slippage: 0.5,
        });

        expect(mockAdapter.createTransaction).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.routeId).toBe('route_123');
        expect(content.hasTransaction).toBe(true);
        expect(content.estimatedProcessingTime).toBe(30);
        expect(content.transaction.routeId).toBe('route_123');
      });
    });

    describe('gluex_track_transaction', () => {
      const mockStatus = {
        sourceChain: {
          txHash: '0x123456789abcdef...',
          status: {
            txHash: '0x123456789abcdef...',
            status: 'confirmed' as const,
            chainId: 1,
            confirmations: 12,
            logs: [],
          },
          amount: '1000000',
          token: {
            address: '0xa0b86991c431e47f0d7a3dc0f27f49c5ff6b5b8e2',
            chainId: 1,
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            tags: ['stablecoin'],
          },
        },
        bridgeStatus: 'completed' as const,
        progress: 100,
      };

      beforeEach(() => {
        mockAdapter.trackBridge.mockResolvedValue(mockStatus);
      });

      it('should track transaction successfully', async () => {
        const result = await tools.handleToolCall('gluex_track_transaction', {
          txHash: '0x123456789abcdef...',
          chainId: 1,
        });

        expect(mockAdapter.trackBridge).toHaveBeenCalledWith('0x123456789abcdef...', 1);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.txHash).toBe('0x123456789abcdef...');
        expect(content.chainId).toBe(1);
        expect(content.bridgeStatus).toBeDefined();
        expect(content.bridgeStatus.bridgeStatus).toBe('completed');
        expect(content.bridgeStatus.progress).toBe(100);
        expect(content.progress).toBe(100);
      });
    });

    describe('gluex_get_token_price', () => {
      const mockPrice = {
        tokenAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        chainId: 1,
        price: 7.42,
        priceChange24h: 0.12,
        volume24h: '45623789.45',
        timestamp: Date.now(),
      };

      beforeEach(() => {
        mockAdapter.getTokenPrice.mockResolvedValue(mockPrice);
      });

      it('should get token price successfully', async () => {
        const result = await tools.handleToolCall('gluex_get_token_price', {
          tokenAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
          chainId: 1,
        });

        expect(mockAdapter.getTokenPrice).toHaveBeenCalledWith(
          1, // chainId first
          '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984' // tokenAddress second
        );
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.chainId).toBe(1);
        expect(content.tokenAddress).toBe('0x1f9840a85d5af5bf1d1762f925bdaddc4201f984');
        expect(content.priceData.price).toBe(7.42);
        expect(content.priceData.priceChange24h).toBe(0.12);
      });
    });

    describe('gluex_health_check', () => {
      const mockHealth = {
        healthy: true,
        latencyMs: 120,
        lastChecked: Date.now(),
        errors: [],
        details: {
          version: '1.0.0',
          uptime: 86400,
          chainStatuses: [
            { chainId: 1, status: 'healthy', latency: 120 },
            { chainId: 137, status: 'healthy', latency: 95 },
          ],
        },
      };

      beforeEach(() => {
        mockAdapter.healthCheck.mockResolvedValue(mockHealth);
      });

      it('should perform health check successfully', async () => {
        const result = await tools.handleToolCall('gluex_health_check', {});

        expect(mockAdapter.healthCheck).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.healthy).toBe(true);
        expect(content.latencyMs).toBe(120);
        expect(content.details.chainStatuses).toHaveLength(2);
        expect(content.errors).toEqual([]);
      });
    });
  });

  describe('error handling', () => {
    it('should handle unknown tool names', async () => {
      const result = await tools.handleToolCall('unknown_tool', {});

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Unknown GlueX tool');
    });

    it('should handle adapter errors gracefully', async () => {
      const error = new Error('Network connection failed');
      mockAdapter.getSupportedChains.mockRejectedValue(error);

      const result = await tools.handleToolCall('gluex_get_supported_chains', {});

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Error:');
    });

    it('should handle invalid arguments gracefully', async () => {
      const result = await tools.handleToolCall('gluex_get_tokens', null);

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Error:');
    });
  });
});
