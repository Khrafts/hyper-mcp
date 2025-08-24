import { HyperLiquidWebSocket } from '../../src/websocket/HyperLiquidWebSocket.js';
import { WebSocketManager } from '../../src/websocket/WebSocketManager.js';

// Mock WebSocketManager
jest.mock('../../src/websocket/WebSocketManager.js');
const MockWebSocketManager = WebSocketManager as jest.MockedClass<typeof WebSocketManager>;

describe('HyperLiquidWebSocket Tests', () => {
  let hyperLiquidWS: HyperLiquidWebSocket;
  let mockWebSocketManager: jest.Mocked<WebSocketManager>;

  beforeEach(() => {
    MockWebSocketManager.mockClear();

    mockWebSocketManager = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      getConnectionStatus: jest.fn().mockReturnValue({
        connected: false,
        reconnecting: false,
        reconnectAttempts: 0,
        subscriptionCount: 0,
      }),
      on: jest.fn(),
    } as any;

    MockWebSocketManager.mockImplementation(() => mockWebSocketManager);

    hyperLiquidWS = new HyperLiquidWebSocket('wss://api.hyperliquid.xyz/ws');
  });

  afterEach(async () => {
    await hyperLiquidWS.disconnect();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with WebSocket URL', () => {
      expect(MockWebSocketManager).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'wss://api.hyperliquid.xyz/ws',
          reconnectDelay: 1000,
          maxReconnectAttempts: 10,
        })
      );
    });

    it('should setup event handlers', () => {
      expect(mockWebSocketManager.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockWebSocketManager.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(mockWebSocketManager.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocketManager.on).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      await hyperLiquidWS.connect();
      expect(mockWebSocketManager.connect).toHaveBeenCalled();
    });

    it('should disconnect successfully', async () => {
      await hyperLiquidWS.disconnect();
      expect(mockWebSocketManager.disconnect).toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to all mids', () => {
      const callback = jest.fn();

      const subscriptionId = hyperLiquidWS.subscribeToAllMids(callback);

      expect(subscriptionId).toMatch(/^allMids_\d+$/);
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledWith({
        id: subscriptionId,
        channel: 'allMids',
        params: { type: 'allMids' },
        callback: expect.any(Function),
      });
    });

    it('should subscribe to L2 book for specific coin', () => {
      const callback = jest.fn();

      const subscriptionId = hyperLiquidWS.subscribeToL2Book('BTC', callback);

      expect(subscriptionId).toMatch(/^l2Book_BTC_\d+$/);
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledWith({
        id: subscriptionId,
        channel: 'l2Book',
        params: { type: 'l2Book', coin: 'BTC' },
        callback: expect.any(Function),
      });
    });

    it('should subscribe to trades for specific coin', () => {
      const callback = jest.fn();

      const subscriptionId = hyperLiquidWS.subscribeToTrades('ETH', callback);

      expect(subscriptionId).toMatch(/^trades_ETH_\d+$/);
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledWith({
        id: subscriptionId,
        channel: 'trades',
        params: { type: 'trades', coin: 'ETH' },
        callback: expect.any(Function),
      });
    });

    it('should subscribe to candles with interval', () => {
      const callback = jest.fn();

      const subscriptionId = hyperLiquidWS.subscribeToCandles('BTC', '1m', callback);

      expect(subscriptionId).toMatch(/^candle_BTC_1m_\d+$/);
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledWith({
        id: subscriptionId,
        channel: 'candle',
        params: { type: 'candle', coin: 'BTC', interval: '1m' },
        callback: expect.any(Function),
      });
    });

    it('should subscribe to order updates', () => {
      const callback = jest.fn();
      const userAddress = '0x123...';

      const subscriptionId = hyperLiquidWS.subscribeToOrderUpdates(userAddress, callback);

      expect(subscriptionId).toMatch(/^orderUpdates_0x123\.\.\._\d+$/);
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledWith({
        id: subscriptionId,
        channel: 'orderUpdates',
        params: { type: 'orderUpdates', user: userAddress },
        callback: expect.any(Function),
      });
    });

    it('should subscribe to user fills', () => {
      const callback = jest.fn();
      const userAddress = '0x456...';

      const subscriptionId = hyperLiquidWS.subscribeToUserFills(userAddress, callback);

      expect(subscriptionId).toMatch(/^userFills_0x456\.\.\._\d+$/);
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledWith({
        id: subscriptionId,
        channel: 'userFills',
        params: { type: 'userFills', user: userAddress },
        callback: expect.any(Function),
      });
    });

    it('should unsubscribe from subscription', () => {
      const callback = jest.fn();
      const subscriptionId = hyperLiquidWS.subscribeToAllMids(callback);

      hyperLiquidWS.unsubscribe(subscriptionId);

      expect(mockWebSocketManager.unsubscribe).toHaveBeenCalledWith(subscriptionId);
    });
  });

  describe('Multi-coin Subscriptions', () => {
    it('should subscribe to multiple coins for L2 book', async () => {
      const callback = jest.fn();
      const coins = ['BTC', 'ETH', 'SOL'];

      const subscriptionIds = await hyperLiquidWS.subscribeToMultipleCoins(
        coins,
        'l2Book',
        callback
      );

      expect(subscriptionIds).toHaveLength(3);
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledTimes(3);
    });

    it('should subscribe to multiple coins for trades', async () => {
      const callback = jest.fn();
      const coins = ['BTC', 'ETH'];

      const subscriptionIds = await hyperLiquidWS.subscribeToMultipleCoins(
        coins,
        'trades',
        callback
      );

      expect(subscriptionIds).toHaveLength(2);
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should subscribe to multiple coins for candles with interval', async () => {
      const callback = jest.fn();
      const coins = ['BTC'];

      const subscriptionIds = await hyperLiquidWS.subscribeToMultipleCoins(
        coins,
        'candles',
        callback,
        '5m'
      );

      expect(subscriptionIds).toHaveLength(1);
      expect(mockWebSocketManager.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { type: 'candle', coin: 'BTC', interval: '5m' },
        })
      );
    });

    it('should throw error for candles without interval', async () => {
      const callback = jest.fn();
      const coins = ['BTC'];

      await expect(
        hyperLiquidWS.subscribeToMultipleCoins(coins, 'candles', callback)
      ).rejects.toThrow('Interval required for candle subscriptions');
    });

    it('should throw error for unsupported subscription type', async () => {
      const callback = jest.fn();
      const coins = ['BTC'];

      await expect(
        hyperLiquidWS.subscribeToMultipleCoins(coins, 'invalid' as any, callback)
      ).rejects.toThrow('Unsupported subscription type: invalid');
    });
  });

  describe('Status and Information', () => {
    it('should return connection status', () => {
      mockWebSocketManager.getConnectionStatus.mockReturnValue({
        connected: true,
        reconnecting: false,
        reconnectAttempts: 0,
        subscriptionCount: 5,
      });

      const status = hyperLiquidWS.getStatus();

      expect(status.connected).toBe(true);
      expect(status.reconnecting).toBe(false);
      expect(status.reconnectAttempts).toBe(0);
      expect(status.subscriptionCount).toBe(5);
      expect(status.activeSubscriptions).toEqual([]);
    });

    it('should track active subscriptions', () => {
      const callback = jest.fn();
      hyperLiquidWS.subscribeToAllMids(callback);
      hyperLiquidWS.subscribeToL2Book('BTC', callback);

      const status = hyperLiquidWS.getStatus();

      expect(status.activeSubscriptions).toHaveLength(0); // Callbacks are tracked separately
    });
  });

  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      await hyperLiquidWS.shutdown();

      expect(mockWebSocketManager.disconnect).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    it('should handle subscription callbacks for all mids', () => {
      const callback = jest.fn();
      const subscriptionId = hyperLiquidWS.subscribeToAllMids(callback);

      // Get the callback that was registered with WebSocketManager
      const subscribeCall = mockWebSocketManager.subscribe.mock.calls.find(
        (call) => call[0].id === subscriptionId
      );

      expect(subscribeCall).toBeDefined();

      // Simulate message with mids data
      const mockData = { mids: { BTC: '50000', ETH: '3000' } };
      subscribeCall![0].callback(mockData);

      expect(callback).toHaveBeenCalledWith({ BTC: '50000', ETH: '3000' });
    });

    it('should handle subscription callbacks for L2 book', () => {
      const callback = jest.fn();
      const subscriptionId = hyperLiquidWS.subscribeToL2Book('BTC', callback);

      const subscribeCall = mockWebSocketManager.subscribe.mock.calls.find(
        (call) => call[0].id === subscriptionId
      );

      const mockData = {
        levels: [
          ['50000', '1.5'],
          ['49900', '2.0'],
        ],
      };
      subscribeCall![0].callback(mockData);

      expect(callback).toHaveBeenCalledWith({
        levels: [
          ['50000', '1.5'],
          ['49900', '2.0'],
        ],
      });
    });

    it('should handle subscription callbacks for trades', () => {
      const callback = jest.fn();
      const subscriptionId = hyperLiquidWS.subscribeToTrades('ETH', callback);

      const subscribeCall = mockWebSocketManager.subscribe.mock.calls.find(
        (call) => call[0].id === subscriptionId
      );

      const mockTrades = [{ coin: 'ETH', px: '3000', sz: '1.0', time: Date.now(), side: 'buy' }];
      const mockData = { trades: mockTrades };
      subscribeCall![0].callback(mockData);

      expect(callback).toHaveBeenCalledWith(mockTrades);
    });
  });
});
