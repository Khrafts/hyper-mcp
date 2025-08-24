import { RiskManagementEngine } from '../../src/risk/RiskManagementEngine.js';
import { SimpleHyperLiquidAdapter } from '../../src/adapters/hyperliquid/SimpleHyperLiquidAdapter.js';

describe('RiskManagementEngine Basic Tests', () => {
  let mockAdapter: jest.Mocked<SimpleHyperLiquidAdapter>;
  let riskEngine: RiskManagementEngine;

  beforeEach(() => {
    mockAdapter = {
      getAllMids: jest.fn(),
      getAccountState: jest.fn(),
    } as any;

    riskEngine = new RiskManagementEngine(mockAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default risk limits', () => {
      const limits = riskEngine.getRiskLimits();
      expect(limits.maxPositionSize).toBe(100000);
      expect(limits.maxLeverage).toBe(10);
      expect(limits.varLimit).toBe(10000);
    });

    it('should accept custom risk limits', () => {
      const customRiskEngine = new RiskManagementEngine(mockAdapter, {
        maxPositionSize: 200000,
        maxLeverage: 5,
      });
      
      const limits = customRiskEngine.getRiskLimits();
      expect(limits.maxPositionSize).toBe(200000);
      expect(limits.maxLeverage).toBe(5);
      // Should retain defaults for unspecified limits
      expect(limits.maxDailyLoss).toBe(5000);
    });
  });

  describe('Risk Limits Management', () => {
    it('should update risk limits correctly', () => {
      riskEngine.updateRiskLimits({
        maxPositionSize: 150000,
        maxLeverage: 8,
      });

      const updatedLimits = riskEngine.getRiskLimits();
      expect(updatedLimits.maxPositionSize).toBe(150000);
      expect(updatedLimits.maxLeverage).toBe(8);
      // Other limits should remain unchanged
      expect(updatedLimits.maxDailyLoss).toBe(5000);
    });
  });

  describe('Risk Alerts', () => {
    it('should start with no active alerts', () => {
      const alerts = riskEngine.getActiveAlerts();
      expect(alerts).toHaveLength(0);
    });

    it('should return false when resolving non-existent alert', () => {
      const resolved = riskEngine.resolveAlert('non-existent');
      expect(resolved).toBe(false);
    });

    it('should provide risk statistics', () => {
      const stats = riskEngine.getRiskStatistics();
      expect(stats).toHaveProperty('totalAlerts');
      expect(stats).toHaveProperty('activeAlerts');
      expect(stats).toHaveProperty('resolvedAlerts');
      expect(typeof stats.totalAlerts).toBe('number');
    });
  });

  describe('Engine Lifecycle', () => {
    it('should start and stop correctly', async () => {
      await riskEngine.start();
      await riskEngine.stop();
      // Test passes if no errors thrown
      expect(true).toBe(true);
    });
  });

  describe('VaR Calculations', () => {
    it('should handle empty returns array', () => {
      const var95 = (riskEngine as any).calculateVaR([], 0.95);
      expect(var95).toBe(0);
    });

    it('should calculate VaR with sample data', () => {
      const returns = [-0.05, 0.03, -0.02, 0.01, -0.04];
      const var95 = (riskEngine as any).calculateVaR(returns, 0.95);
      expect(typeof var95).toBe('number');
      expect(var95).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing price data gracefully', async () => {
      mockAdapter.getAllMids.mockResolvedValue({});
      
      const price = await (riskEngine as any).getCurrentPrice('UNKNOWN');
      expect(price).toBe(0);
    });
  });
});