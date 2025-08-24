import { SimpleHyperLiquidAdapter } from '../../src/adapters/hyperliquid/SimpleHyperLiquidAdapter.js';
import { HyperLiquidWebSocket } from '../../src/websocket/HyperLiquidWebSocket.js';
import { createHyperLiquidSigner, validateAction } from '../../src/utils/crypto.js';
import { ApiClient } from '../../src/utils/ApiClient.js';

// Mock dependencies
jest.mock('../../src/websocket/HyperLiquidWebSocket.js');
jest.mock('../../src/utils/crypto.js');
jest.mock('../../src/utils/ApiClient.js');
jest.mock('../../src/utils/logger.js', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  logPerformance: jest.fn(),
  logHealthCheck: jest.fn(),
  logConnection: jest.fn(),
}));

describe('SimpleHyperLiquidAdapter', () => {
  let adapter: SimpleHyperLiquidAdapter;
  let mockWebSocket: jest.Mocked<HyperLiquidWebSocket>;
  let mockSigner: any;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockValidateAction: jest.MockedFunction<typeof validateAction>;

  const defaultConfig = {
    name: 'test-hyperliquid',
    baseUrl: 'https://api.hyperliquid.xyz',
    wsUrl: 'wss://api.hyperliquid.xyz/ws',
    testnet: false,
  };

  const configWithAuth = {
    ...defaultConfig,
    privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
    address: '0x742d35Cc3b4aED7F4F2d2b5fD0C5db18a16F2d8e',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WebSocket
    mockWebSocket = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue({
        connected: false,
        reconnecting: false,
        reconnectAttempts: 0,
        subscriptionCount: 0,
        activeSubscriptions: [],
      }),
    } as any;
    (HyperLiquidWebSocket as jest.MockedClass<typeof HyperLiquidWebSocket>).mockImplementation(
      () => mockWebSocket
    );

    // Mock validateAction
    mockValidateAction = validateAction as jest.MockedFunction<typeof validateAction>;
    mockValidateAction.mockReturnValue({ valid: true, errors: [] });

    // Mock signer
    mockSigner = {
      getAddress: jest.fn().mockReturnValue('0x742d35Cc3b4aED7F4F2d2b5fD0C5db18a16F2d8e'),
      signAction: jest.fn().mockResolvedValue('mock-signature'),
      createMarketOrderAction: jest.fn().mockReturnValue({
        type: 'order',
        orders: [{ a: 0, b: true, p: '0', s: '0.1', r: false, t: { market: {} } }],
        grouping: 'na',
      }),
      createLimitOrderAction: jest.fn().mockReturnValue({
        type: 'order',
        orders: [{ a: 0, b: true, p: '51000', s: '0.1', r: false, t: { limit: { tif: 'Gtc' } } }],
        grouping: 'na',
      }),
      createCancelOrderAction: jest.fn().mockReturnValue({
        type: 'cancel',
        cancels: [{ a: 0, o: 123456 }],
      }),
    };
    (createHyperLiquidSigner as jest.Mock).mockReturnValue(mockSigner);

    // Mock ApiClient
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      cleanup: jest.fn(),
      getStatistics: jest.fn().mockReturnValue({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: 0,
        rateLimitHits: 0,
        circuitBreakerTrips: 0,
      }),
    } as any;
    (ApiClient as jest.MockedClass<typeof ApiClient>).mockImplementation(() => mockApiClient);
  });

  describe('constructor', () => {
    it('should initialize with basic configuration', () => {
      adapter = new SimpleHyperLiquidAdapter(defaultConfig);

      expect(adapter).toBeInstanceOf(SimpleHyperLiquidAdapter);
      expect(HyperLiquidWebSocket).toHaveBeenCalledWith(defaultConfig.wsUrl, {
        reconnectDelay: 5000,
        maxReconnectAttempts: 10,
      });
    });

    it('should initialize with authentication configuration', () => {
      adapter = new SimpleHyperLiquidAdapter(configWithAuth);

      expect(createHyperLiquidSigner).toHaveBeenCalledWith(configWithAuth.privateKey);
      expect(mockSigner.getAddress).toHaveBeenCalled();
    });

    it('should initialize with testnet configuration', () => {
      const testnetConfig = { ...defaultConfig, testnet: true };
      adapter = new SimpleHyperLiquidAdapter(testnetConfig);

      expect(adapter).toBeInstanceOf(SimpleHyperLiquidAdapter);
    });
  });

  describe('initialization and connection', () => {
    beforeEach(() => {
      adapter = new SimpleHyperLiquidAdapter(defaultConfig);
    });

    it('should initialize successfully', async () => {
      await expect(adapter.initialize()).resolves.not.toThrow();
    });

    it('should connect WebSocket successfully', async () => {
      await adapter.connectWebSocket();

      expect(mockWebSocket.connect).toHaveBeenCalled();
    });

    it('should disconnect WebSocket successfully', async () => {
      await adapter.disconnectWebSocket();

      expect(mockWebSocket.disconnect).toHaveBeenCalled();
    });

    it('should validate connection', async () => {
      mockApiClient.post.mockResolvedValue({ status: 'ok' });

      const isValid = await adapter.validateConnection();

      expect(isValid).toBe(true);
    });

    it('should handle connection validation failure', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Connection failed'));

      const isValid = await adapter.validateConnection();

      expect(isValid).toBe(false);
    });
  });

  describe('market data methods', () => {
    beforeEach(() => {
      adapter = new SimpleHyperLiquidAdapter(defaultConfig);
    });

    describe('getAllMids', () => {
      it('should fetch all mid prices successfully', async () => {
        const mockPrices = { BTC: '52000', ETH: '3200' };
        mockApiClient.post.mockResolvedValue(mockPrices);

        const result = await adapter.getAllMids();

        expect(result).toEqual(mockPrices);
      });
    });

    describe('getAssets', () => {
      it('should fetch assets successfully', async () => {
        const mockAssets = [
          { name: 'BTC', szDecimals: 5 },
          { name: 'ETH', szDecimals: 5 },
        ];
        mockApiClient.post.mockResolvedValue({ universe: mockAssets });

        const result = await adapter.getAssets();

        expect(result).toEqual(mockAssets);
      });
    });

    describe('getOrderBook', () => {
      it('should fetch order book successfully', async () => {
        const mockOrderBook = {
          coin: 'BTC',
          levels: [[{ px: '52000', sz: '1.0' }], [{ px: '51999', sz: '0.5' }]],
        };
        mockApiClient.post.mockResolvedValue(mockOrderBook);

        const result = await adapter.getOrderBook('BTC');

        expect(result).toEqual(mockOrderBook);
      });
    });

    describe('getTrades', () => {
      it('should fetch trades successfully', async () => {
        const mockTrades = [
          { coin: 'BTC', side: 'B', px: '52000', sz: '0.1', time: 1640995200000 },
        ];
        mockApiClient.post.mockResolvedValue(mockTrades);

        const result = await adapter.getTrades('BTC');

        expect(result).toEqual(mockTrades);
      });
    });

    describe('getCandles', () => {
      it('should fetch candles successfully', async () => {
        const mockCandles = [
          { t: 1640995200000, o: '52000', h: '52100', l: '51900', c: '52050', v: '100' },
        ];
        mockApiClient.post.mockResolvedValue(mockCandles);

        const result = await adapter.getCandles('BTC', '1h', 1640995200000, 1640998800000);

        expect(result).toEqual(mockCandles);
      });

      it('should fetch candles without time range', async () => {
        const mockCandles = [
          { t: 1640995200000, o: '52000', h: '52100', l: '51900', c: '52050', v: '100' },
        ];
        mockApiClient.post.mockResolvedValue(mockCandles);

        const result = await adapter.getCandles('BTC', '1h');

        expect(result).toEqual(mockCandles);
      });
    });
  });

  describe('account methods', () => {
    beforeEach(() => {
      adapter = new SimpleHyperLiquidAdapter(configWithAuth);
    });

    describe('getAccountState', () => {
      it('should fetch account state with default address', async () => {
        const mockAccountState = {
          marginSummary: { accountValue: '10000' },
          assetPositions: [{ position: { coin: 'BTC', szi: '1.0' } }],
        };
        mockApiClient.post.mockResolvedValue(mockAccountState);

        const result = await adapter.getAccountState();

        expect(result).toEqual(mockAccountState);
      });

      it('should fetch account state with specified address', async () => {
        const customAddress = '0x1234567890123456789012345678901234567890';
        const mockAccountState = { marginSummary: { accountValue: '5000' } };
        mockApiClient.post.mockResolvedValue(mockAccountState);

        const result = await adapter.getAccountState(customAddress);

        expect(result).toEqual(mockAccountState);
      });
    });

    describe('getOpenOrders', () => {
      it('should fetch open orders successfully', async () => {
        const mockOrders = [{ coin: 'BTC', oid: 123456, side: 'B', sz: '0.1', limitPx: '51000' }];
        mockApiClient.post.mockResolvedValue(mockOrders);

        const result = await adapter.getOpenOrders();

        expect(result).toEqual(mockOrders);
      });
    });

    describe('getUserFills', () => {
      it('should fetch user fills successfully', async () => {
        const mockFills = [
          { coin: 'BTC', px: '52000', sz: '0.05', side: 'B', time: 1640995200000 },
        ];
        mockApiClient.post.mockResolvedValue(mockFills);

        const result = await adapter.getUserFills();

        expect(result).toEqual(mockFills);
      });
    });
  });

  describe('trading methods', () => {
    beforeEach(() => {
      adapter = new SimpleHyperLiquidAdapter(configWithAuth);
    });

    describe('placeOrder', () => {
      it('should place order successfully', async () => {
        const mockResponse = {
          status: 'ok',
          response: { type: 'order', data: { statuses: ['success'] } },
        };
        mockApiClient.post.mockResolvedValue(mockResponse);

        const orderAction = {
          type: 'order' as const,
          orders: [
            {
              a: 0,
              b: true,
              p: '51000',
              s: '0.1',
              r: false,
              t: { limit: { tif: 'Gtc' as const } },
            },
          ],
          grouping: 'na' as const,
        };

        const result = await adapter.placeOrder(orderAction);

        expect(result).toEqual(mockResponse);
        expect(mockValidateAction).toHaveBeenCalledWith(orderAction);
        expect(mockSigner.signAction).toHaveBeenCalled();
      });

      it('should throw error when no signer available', async () => {
        adapter = new SimpleHyperLiquidAdapter(defaultConfig);

        const orderAction = {
          type: 'order' as const,
          orders: [
            {
              a: 0,
              b: true,
              p: '51000',
              s: '0.1',
              r: false,
              t: { limit: { tif: 'Gtc' as const } },
            },
          ],
          grouping: 'na' as const,
        };

        await expect(adapter.placeOrder(orderAction)).rejects.toThrow(
          'Trading requires a private key and signer'
        );
      });

      it('should handle invalid order action', async () => {
        mockValidateAction.mockReturnValue({ valid: false, errors: ['Invalid order'] });

        const orderAction = {
          type: 'order' as const,
          orders: [
            {
              a: 0,
              b: true,
              p: '51000',
              s: '0.1',
              r: false,
              t: { limit: { tif: 'Gtc' as const } },
            },
          ],
          grouping: 'na' as const,
        };

        await expect(adapter.placeOrder(orderAction)).rejects.toThrow(
          'Invalid order action: Invalid order'
        );
      });
    });

    describe('cancelOrder', () => {
      it('should cancel order successfully', async () => {
        const mockResponse = {
          status: 'ok',
          response: { type: 'cancel', data: { statuses: ['success'] } },
        };
        mockApiClient.post.mockResolvedValue(mockResponse);

        const result = await adapter.cancelOrder(0, 123456);

        expect(result).toEqual(mockResponse);
        expect(mockSigner.signAction).toHaveBeenCalled();
      });
    });

    describe('placeMarketOrder', () => {
      it('should place market order successfully', async () => {
        const mockResponse = {
          status: 'ok',
          response: { type: 'order', data: { statuses: ['success'] } },
        };
        mockApiClient.post.mockResolvedValue(mockResponse);

        const result = await adapter.placeMarketOrder(0, true, '0.1', false);

        expect(result).toEqual(mockResponse);
        expect(mockSigner.createMarketOrderAction).toHaveBeenCalledWith(0, true, '0.1', false);
      });
    });

    describe('placeLimitOrder', () => {
      it('should place limit order successfully', async () => {
        const mockResponse = {
          status: 'ok',
          response: { type: 'order', data: { statuses: ['success'] } },
        };
        mockApiClient.post.mockResolvedValue(mockResponse);

        const result = await adapter.placeLimitOrder(0, true, '51000', '0.1', 'Gtc', false);

        expect(result).toEqual(mockResponse);
        expect(mockSigner.createLimitOrderAction).toHaveBeenCalledWith(
          0,
          true,
          '51000',
          '0.1',
          'Gtc',
          false
        );
      });

      it('should handle default time in force', async () => {
        const mockResponse = {
          status: 'ok',
          response: { type: 'order', data: { statuses: ['success'] } },
        };
        mockApiClient.post.mockResolvedValue(mockResponse);

        const result = await adapter.placeLimitOrder(0, true, '51000', '0.1');

        expect(result).toEqual(mockResponse);
        expect(mockSigner.createLimitOrderAction).toHaveBeenCalledWith(
          0,
          true,
          '51000',
          '0.1',
          'Gtc',
          false
        );
      });
    });
  });

  describe('health check', () => {
    beforeEach(() => {
      adapter = new SimpleHyperLiquidAdapter(defaultConfig);
    });

    it('should perform health check successfully', async () => {
      mockApiClient.post.mockResolvedValue({ status: 'ok' });
      const startTime = Date.now();

      const result = await adapter.healthCheck(true);

      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.lastChecked).toBeGreaterThanOrEqual(startTime);
      expect(result.details).toMatchObject({
        adapter: 'test-hyperliquid',
        base_url: 'https://api.hyperliquid.xyz',
        has_auth: false,
        testnet: false,
      });
    });

    it('should handle health check failure', async () => {
      const error = new Error('Service unavailable');
      mockApiClient.post.mockRejectedValue(error);
      const startTime = Date.now();

      const result = await adapter.healthCheck(true);

      expect(result.healthy).toBe(false);
      expect(result.lastChecked).toBeGreaterThanOrEqual(startTime);
      expect(result.errors).toContain('Service unavailable');
    });
  });

  describe('WebSocket methods', () => {
    beforeEach(() => {
      adapter = new SimpleHyperLiquidAdapter(defaultConfig);
    });

    it('should return WebSocket status', () => {
      const mockStatus = {
        connected: true,
        reconnecting: false,
        reconnectAttempts: 0,
        subscriptionCount: 1,
        activeSubscriptions: ['allMids'],
      };
      mockWebSocket.getStatus.mockReturnValue(mockStatus);

      const status = adapter.getWebSocketStatus();

      expect(status).toEqual(mockStatus);
      expect(mockWebSocket.getStatus).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      adapter = new SimpleHyperLiquidAdapter(defaultConfig);
    });

    it('should disconnect properly', async () => {
      await adapter.disconnect();

      expect(mockWebSocket.disconnect).toHaveBeenCalled();
      expect(mockApiClient.cleanup).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      adapter = new SimpleHyperLiquidAdapter(defaultConfig);
    });

    it('should handle API errors gracefully', async () => {
      mockApiClient.post.mockRejectedValue(new Error('API Error'));

      await expect(adapter.getAllMids()).rejects.toThrow('API Error');
    });

    it('should handle WebSocket connection errors', async () => {
      mockWebSocket.connect.mockRejectedValue(new Error('WebSocket connection failed'));

      await expect(adapter.connectWebSocket()).rejects.toThrow('WebSocket connection failed');
    });

    it('should handle missing authentication for trading methods', async () => {
      adapter = new SimpleHyperLiquidAdapter(defaultConfig);

      await expect(adapter.placeMarketOrder(0, true, '0.1')).rejects.toThrow(
        'Trading requires a private key and signer'
      );
    });
  });
});
