import { SimpleHyperLiquidTools } from '../../src/tools/SimpleHyperLiquidTools.js';
import { SimpleHyperLiquidAdapter } from '../../src/adapters/hyperliquid/SimpleHyperLiquidAdapter.js';

jest.mock('../../src/utils/logger.js', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('SimpleHyperLiquidTools', () => {
  let tools: SimpleHyperLiquidTools;
  let mockAdapter: jest.Mocked<SimpleHyperLiquidAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdapter = {
      getAllMids: jest.fn(),
      getAssets: jest.fn(),
      getOrderBook: jest.fn(),
      getTrades: jest.fn(),
      getCandles: jest.fn(),
      getAccountState: jest.fn(),
      healthCheck: jest.fn(),
      placeOrder: jest.fn(),
      placeMarketOrder: jest.fn(),
      placeLimitOrder: jest.fn(),
      cancelOrder: jest.fn(),
      getOpenOrders: jest.fn(),
      getUserFills: jest.fn(),
      getWebSocketStatus: jest.fn(),
    } as any;

    tools = new SimpleHyperLiquidTools(mockAdapter);
  });

  describe('getToolDefinitions', () => {
    it('should return all 13 tool definitions', () => {
      const definitions = tools.getToolDefinitions();

      expect(definitions).toHaveLength(13);
      expect(definitions.map((d) => d.name)).toEqual([
        'hyperliquid_get_all_prices',
        'hyperliquid_get_assets',
        'hyperliquid_get_order_book',
        'hyperliquid_get_trades',
        'hyperliquid_get_candles',
        'hyperliquid_get_account_info',
        'hyperliquid_health_check',
        'hyperliquid_place_market_order',
        'hyperliquid_place_limit_order',
        'hyperliquid_cancel_order',
        'hyperliquid_get_open_orders',
        'hyperliquid_get_user_fills',
        'hyperliquid_websocket_status',
      ]);
    });

    it('should have correct schema for hyperliquid_get_order_book', () => {
      const definitions = tools.getToolDefinitions();
      const orderBookTool = definitions.find((d) => d.name === 'hyperliquid_get_order_book')!;

      expect(orderBookTool.description).toBe('Get order book data for a specific asset');
      expect(orderBookTool.inputSchema.properties.symbol).toBeDefined();
      expect(orderBookTool.inputSchema.required).toContain('symbol');
    });

    it('should have correct schema for hyperliquid_place_limit_order', () => {
      const definitions = tools.getToolDefinitions();
      const limitOrderTool = definitions.find((d) => d.name === 'hyperliquid_place_limit_order')!;

      expect(limitOrderTool.description).toBe(
        'Place a limit order on HyperLiquid (requires private key)'
      );
      expect(limitOrderTool.inputSchema.required).toContain('assetId');
      expect(limitOrderTool.inputSchema.required).toContain('isBuy');
      expect(limitOrderTool.inputSchema.required).toContain('size');
      expect(limitOrderTool.inputSchema.required).toContain('price');
    });
  });

  describe('handleToolCall', () => {
    describe('hyperliquid_get_all_prices', () => {
      const mockPrices = { BTC: '52000', ETH: '3200', SOL: '95' };

      beforeEach(() => {
        mockAdapter.getAllMids.mockResolvedValue(mockPrices);
      });

      it('should get all prices successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_all_prices', {});

        expect(mockAdapter.getAllMids).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.prices).toEqual(mockPrices);
        expect(content.timestamp).toBeDefined();
      });

      it('should handle errors in getting prices', async () => {
        mockAdapter.getAllMids.mockRejectedValue(new Error('Network error'));

        const result = await tools.handleToolCall('hyperliquid_get_all_prices', {});

        expect(result.isError).toBe(true);
        expect(result.content).toHaveLength(1);
        expect((result as any).content[0].type).toBe('text');
        expect((result as any).content[0].text).toContain('Network error');
      });
    });

    describe('hyperliquid_get_assets', () => {
      const mockAssets = [
        { name: 'BTC', szDecimals: 5, maxLeverage: 20 },
        { name: 'ETH', szDecimals: 4, maxLeverage: 20 },
        { name: 'SOL', szDecimals: 2, maxLeverage: 10 },
      ];

      beforeEach(() => {
        mockAdapter.getAssets.mockResolvedValue(mockAssets);
      });

      it('should get assets successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_assets', {});

        expect(mockAdapter.getAssets).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.assets).toHaveLength(3);
        expect(content.assets[0].name).toBe('BTC');
        expect(content.assets[0].maxLeverage).toBe(20);
      });
    });

    describe('hyperliquid_get_order_book', () => {
      const mockOrderBook = {
        levels: [
          [
            ['51950.0', '0.5'],
            ['51955.0', '0.3'],
          ], // bids
          [
            ['52000.0', '0.4'],
            ['52005.0', '0.6'],
          ], // asks
        ],
      };

      beforeEach(() => {
        mockAdapter.getOrderBook.mockResolvedValue(mockOrderBook);
      });

      it('should get order book successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_order_book', {
          symbol: 'BTC',
        });

        expect(mockAdapter.getOrderBook).toHaveBeenCalledWith('BTC');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.symbol).toBe('BTC');
        expect(content.orderBook).toEqual(mockOrderBook);
      });

      it('should handle missing symbol parameter', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_order_book', {});

        expect(result.isError).toBe(true);
        expect((result as any).content[0].text).toContain('Error');
      });
    });

    describe('hyperliquid_get_trades', () => {
      const mockTrades = [
        { px: '52000.0', sz: '0.5', time: 1640995200000, side: 'B' },
        { px: '51995.0', sz: '0.3', time: 1640995180000, side: 'A' },
      ];

      beforeEach(() => {
        mockAdapter.getTrades.mockResolvedValue(mockTrades);
      });

      it('should get trades successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_trades', {
          symbol: 'BTC',
        });

        expect(mockAdapter.getTrades).toHaveBeenCalledWith('BTC');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.symbol).toBe('BTC');
        expect(content.trades).toHaveLength(2);
        expect(content.trades[0].px).toBe('52000.0');
      });
    });

    describe('hyperliquid_get_candles', () => {
      const mockCandles = [
        { t: 1640995200000, o: '52000', h: '52100', l: '51900', c: '52050', v: '150.5' },
        { t: 1640998800000, o: '52050', h: '52200', l: '52000', c: '52150', v: '200.3' },
      ];

      beforeEach(() => {
        mockAdapter.getCandles.mockResolvedValue(mockCandles);
      });

      it('should get candles successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_candles', {
          symbol: 'BTC',
          interval: '1h',
          startTime: 1640995200000,
          endTime: 1640998800000,
        });

        expect(mockAdapter.getCandles).toHaveBeenCalledWith(
          'BTC',
          '1h',
          1640995200000,
          1640998800000
        );
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.symbol).toBe('BTC');
        expect(content.candles).toHaveLength(2);
        expect(content.candles[0].o).toBe('52000');
      });

      it('should handle missing required parameters', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_candles', {
          symbol: 'BTC',
          // missing interval
        });

        expect(result.isError).toBe(true);
        expect((result as any).content[0].text).toContain('Error');
      });
    });

    describe('hyperliquid_get_account_info', () => {
      const mockAccountState = {
        marginSummary: {
          accountValue: '100000',
          totalRawUsd: '95000',
        },
        assetPositions: [
          { coin: 'BTC', szi: '0.5', entryPx: '50000' },
          { coin: 'ETH', szi: '-1.0', entryPx: '3000' },
        ],
      };

      beforeEach(() => {
        mockAdapter.getAccountState.mockResolvedValue(mockAccountState);
      });

      it('should get account info successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_account_info', {
          address: '0x123...abc',
        });

        expect(mockAdapter.getAccountState).toHaveBeenCalledWith('0x123...abc');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.accountInfo).toEqual(mockAccountState);
      });

      it('should use default address if not provided', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_account_info', {});

        expect(mockAdapter.getAccountState).toHaveBeenCalledWith(undefined);
        expect(result.isError).toBeUndefined();
      });
    });

    describe('hyperliquid_health_check', () => {
      const mockHealth = {
        healthy: true,
        latencyMs: 150,
        details: { latency: 150 },
        errors: [],
        lastChecked: Date.now(),
      };

      beforeEach(() => {
        mockAdapter.healthCheck.mockResolvedValue(mockHealth);
      });

      it('should perform health check successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_health_check', {});

        expect(mockAdapter.healthCheck).toHaveBeenCalledWith(true);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.healthy).toBe(true);
        expect(content.latencyMs).toBeDefined();
        expect(content.details).toEqual({ latency: 150 });
      });
    });

    describe('hyperliquid_place_market_order', () => {
      const mockOrderResult = {
        status: 'ok',
        response: { type: 'order', data: { statuses: ['success'] } },
      };

      beforeEach(() => {
        mockAdapter.placeMarketOrder.mockResolvedValue(mockOrderResult);
      });

      it('should place market order successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_place_market_order', {
          assetId: 0,
          isBuy: true,
          size: '0.1',
        });

        expect(mockAdapter.placeMarketOrder).toHaveBeenCalledWith(0, true, '0.1', false);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.assetId).toBe(0);
        expect(content.result.status).toBe('ok');
      });

      it('should handle reduce only parameter', async () => {
        const result = await tools.handleToolCall('hyperliquid_place_market_order', {
          assetId: 0,
          isBuy: false,
          size: '0.1',
          reduceOnly: true,
        });

        expect(mockAdapter.placeMarketOrder).toHaveBeenCalledWith(0, false, '0.1', true);
        expect(result.isError).toBeUndefined();
      });
    });

    describe('hyperliquid_place_limit_order', () => {
      const mockOrderResult = {
        status: 'ok',
        response: { type: 'order', data: { statuses: ['success'] } },
      };

      beforeEach(() => {
        mockAdapter.placeLimitOrder.mockResolvedValue(mockOrderResult);
      });

      it('should place limit order successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_place_limit_order', {
          assetId: 0,
          isBuy: true,
          size: '0.1',
          price: '51000',
        });

        expect(mockAdapter.placeLimitOrder).toHaveBeenCalledWith(
          0,
          true,
          '51000',
          '0.1',
          'Gtc',
          false
        );
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.assetId).toBe(0);
        expect(content.result.status).toBe('ok');
      });

      it('should handle time in force parameter', async () => {
        const result = await tools.handleToolCall('hyperliquid_place_limit_order', {
          assetId: 0,
          isBuy: true,
          size: '0.1',
          price: '51000',
          timeInForce: 'Ioc',
        });

        expect(mockAdapter.placeLimitOrder).toHaveBeenCalledWith(
          0,
          true,
          '51000',
          '0.1',
          'Ioc',
          false
        );
        expect(result.isError).toBeUndefined();
      });
    });

    describe('hyperliquid_cancel_order', () => {
      const mockCancelResult = {
        status: 'ok',
        response: { type: 'cancel', data: { statuses: ['success'] } },
      };

      beforeEach(() => {
        mockAdapter.cancelOrder.mockResolvedValue(mockCancelResult);
      });

      it('should cancel order successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_cancel_order', {
          assetId: 0,
          orderId: 123456,
        });

        expect(mockAdapter.cancelOrder).toHaveBeenCalledWith(0, 123456);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.result.status).toBe('ok');
      });
    });

    describe('hyperliquid_get_open_orders', () => {
      const mockOpenOrders = [
        { coin: 'BTC', oid: 123456, side: 'B', sz: '0.1', limitPx: '51000' },
        { coin: 'ETH', oid: 789012, side: 'A', sz: '1.0', limitPx: '3100' },
      ];

      beforeEach(() => {
        mockAdapter.getOpenOrders.mockResolvedValue(mockOpenOrders);
      });

      it('should get open orders successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_open_orders', {
          address: '0x123...abc',
        });

        expect(mockAdapter.getOpenOrders).toHaveBeenCalledWith('0x123...abc');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.orders).toHaveLength(2);
        expect(content.orders[0].coin).toBe('BTC');
      });
    });

    describe('hyperliquid_get_user_fills', () => {
      const mockFills = [
        { coin: 'BTC', px: '52000', sz: '0.05', side: 'B', time: 1640995200000 },
        { coin: 'ETH', px: '3200', sz: '0.5', side: 'A', time: 1640995180000 },
      ];

      beforeEach(() => {
        mockAdapter.getUserFills.mockResolvedValue(mockFills);
      });

      it('should get user fills successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_get_user_fills', {
          address: '0x123...abc',
        });

        expect(mockAdapter.getUserFills).toHaveBeenCalledWith('0x123...abc');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.fills).toHaveLength(2);
        expect(content.fills[0].coin).toBe('BTC');
      });
    });

    describe('hyperliquid_websocket_status', () => {
      const mockWsStatus = { connected: true, subscriptions: ['allMids'], lastMessage: Date.now() };

      beforeEach(() => {
        mockAdapter.getWebSocketStatus.mockReturnValue(mockWsStatus);
      });

      it('should get websocket status successfully', async () => {
        const result = await tools.handleToolCall('hyperliquid_websocket_status', {});

        expect(mockAdapter.getWebSocketStatus).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result as any).content[0].text);
        expect(content.websocket_status).toEqual(mockWsStatus);
      });
    });
  });

  describe('error handling', () => {
    it('should handle unknown tool names', async () => {
      const result = await tools.handleToolCall('unknown_tool', {});

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Unknown tool: unknown_tool');
    });

    it('should handle adapter errors gracefully', async () => {
      mockAdapter.getAllMids.mockRejectedValue(new Error('Network timeout'));

      const result = await tools.handleToolCall('hyperliquid_get_all_prices', {});

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Network timeout');
    });

    it('should handle invalid arguments gracefully', async () => {
      const result = await tools.handleToolCall('hyperliquid_get_order_book', {
        wrongParam: 'BTC',
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Error');
    });

    it('should handle validation errors for required fields', async () => {
      const result = await tools.handleToolCall('hyperliquid_place_limit_order', {
        assetId: 0,
        isBuy: true,
        size: '0.1',
        // missing price
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Error');
    });
  });
});
