import { SimpleGlueXAdapter } from '../../src/adapters/gluex/SimpleGlueXAdapter.js';
import type {
  ChainInfo,
  TokenInfo,
  Quote,
  Route,
  RouteRequest,
  TransactionRequest,
  TransactionResponse,
  BridgeStatus,
  LiquidityPool,
  PriceData,
  TokenMetrics,
} from '../../src/adapters/gluex/types.js';

// Mock dependencies
jest.mock('../../src/utils/logger.js', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock BaseAdapter
const mockHealthStatus = {
  healthy: true,
  lastChecked: 0,
  latencyMs: 100,
};

jest.mock('../../src/adapters/BaseAdapter.js', () => ({
  BaseAdapter: class {
    protected metadata: any;
    protected config: any;
    protected startTime = Date.now();
    protected apiClient = {
      get: jest.fn(),
      post: jest.fn(),
    };

    constructor(metadata: any, config: any) {
      this.metadata = metadata;
      this.config = config;
    }

    getHealthStatus() {
      return mockHealthStatus;
    }
  },
}));

describe('SimpleGlueXAdapter', () => {
  let adapter: SimpleGlueXAdapter;
  let mockApiClient: any;

  const defaultConfig = {
    name: 'test-gluex',
    baseUrl: 'https://api.gluex.xyz',
    apiKey: 'test-api-key',
    timeout: 30000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    adapter = new SimpleGlueXAdapter(defaultConfig);
    mockApiClient = (adapter as any).apiClient;
  });

  describe('constructor', () => {
    it('should initialize with configuration', () => {
      expect(adapter).toBeInstanceOf(SimpleGlueXAdapter);
      expect(adapter.getApiKey()).toBe('test-api-key');
    });

    it('should initialize without API key', () => {
      const configWithoutKey = { ...defaultConfig };
      delete (configWithoutKey as any).apiKey;

      const adapterWithoutKey = new SimpleGlueXAdapter(configWithoutKey);
      expect(adapterWithoutKey.getApiKey()).toBeUndefined();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const mockChains: ChainInfo[] = [
        {
          chainId: 1,
          name: 'Ethereum',
          rpcUrl: 'https://mainnet.infura.io',
          blockExplorer: 'https://etherscan.io',
          nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
          supported: true,
        },
      ];

      mockApiClient.get.mockResolvedValue({
        chains: mockChains,
        liquidityModules: {},
      });

      await expect(adapter.initialize()).resolves.not.toThrow();
      expect(mockApiClient.get).toHaveBeenCalledWith('/liquidity', {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });

    it('should handle initialization failure', async () => {
      mockApiClient.get.mockRejectedValue(new Error('API error'));

      await expect(adapter.initialize()).rejects.toThrow('API error');
    });
  });

  describe('validateConnection', () => {
    it('should validate connection successfully', async () => {
      const mockChains: ChainInfo[] = [{ chainId: 1 } as ChainInfo];

      mockApiClient.get.mockResolvedValue({
        chains: mockChains,
        liquidityModules: {},
      });

      const result = await adapter.validateConnection();
      expect(result).toBe(true);
    });

    it('should return false for invalid connection', async () => {
      mockApiClient.get.mockResolvedValue({
        chains: [],
        liquidityModules: {},
      });

      const result = await adapter.validateConnection();
      expect(result).toBe(false);
    });

    it('should return false on connection error', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await adapter.validateConnection();
      expect(result).toBe(false);
    });
  });

  describe('getEndpointInfo', () => {
    it('should return correct endpoint info for /liquidity', () => {
      const info = adapter.getEndpointInfo('/liquidity');
      expect(info).toEqual({
        path: '/liquidity',
        method: 'GET',
      });
    });

    it('should return correct endpoint info for /quote', () => {
      const info = adapter.getEndpointInfo('/quote');
      expect(info.path).toBe('/quote');
      expect(info.method).toBe('POST');
      expect(info.schema).toBeDefined();
    });

    it('should throw for unknown endpoint', () => {
      expect(() => adapter.getEndpointInfo('/unknown')).toThrow('Unknown endpoint: /unknown');
    });
  });

  describe('getSupportedChains', () => {
    it('should get supported chains successfully', async () => {
      const mockChains: ChainInfo[] = [
        {
          chainId: 1,
          name: 'Ethereum',
          rpcUrl: 'https://mainnet.infura.io',
          blockExplorer: 'https://etherscan.io',
          nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
          supported: true,
        },
        {
          chainId: 137,
          name: 'Polygon',
          rpcUrl: 'https://polygon-rpc.com',
          blockExplorer: 'https://polygonscan.com',
          nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
          supported: true,
        },
      ];

      mockApiClient.get.mockResolvedValue({
        chains: mockChains,
        liquidityModules: {},
      });

      const result = await adapter.getSupportedChains();
      expect(result).toEqual(mockChains);
      expect(mockApiClient.get).toHaveBeenCalledWith('/liquidity', {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });

    it('should handle empty chains response', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getSupportedChains();
      expect(result).toEqual([]);
    });
  });

  describe('getTokens', () => {
    it('should get tokens with parameters', async () => {
      const mockTokens: TokenInfo[] = [
        {
          address: '0xA0b86a33E6441c8a6b0e6FE0',
          chainId: 1,
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          tags: ['stablecoin'],
        },
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockTokens,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getTokens(1, 'USDC', 10, 0);
      expect(result).toEqual(mockTokens);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/tokens?chainId=1&search=USDC&limit=10', // offset=0 is falsy, not included
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
          },
        }
      );
    });

    it('should get tokens without parameters', async () => {
      const mockTokens: TokenInfo[] = [];

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockTokens,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getTokens();
      expect(result).toEqual(mockTokens);
      expect(mockApiClient.get).toHaveBeenCalledWith('/tokens', {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });

    it('should handle paginated response', async () => {
      const mockTokens: TokenInfo[] = [
        {
          address: '0xA0b86a33E6441c8a6b0e6FE0',
          chainId: 1,
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          tags: ['stablecoin'],
        },
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: {
          data: mockTokens,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getTokens(1);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('getTokenInfo', () => {
    it('should get specific token info', async () => {
      const mockToken: TokenInfo = {
        address: '0xA0b86a33E6441c8a6b0e6FE0',
        chainId: 1,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        tags: ['stablecoin'],
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockToken,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getTokenInfo(1, '0xA0b86a33E6441c8a6b0e6FE0');
      expect(result).toEqual(mockToken);
      expect(mockApiClient.get).toHaveBeenCalledWith('/tokens/1/0xA0b86a33E6441c8a6b0e6FE0', {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });

    it('should return null for missing token', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getTokenInfo(1, '0xNonExistent');
      expect(result).toBeNull();
    });
  });

  describe('getQuote', () => {
    it('should get quote successfully', async () => {
      const routeRequest: RouteRequest = {
        fromChainId: 1,
        toChainId: 137,
        fromTokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
        toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        amount: '1000000',
        slippage: 0.5,
      };

      const mockRoute: Route = {
        id: 'route-1',
        fromChainId: 1,
        toChainId: 137,
        fromToken: {
          address: '0xA0b86a33E6441c8a6b0e6FE0',
          chainId: 1,
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          tags: ['stablecoin'],
        },
        toToken: {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          chainId: 137,
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          tags: ['stablecoin'],
        },
        fromAmount: '1000000',
        toAmount: '995000',
        minToAmount: '990000',
        steps: [],
        totalGasCost: '0.002',
        totalTime: 300,
        totalPriceImpact: 0.1,
        totalFee: { amount: '5000', percentage: 0.5 },
        confidence: 0.95,
        tags: ['fast'],
      };

      const mockQuote: Quote = {
        routes: [mockRoute],
        requestId: 'req-1',
        timestamp: Date.now(),
        validFor: 30,
        bestRoute: mockRoute,
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: mockQuote,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getQuote(routeRequest);
      expect(result).toEqual(mockQuote);
      expect(mockApiClient.post).toHaveBeenCalledWith('/quote', routeRequest, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });

    it('should return null for failed quote', async () => {
      const routeRequest: RouteRequest = {
        fromChainId: 1,
        toChainId: 137,
        fromTokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
        toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        amount: '1000000',
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getQuote(routeRequest);
      expect(result).toBeNull();
    });
  });

  describe('getBestRoute', () => {
    it('should get best route', async () => {
      const routeRequest: RouteRequest = {
        fromChainId: 1,
        toChainId: 137,
        fromTokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
        toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        amount: '1000000',
      };

      const mockQuote: Quote = {
        routes: [],
        requestId: 'req-1',
        timestamp: Date.now(),
        validFor: 30,
        bestRoute: {} as Route,
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: mockQuote,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getBestRoute(routeRequest);
      expect(result).toEqual(mockQuote);
    });
  });

  describe('createTransaction', () => {
    it('should create transaction successfully', async () => {
      const txRequest: TransactionRequest = {
        routeId: 'route-1',
        userAddress: '0x742d35Cc3b4aED7F4F2d2b5fD0C5db18a16F2d8e',
        slippage: 0.5,
      };

      const mockTxResponse: TransactionResponse = {
        transactionRequest: {
          to: '0xRouter',
          data: '0x1234',
          value: '0',
          gasLimit: '200000',
          gasPrice: '20000000000',
          chainId: 1,
        },
        routeId: 'route-1',
        estimatedProcessingTime: 300,
      };

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: mockTxResponse,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.createTransaction(txRequest);
      expect(result).toEqual(mockTxResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith('/route', txRequest, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status', async () => {
      const mockStatus: BridgeStatus = {
        sourceChain: {
          txHash: '0x123',
          status: {
            txHash: '0x123',
            status: 'confirmed',
            chainId: 1,
            confirmations: 12,
            logs: [],
          },
          amount: '1000000',
          token: {
            address: '0xA0b86a33E6441c8a6b0e6FE0',
            chainId: 1,
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            tags: ['stablecoin'],
          },
        },
        bridgeStatus: 'completed',
        progress: 100,
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockStatus,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getTransactionStatus('0x123', 1);
      expect(result).toEqual(mockStatus);
      expect(mockApiClient.get).toHaveBeenCalledWith('/status?txHash=0x123&chainId=1', {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });
  });

  describe('trackBridge', () => {
    it('should track bridge status', async () => {
      const mockStatus: BridgeStatus = {
        sourceChain: {
          txHash: '0x123',
          status: {
            txHash: '0x123',
            status: 'confirmed',
            chainId: 1,
            confirmations: 12,
            logs: [],
          },
          amount: '1000000',
          token: {} as TokenInfo,
        },
        bridgeStatus: 'processing',
        progress: 50,
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockStatus,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.trackBridge('0x123', 1);
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getLiquidityPools', () => {
    it('should get liquidity pools with parameters', async () => {
      const mockPools: LiquidityPool[] = [
        {
          chainId: 1,
          address: '0xPool1',
          token0: {} as TokenInfo,
          token1: {} as TokenInfo,
          reserve0: '1000000',
          reserve1: '2000000',
          totalSupply: '1414213',
          fee: 0.003,
          protocol: 'Uniswap V2',
        },
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockPools,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getLiquidityPools(1, '0xToken');
      expect(result).toEqual(mockPools);
      expect(mockApiClient.get).toHaveBeenCalledWith('/pools?chainId=1&tokenAddress=0xToken', {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });

    it('should handle paginated pools response', async () => {
      const mockPools: LiquidityPool[] = [
        {
          chainId: 1,
          address: '0xPool1',
          token0: {} as TokenInfo,
          token1: {} as TokenInfo,
          reserve0: '1000000',
          reserve1: '2000000',
          totalSupply: '1414213',
          fee: 0.003,
          protocol: 'Uniswap V2',
        },
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: {
          data: mockPools,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getLiquidityPools();
      expect(result).toEqual(mockPools);
    });
  });

  describe('getPoolInfo', () => {
    it('should get pool info', async () => {
      const mockPool: LiquidityPool = {
        chainId: 1,
        address: '0xPool1',
        token0: {} as TokenInfo,
        token1: {} as TokenInfo,
        reserve0: '1000000',
        reserve1: '2000000',
        totalSupply: '1414213',
        fee: 0.003,
        protocol: 'Uniswap V2',
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockPool,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getPoolInfo(1, '0xPool1');
      expect(result).toEqual(mockPool);
    });
  });

  describe('getTokenPrice', () => {
    it('should get token price', async () => {
      const mockPrice: PriceData = {
        chainId: 1,
        tokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
        price: 1.0,
        priceChange24h: 0.1,
        volume24h: '1000000',
        timestamp: Date.now(),
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockPrice,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getTokenPrice(1, '0xA0b86a33E6441c8a6b0e6FE0');
      expect(result).toEqual(mockPrice);
    });
  });

  describe('getTokenMetrics', () => {
    it('should get token metrics', async () => {
      const mockMetrics: TokenMetrics = {
        chainId: 1,
        tokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
        price: 1.0,
        priceChange1h: 0.05,
        priceChange24h: 0.1,
        priceChange7d: 0.5,
        volume24h: '1000000',
        marketCap: '10000000000',
        totalSupply: '10000000000',
        circulatingSupply: '8000000000',
        holders: 50000,
        transfers24h: 1000,
        liquidity: '500000000',
        fdv: '12000000000',
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockMetrics,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getTokenMetrics(1, '0xA0b86a33E6441c8a6b0e6FE0');
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('getMultipleTokenPrices', () => {
    it('should get multiple token prices', async () => {
      const requests = [
        { chainId: 1, tokenAddress: '0xA0b86a33E6441c8a6b0e6FE0' },
        { chainId: 137, tokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
      ];

      const mockPrices: PriceData[] = [
        {
          chainId: 1,
          tokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
          price: 1.0,
          priceChange24h: 0.1,
          volume24h: '1000000',
          timestamp: Date.now(),
        },
        {
          chainId: 137,
          tokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          price: 1.0,
          priceChange24h: 0.05,
          volume24h: '500000',
          timestamp: Date.now(),
        },
      ];

      mockApiClient.post.mockResolvedValue({
        success: true,
        data: mockPrices,
        requestId: 'test-req-1',
        timestamp: Date.now(),
      });

      const result = await adapter.getMultipleTokenPrices(requests);
      expect(result).toEqual(mockPrices);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/prices/batch',
        { tokens: requests },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
          },
        }
      );
    });
  });

  describe('healthCheck', () => {
    it('should perform health check successfully', async () => {
      const mockChains: ChainInfo[] = [{ chainId: 1 } as ChainInfo];

      mockApiClient.get.mockResolvedValue({
        chains: mockChains,
        liquidityModules: {},
      });

      const result = await adapter.healthCheck(true);
      expect(result.healthy).toBe(true);
      expect(typeof result.latencyMs).toBe('number'); // Timing might be too fast for >0
      expect(result.details).toMatchObject({
        adapter: 'test-gluex',
        base_url: 'https://api.gluex.xyz',
        has_api_key: true,
        uptime: expect.any(Number),
      });
    });

    it('should use cached health status', async () => {
      // Mock successful response
      const mockChains: ChainInfo[] = [{ chainId: 1 } as ChainInfo];
      mockApiClient.get.mockResolvedValue({
        chains: mockChains,
        liquidityModules: {},
      });

      // Set a recent lastChecked time to simulate cache
      mockHealthStatus.lastChecked = Date.now();

      // Call without force should use cache
      const result = await adapter.healthCheck(false);
      expect(result.healthy).toBe(true);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should handle health check failure', async () => {
      mockApiClient.get.mockRejectedValue(new Error('API down'));

      const result = await adapter.healthCheck(true);
      expect(result.healthy).toBe(false);
      expect(result.errors).toEqual(['API down']);
    });
  });

  describe('utility methods', () => {
    describe('estimateBridgeTime', () => {
      it('should estimate bridge time for known chains', async () => {
        const time = await adapter.estimateBridgeTime(1, 137);
        expect(time).toBe(900); // Ethereum to Polygon
      });

      it('should return default time for unknown chains', async () => {
        const time = await adapter.estimateBridgeTime(999, 888);
        expect(time).toBe(1200); // Default 20 minutes
      });
    });

    describe('calculateMinimumReceived', () => {
      it('should calculate minimum received amount', async () => {
        const result = await adapter.calculateMinimumReceived('1000', 2.5);
        expect(result).toBe('975'); // 1000 * (1 - 0.025)
      });
    });

    describe('validateRouteRequest', () => {
      it('should validate valid route request', async () => {
        const request: RouteRequest = {
          fromChainId: 1,
          toChainId: 137,
          fromTokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
          toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          amount: '1000000',
          slippage: 0.5,
        };

        const result = await adapter.validateRouteRequest(request);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should reject same chain and token', async () => {
        const request: RouteRequest = {
          fromChainId: 1,
          toChainId: 1,
          fromTokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
          toTokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
          amount: '1000000',
        };

        const result = await adapter.validateRouteRequest(request);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Source and destination cannot be the same');
      });

      it('should reject negative amount', async () => {
        const request: RouteRequest = {
          fromChainId: 1,
          toChainId: 137,
          fromTokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
          toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          amount: '-1000',
        };

        const result = await adapter.validateRouteRequest(request);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Amount must be positive');
      });

      it('should reject invalid slippage', async () => {
        const request: RouteRequest = {
          fromChainId: 1,
          toChainId: 137,
          fromTokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
          toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          amount: '1000000',
          slippage: 60,
        };

        const result = await adapter.validateRouteRequest(request);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Slippage must be between 0 and 50 percent');
      });
    });
  });

  describe('error handling', () => {
    it('should handle request errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network timeout'));

      await expect(adapter.getSupportedChains()).rejects.toThrow('Network timeout');
    });

    it('should handle malformed responses', async () => {
      mockApiClient.get.mockResolvedValue({
        success: false,
        requestId: 'test-req-1',
        timestamp: Date.now(),
        // No data field
      });

      const result = await adapter.getSupportedChains();
      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Rate limit exceeded'));

      const routeRequest: RouteRequest = {
        fromChainId: 1,
        toChainId: 137,
        fromTokenAddress: '0xA0b86a33E6441c8a6b0e6FE0',
        toTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        amount: '1000000',
      };

      await expect(adapter.getQuote(routeRequest)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('makeRequest helper', () => {
    it('should make GET request with API key headers', async () => {
      mockApiClient.get.mockResolvedValue({ data: 'test' });

      // Access private method using type assertion
      await (adapter as any).makeRequest('/test-endpoint');

      expect(mockApiClient.get).toHaveBeenCalledWith('/test-endpoint', {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });

    it('should make POST request with data', async () => {
      const testData = { key: 'value' };
      mockApiClient.post.mockResolvedValue({ data: 'test' });

      await (adapter as any).makeRequest('/test-endpoint', testData, 'POST');

      expect(mockApiClient.post).toHaveBeenCalledWith('/test-endpoint', testData, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
      });
    });

    it('should make request without API key when not provided', async () => {
      const adapterWithoutKey = new SimpleGlueXAdapter({
        name: 'test-gluex-no-key',
        baseUrl: 'https://api.gluex.xyz',
      });

      const mockApiClientNoKey = (adapterWithoutKey as any).apiClient;
      mockApiClientNoKey.get.mockResolvedValue({ data: 'test' });

      await (adapterWithoutKey as any).makeRequest('/test-endpoint');

      expect(mockApiClientNoKey.get).toHaveBeenCalledWith('/test-endpoint', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });
});
