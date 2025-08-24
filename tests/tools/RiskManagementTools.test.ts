import { RiskManagementTools } from '../../src/tools/RiskManagementTools.js';
import { RiskManagementEngine } from '../../src/risk/RiskManagementEngine.js';

jest.mock('../../src/utils/logger.js', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('RiskManagementTools', () => {
  let tools: RiskManagementTools;
  let mockRiskEngine: jest.Mocked<RiskManagementEngine>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRiskEngine = {
      checkOrderRisk: jest.fn(),
      calculatePortfolioRisk: jest.fn(),
      getRiskLimits: jest.fn(),
      updateRiskLimits: jest.fn(),
      getActiveAlerts: jest.fn(),
      getAllAlerts: jest.fn(),
      resolveAlert: jest.fn(),
      // performStressTest is internal, not exposed
      getRiskStatistics: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      isActive: true,
    } as any;

    tools = new RiskManagementTools(mockRiskEngine);
  });

  describe('getToolDefinitions', () => {
    it('should return all tool definitions', () => {
      const definitions = tools.getToolDefinitions();

      expect(definitions).toHaveLength(9);
      expect(definitions.map((d) => d.name)).toEqual([
        'risk_check_order',
        'risk_get_portfolio_analysis',
        'risk_get_limits',
        'risk_update_limits',
        'risk_get_alerts',
        'risk_resolve_alert',
        'risk_perform_stress_test',
        'risk_get_statistics',
        'risk_engine_control',
      ]);
    });

    it('should have correct schema for risk_check_order', () => {
      const definitions = tools.getToolDefinitions();
      const checkTool = definitions.find((d) => d.name === 'risk_check_order')!;

      expect(checkTool.inputSchema.type).toBe('object');
      expect(checkTool.inputSchema.required).toContain('symbol');
      expect(checkTool.inputSchema.required).toContain('side');
      expect(checkTool.inputSchema.required).toContain('quantity');
      expect((checkTool.inputSchema.properties.side as any).enum).toEqual(['buy', 'sell']);
    });

    it('should have correct schema for risk_update_limits', () => {
      const definitions = tools.getToolDefinitions();
      const updateTool = definitions.find((d) => d.name === 'risk_update_limits')!;

      expect(updateTool.inputSchema.type).toBe('object');
      expect(updateTool.inputSchema.required).toBeUndefined();
      expect((updateTool.inputSchema.properties.maxLeverage as any).minimum).toBe(1);
      expect((updateTool.inputSchema.properties.maxLeverage as any).maximum).toBe(50);
    });
  });

  describe('handleToolCall', () => {
    describe('risk_check_order', () => {
      const mockOrderRisk = {
        approved: true,
        rejectionReasons: [],
        warnings: ['High concentration detected'],
        riskMetrics: {
          newPortfolioVar: 5000,
          concentrationImpact: 0.1,
          leverageImpact: 0.05,
          liquidationRisk: 0.02,
        },
      };

      beforeEach(() => {
        mockRiskEngine.checkOrderRisk.mockResolvedValue(mockOrderRisk);
      });

      it('should check order risk successfully', async () => {
        const result = await tools.handleToolCall('risk_check_order', {
          symbol: 'BTC',
          side: 'buy',
          quantity: 0.5,
          price: 50000,
        });

        expect(mockRiskEngine.checkOrderRisk).toHaveBeenCalledWith('BTC', 'buy', 0.5, 50000);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('order_risk_check');
        expect(content.approved).toBe(true);
        expect(content.warnings).toHaveLength(1);
        expect(content.riskMetrics.concentrationImpact).toBe('10.00%');
      });

      it('should check market order without price', async () => {
        const result = await tools.handleToolCall('risk_check_order', {
          symbol: 'ETH',
          side: 'sell',
          quantity: 2.0,
        });

        expect(mockRiskEngine.checkOrderRisk).toHaveBeenCalledWith('ETH', 'sell', 2.0, undefined);
        expect(result.isError).toBeUndefined();
      });

      it('should handle rejected orders', async () => {
        mockRiskEngine.checkOrderRisk.mockResolvedValue({
          approved: false,
          rejectionReasons: ['Order value exceeds limit', 'Position size too large'],
          warnings: [],
          riskMetrics: {
            newPortfolioVar: 15000,
            concentrationImpact: 0.5,
            leverageImpact: 0.8,
            liquidationRisk: 0.15,
          },
        });

        const result = await tools.handleToolCall('risk_check_order', {
          symbol: 'BTC',
          side: 'buy',
          quantity: 2.0,
          price: 50000,
        });

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.approved).toBe(false);
        expect(content.rejectionReasons).toHaveLength(2);
        expect(content.rejectionReasons[0]).toContain('Order value exceeds limit');
      });

      it('should validate input schema', async () => {
        const result = await tools.handleToolCall('risk_check_order', {
          symbol: 'BTC',
          // missing side and quantity
        });

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });

      it('should handle errors in order risk checking', async () => {
        const error = new Error('Risk engine unavailable');
        mockRiskEngine.checkOrderRisk.mockRejectedValue(error);

        const result = await tools.handleToolCall('risk_check_order', {
          symbol: 'BTC',
          side: 'buy',
          quantity: 0.5,
        });

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBeDefined();
        expect(content.approved).toBe(false);
      });
    });

    describe('risk_get_portfolio_analysis', () => {
      const mockPortfolioRisk = {
        totalValue: 100000,
        totalRisk: 0.15,
        portfolioVar95: 8000,
        portfolioVar99: 12000,
        maxDrawdown: 0.08,
        sharpeRatio: 1.2,
        sortino: 1.5,
        beta: 0.9,
        positions: [
          {
            symbol: 'BTC',
            size: 0.5,
            entryPrice: 50000,
            currentPrice: 52000,
            leverage: 2.0,
            unrealizedPnl: 1000,
            riskScore: 65,
            var95: 2500,
            var99: 3500,
            expectedShortfall: 4000,
            concentration: 0.45,
          },
          {
            symbol: 'ETH',
            size: -1.0,
            entryPrice: 3000,
            currentPrice: 2900,
            leverage: 1.5,
            unrealizedPnl: -100,
            riskScore: 45,
            var95: 1800,
            var99: 2400,
            expectedShortfall: 2800,
            concentration: 0.35,
          },
        ],
        correlationMatrix: {
          BTC: { BTC: 1, ETH: 0.7 },
          ETH: { BTC: 0.7, ETH: 1 },
        },
        stressTestResults: [
          {
            scenario: 'Market Crash',
            description: '30% market decline',
            portfolioImpact: -15000,
            impactPercent: -15,
            positionImpacts: [
              { symbol: 'BTC', impact: -7500, impactPercent: -15 },
              { symbol: 'ETH', impact: -7500, impactPercent: -15 },
            ],
          },
          {
            scenario: 'Black Swan',
            description: 'Extreme market event',
            portfolioImpact: -25000,
            impactPercent: -25,
            positionImpacts: [
              { symbol: 'BTC', impact: -12500, impactPercent: -25 },
              { symbol: 'ETH', impact: -12500, impactPercent: -25 },
            ],
          },
        ],
      };

      beforeEach(() => {
        mockRiskEngine.calculatePortfolioRisk.mockResolvedValue(mockPortfolioRisk);
      });

      it('should get portfolio analysis successfully', async () => {
        const result = await tools.handleToolCall('risk_get_portfolio_analysis', {
          userAddress: '0x123',
        });

        expect(mockRiskEngine.calculatePortfolioRisk).toHaveBeenCalledWith('0x123');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('portfolio_risk_analysis');
        expect(content.portfolio).toBeDefined();
        expect(content.portfolio.totalValue).toBe('$100000.00');
        expect(content.portfolio.positions).toHaveLength(2);
        expect(content.portfolio.stressTests).toHaveLength(2);
      });

      it('should get portfolio analysis without userAddress', async () => {
        const result = await tools.handleToolCall('risk_get_portfolio_analysis', {});

        expect(mockRiskEngine.calculatePortfolioRisk).toHaveBeenCalledWith(undefined);
        expect(result.isError).toBeUndefined();
      });

      it('should handle errors in portfolio analysis', async () => {
        const error = new Error('Portfolio calculation failed');
        mockRiskEngine.calculatePortfolioRisk.mockRejectedValue(error);

        const result = await tools.handleToolCall('risk_get_portfolio_analysis', {});

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBeDefined();
        expect(content.action).toBe('portfolio_risk_analysis');
      });
    });

    describe('risk_get_limits', () => {
      const mockLimits = {
        maxPositionSize: 100000,
        maxLeverage: 10,
        maxDailyLoss: 5000,
        maxDrawdown: 0.2,
        maxConcentration: 0.3,
        varLimit: 10000,
        stopLossPercent: 0.05,
        maxOrderValue: 50000,
      };

      beforeEach(() => {
        mockRiskEngine.getRiskLimits.mockReturnValue(mockLimits);
      });

      it('should get risk limits successfully', async () => {
        const result = await tools.handleToolCall('risk_get_limits', {});

        expect(mockRiskEngine.getRiskLimits).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('get_risk_limits');
        expect(content.limits.maxPositionSize).toBe('$100000');
        expect(content.limits.maxLeverage).toBe('10x');
        expect(content.limits.maxDailyLoss).toBe('$5000');
      });
    });

    describe('risk_update_limits', () => {
      beforeEach(() => {
        mockRiskEngine.updateRiskLimits.mockImplementation(() => {});
        mockRiskEngine.getRiskLimits.mockReturnValue({
          maxPositionSize: 150000,
          maxLeverage: 8,
          varLimit: 15000,
          maxDailyLoss: 10000,
          maxDrawdown: 0.2,
          maxConcentration: 0.3,
          stopLossPercent: 0.05,
          maxOrderValue: 50000,
        });
      });

      it('should update risk limits successfully', async () => {
        const newLimits = {
          maxPositionSize: 150000,
          maxLeverage: 8,
          varLimit: 15000,
        };

        const result = await tools.handleToolCall('risk_update_limits', newLimits);

        expect(mockRiskEngine.updateRiskLimits).toHaveBeenCalledWith(newLimits);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('update_risk_limits');
        expect(content.updatedLimits.maxLeverage).toBe('8x');
        expect(content.updatedLimits.maxPositionSize).toBe('$150000');
        expect(content.updatedLimits.varLimit).toBe('$15000');
        expect(content.success).toBe(true);
      });

      it('should validate limit values', async () => {
        const invalidLimits = {
          maxLeverage: 100, // exceeds maximum of 50
          maxDrawdown: 1.5, // exceeds maximum of 1
        };

        const result = await tools.handleToolCall('risk_update_limits', invalidLimits);

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });

      it('should handle errors in limit updates', async () => {
        const error = new Error('Failed to update limits');
        mockRiskEngine.updateRiskLimits.mockImplementation(() => {
          throw error;
        });

        const result = await tools.handleToolCall('risk_update_limits', {
          maxPositionSize: 150000,
        });

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Failed to update limits');
      });
    });

    describe('risk_get_alerts', () => {
      const mockAlerts = [
        {
          id: 'alert_1',
          type: 'var_exceeded' as const,
          severity: 'high' as const,
          symbol: 'BTC',
          message: 'Portfolio VaR exceeds limit',
          currentValue: 12000,
          limit: 10000,
          timestamp: new Date('2024-01-01T00:00:00Z'),
          resolved: false,
        },
        {
          id: 'alert_2',
          type: 'concentration' as const,
          severity: 'medium' as const,
          symbol: 'ETH',
          message: 'Position concentration high',
          currentValue: 0.35,
          limit: 0.3,
          timestamp: new Date('2024-01-01T01:00:00Z'),
          resolved: true,
        },
      ];

      beforeEach(() => {
        mockRiskEngine.getActiveAlerts.mockReturnValue([
          mockAlerts[0]!, // Only return the first alert
        ]);
        mockRiskEngine.getRiskStatistics.mockReturnValue({
          totalAlerts: 5,
          activeAlerts: 1,
          resolvedAlerts: 4,
          alertsByType: { concentration: 1 },
          alertsBySeverity: { medium: 1 },
        });
      });

      it('should get active alerts only by default', async () => {
        const result = await tools.handleToolCall('risk_get_alerts', {});

        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('get_risk_alerts');
        expect(content.alerts).toHaveLength(1);
        expect(content.alerts[0].id).toBe('alert_1');
        expect(content.alerts[0].resolved).toBe(false);
      });

      it('should include resolved alerts when requested', async () => {
        // Mock getAllAlerts to return both resolved and unresolved alerts
        mockRiskEngine.getAllAlerts.mockReturnValue([
          mockAlerts[0]!, // unresolved
          mockAlerts[1]!, // resolved
        ]);

        const result = await tools.handleToolCall('risk_get_alerts', {
          includeResolved: true,
        });

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.alerts).toHaveLength(2);
        expect(content.alerts.some((a: any) => a.resolved)).toBe(true);
      });

      it('should handle empty alerts', async () => {
        mockRiskEngine.getActiveAlerts.mockReturnValue([]);
        mockRiskEngine.getRiskStatistics.mockReturnValue({
          totalAlerts: 0,
          activeAlerts: 0,
          resolvedAlerts: 0,
          alertsByType: {},
          alertsBySeverity: {},
        });

        const result = await tools.handleToolCall('risk_get_alerts', {});

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.alerts).toHaveLength(0);
        expect(content.statistics.totalAlerts).toBe(0);
      });
    });

    describe('risk_resolve_alert', () => {
      beforeEach(() => {
        mockRiskEngine.resolveAlert.mockReturnValue(true);
      });

      it('should resolve alert successfully', async () => {
        const result = await tools.handleToolCall('risk_resolve_alert', {
          alertId: 'alert_123',
        });

        expect(mockRiskEngine.resolveAlert).toHaveBeenCalledWith('alert_123');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('resolve_alert');
        expect(content.alertId).toBe('alert_123');
        expect(content.resolved).toBe(true);
      });

      it('should handle non-existent alert', async () => {
        mockRiskEngine.resolveAlert.mockReturnValue(false);

        const result = await tools.handleToolCall('risk_resolve_alert', {
          alertId: 'nonexistent',
        });

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.resolved).toBe(false);
        expect(content.message).toContain('not found');
      });

      it('should validate input schema', async () => {
        const result = await tools.handleToolCall('risk_resolve_alert', {});

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });
    });

    describe('risk_perform_stress_test', () => {
      const mockStressResults = [
        {
          scenario: 'Market Crash',
          description: '30% market decline',
          portfolioImpact: -30000,
          impactPercent: -30,
          positionImpacts: [
            { symbol: 'BTC', impact: -15000, impactPercent: -30 },
            { symbol: 'ETH', impact: -15000, impactPercent: -30 },
          ],
        },
        {
          scenario: 'Interest Rate Shock',
          description: '2% rate increase',
          portfolioImpact: -8000,
          impactPercent: -8,
          positionImpacts: [
            { symbol: 'BTC', impact: -4000, impactPercent: -8 },
            { symbol: 'ETH', impact: -4000, impactPercent: -8 },
          ],
        },
      ];

      beforeEach(() => {
        mockRiskEngine.calculatePortfolioRisk.mockResolvedValue({
          totalValue: 100000,
          totalRisk: 0.15,
          portfolioVar95: 8000,
          portfolioVar99: 12000,
          maxDrawdown: 0.08,
          sharpeRatio: 1.2,
          sortino: 1.5,
          beta: 0.9,
          positions: [
            {
              symbol: 'BTC',
              size: 1,
              entryPrice: 45000,
              currentPrice: 50000,
              leverage: 1,
              unrealizedPnl: 5000,
              riskScore: 0.3,
              var95: 2000,
              var99: 3000,
              expectedShortfall: 3500,
              concentration: 0.5,
            },
            {
              symbol: 'ETH',
              size: 20,
              entryPrice: 2000,
              currentPrice: 2500,
              leverage: 1,
              unrealizedPnl: 10000,
              riskScore: 0.2,
              var95: 1500,
              var99: 2200,
              expectedShortfall: 2600,
              concentration: 0.5,
            },
          ],
          correlationMatrix: {},
          stressTestResults: mockStressResults,
        });
      });

      it('should perform stress test successfully', async () => {
        const result = await tools.handleToolCall('risk_perform_stress_test', {
          scenarios: [
            { name: 'Market Crash', description: '30% decline', marketShock: -0.3 },
            { name: 'Interest Rate Shock', description: '2% rate increase', marketShock: -0.08 },
          ],
        });

        expect(mockRiskEngine.calculatePortfolioRisk).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('portfolio_stress_test');
        expect(content.results).toHaveLength(2);
        expect(content.results[0].scenario).toBe('Market Crash');
        expect(content.results[0].portfolioImpact).toBe(-30000);
      });

      it('should handle default scenarios', async () => {
        const result = await tools.handleToolCall('risk_perform_stress_test', {});

        expect(mockRiskEngine.calculatePortfolioRisk).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();
      });
    });

    describe('risk_get_statistics', () => {
      const mockStats = {
        totalAlerts: 5,
        activeAlerts: 2,
        resolvedAlerts: 3,
        alertsByType: { var_exceeded: 2, concentration: 1 },
        alertsBySeverity: { high: 2, medium: 1 },
      };

      beforeEach(() => {
        mockRiskEngine.getRiskStatistics.mockReturnValue(mockStats);
      });

      it('should get risk statistics successfully', async () => {
        const result = await tools.handleToolCall('risk_get_statistics', {});

        expect(mockRiskEngine.getRiskStatistics).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('get_risk_statistics');
        expect(content.statistics.totalAlerts).toBe(5);
        expect(content.statistics.portfolioHealth).toBe('good');
      });
    });

    describe('risk_engine_control', () => {
      beforeEach(() => {
        mockRiskEngine.start.mockResolvedValue(undefined);
        mockRiskEngine.stop.mockResolvedValue(undefined);
        mockRiskEngine.getActiveAlerts.mockReturnValue([
          {
            id: '1',
            type: 'var_exceeded',
            severity: 'high',
            message: 'VaR limit exceeded',
            currentValue: 15000,
            limit: 10000,
            timestamp: new Date('2024-01-01T12:00:00Z'),
            resolved: false,
          },
        ]);
      });

      it('should start risk engine successfully', async () => {
        const result = await tools.handleToolCall('risk_engine_control', {
          action: 'start',
        });

        expect(mockRiskEngine.start).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('risk_engine_control');
        expect(content.engineAction).toBe('start');
        expect(content.success).toBe(true);
      });

      it('should stop risk engine successfully', async () => {
        const result = await tools.handleToolCall('risk_engine_control', {
          action: 'stop',
        });

        expect(mockRiskEngine.stop).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.engineAction).toBe('stop');
      });

      it('should get risk engine status', async () => {
        const result = await tools.handleToolCall('risk_engine_control', {
          action: 'status',
        });

        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.engineAction).toBe('status');
        expect(content.status.isActive).toBe(true);
      });

      it('should validate action parameter', async () => {
        const result = await tools.handleToolCall('risk_engine_control', {
          action: 'invalid_action',
        });

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });
    });

    describe('error handling', () => {
      it('should handle unknown tool names', async () => {
        const result = await tools.handleToolCall('unknown_tool', {});

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Unknown risk management tool');
      });

      it('should handle invalid arguments gracefully', async () => {
        const result = await tools.handleToolCall('risk_check_order', {
          symbol: 'BTC',
          side: 'invalid_side',
          quantity: -1,
        });

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });
    });
  });
});
