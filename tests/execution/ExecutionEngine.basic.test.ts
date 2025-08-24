import { ExecutionEngine } from '../../src/execution/ExecutionEngine.js';
import { SimpleHyperLiquidAdapter } from '../../src/adapters/hyperliquid/SimpleHyperLiquidAdapter.js';

describe('ExecutionEngine Basic Tests', () => {
  let mockAdapter: jest.Mocked<SimpleHyperLiquidAdapter>;
  let executionEngine: ExecutionEngine;

  beforeEach(() => {
    mockAdapter = {
      getAllMids: jest.fn(),
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      getOpenOrders: jest.fn(),
      getAccountState: jest.fn(),
    } as any;

    executionEngine = new ExecutionEngine(mockAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with adapter', () => {
      expect(executionEngine).toBeDefined();
      expect(executionEngine.getActiveOrders()).toHaveLength(0);
    });

    it('should return empty statistics initially', () => {
      const stats = executionEngine.getExecutionStatistics();
      expect(stats.totalOrders).toBe(0);
      expect(stats.completedOrders).toBe(0);
      expect(stats.cancelledOrders).toBe(0);
    });
  });

  describe('Order Status Queries', () => {
    it('should return null for non-existent orders', () => {
      const status = executionEngine.getOrderStatus('non-existent');
      expect(status).toBeUndefined();
    });

    it('should return null for non-existent execution reports', () => {
      const report = executionEngine.getExecutionReport('non-existent');
      expect(report).toBeUndefined();
    });
  });

  describe('Engine Lifecycle', () => {
    it('should start and stop successfully', async () => {
      await executionEngine.start();
      await executionEngine.stop();
      // Test passes if no errors thrown
      expect(true).toBe(true);
    });
  });
});