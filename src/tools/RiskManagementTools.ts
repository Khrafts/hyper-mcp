import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { RiskManagementEngine } from '../risk/RiskManagementEngine.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('RISK_MANAGEMENT_TOOLS');

export class RiskManagementTools {
  private riskEngine: RiskManagementEngine;

  constructor(riskEngine: RiskManagementEngine) {
    this.riskEngine = riskEngine;
  }

  getToolDefinitions() {
    return [
      {
        name: 'risk_check_order',
        description: 'Check if an order meets risk management criteria before execution',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Trading symbol',
            },
            side: {
              type: 'string',
              enum: ['buy', 'sell'],
              description: 'Order side',
            },
            quantity: {
              type: 'number',
              description: 'Order quantity',
              minimum: 0.0001,
            },
            price: {
              type: 'number',
              description: 'Order price (optional for market orders)',
              minimum: 0.0001,
            },
          },
          required: ['symbol', 'side', 'quantity'],
          additionalProperties: false,
        },
      },
      {
        name: 'risk_get_portfolio_analysis',
        description:
          'Get comprehensive portfolio risk analysis including VaR, stress tests, and correlations',
        inputSchema: {
          type: 'object',
          properties: {
            userAddress: {
              type: 'string',
              description: 'User address (optional, uses default if not provided)',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'risk_get_limits',
        description: 'Get current risk management limits',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'risk_update_limits',
        description: 'Update risk management limits',
        inputSchema: {
          type: 'object',
          properties: {
            maxPositionSize: {
              type: 'number',
              description: 'Maximum position size in USD',
              minimum: 1000,
            },
            maxLeverage: {
              type: 'number',
              description: 'Maximum allowed leverage',
              minimum: 1,
              maximum: 50,
            },
            maxDailyLoss: {
              type: 'number',
              description: 'Maximum daily loss limit in USD',
              minimum: 100,
            },
            maxDrawdown: {
              type: 'number',
              description: 'Maximum drawdown percentage (0-1)',
              minimum: 0.01,
              maximum: 1,
            },
            maxConcentration: {
              type: 'number',
              description: 'Maximum position concentration percentage (0-1)',
              minimum: 0.01,
              maximum: 1,
            },
            varLimit: {
              type: 'number',
              description: 'Portfolio Value-at-Risk limit in USD',
              minimum: 100,
            },
            stopLossPercent: {
              type: 'number',
              description: 'Stop loss percentage (0-1)',
              minimum: 0.001,
              maximum: 0.5,
            },
            maxOrderValue: {
              type: 'number',
              description: 'Maximum order value in USD',
              minimum: 100,
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'risk_get_alerts',
        description: 'Get active risk management alerts',
        inputSchema: {
          type: 'object',
          properties: {
            includeResolved: {
              type: 'boolean',
              description: 'Include resolved alerts in results',
              default: false,
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'risk_resolve_alert',
        description: 'Mark a risk alert as resolved',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'Alert ID to resolve',
            },
          },
          required: ['alertId'],
          additionalProperties: false,
        },
      },
      {
        name: 'risk_perform_stress_test',
        description: 'Perform portfolio stress testing with custom scenarios',
        inputSchema: {
          type: 'object',
          properties: {
            scenarios: {
              type: 'array',
              description: 'Custom stress test scenarios',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  marketShock: {
                    type: 'number',
                    description: 'Market shock percentage (-1 to 1)',
                    minimum: -1,
                    maximum: 1,
                  },
                },
                required: ['name', 'description', 'marketShock'],
              },
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'risk_get_statistics',
        description: 'Get risk management system statistics and performance metrics',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'risk_engine_control',
        description: 'Start, stop, or check status of the risk management engine',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['start', 'stop', 'status'],
              description: 'Control action',
            },
          },
          required: ['action'],
          additionalProperties: false,
        },
      },
    ];
  }

  async handleToolCall(name: string, args: unknown): Promise<CallToolResult> {
    try {
      logger.info('Handling risk management tool call', { tool: name, args });

      switch (name) {
        case 'risk_check_order':
          return await this.checkOrderRisk(args);

        case 'risk_get_portfolio_analysis':
          return await this.getPortfolioAnalysis(args);

        case 'risk_get_limits':
          return await this.getRiskLimits();

        case 'risk_update_limits':
          return await this.updateRiskLimits(args);

        case 'risk_get_alerts':
          return await this.getRiskAlerts(args);

        case 'risk_resolve_alert':
          return await this.resolveAlert(args);

        case 'risk_perform_stress_test':
          return await this.performStressTest(args);

        case 'risk_get_statistics':
          return await this.getRiskStatistics();

        case 'risk_engine_control':
          return await this.engineControl(args);

        default:
          throw new Error(`Unknown risk management tool: ${name}`);
      }
    } catch (error) {
      logger.error('Risk management tool call failed', { tool: name, error });

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

  private async checkOrderRisk(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      symbol: z.string(),
      side: z.enum(['buy', 'sell']),
      quantity: z.number().min(0.0001),
      price: z.number().min(0.0001).optional(),
    });

    const parsed = schema.parse(args);

    try {
      const riskCheck = await this.riskEngine.checkOrderRisk(
        parsed.symbol,
        parsed.side,
        parsed.quantity,
        parsed.price
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'order_risk_check',
                order: {
                  symbol: parsed.symbol,
                  side: parsed.side,
                  quantity: parsed.quantity,
                  price: parsed.price,
                },
                approved: riskCheck.approved,
                warnings: riskCheck.warnings,
                rejectionReasons: riskCheck.rejectionReasons,
                riskMetrics: {
                  newPortfolioVar: `$${riskCheck.riskMetrics.newPortfolioVar.toFixed(2)}`,
                  concentrationImpact: `${(riskCheck.riskMetrics.concentrationImpact * 100).toFixed(2)}%`,
                  leverageImpact: `${(riskCheck.riskMetrics.leverageImpact * 100).toFixed(2)}%`,
                  liquidationRisk: `${(riskCheck.riskMetrics.liquidationRisk * 100).toFixed(2)}%`,
                },
                recommendation: riskCheck.approved
                  ? 'Order can proceed with noted warnings'
                  : 'Order should be rejected or modified',
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
                action: 'order_risk_check',
                error: error instanceof Error ? error.message : 'Unknown error',
                order: {
                  symbol: parsed.symbol,
                  side: parsed.side,
                  quantity: parsed.quantity,
                },
                approved: false,
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

  private async getPortfolioAnalysis(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      userAddress: z.string().optional(),
    });

    const parsed = schema.parse(args);

    try {
      const portfolioRisk = await this.riskEngine.calculatePortfolioRisk(parsed.userAddress);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'portfolio_risk_analysis',
                portfolio: {
                  totalValue: `$${portfolioRisk.totalValue.toFixed(2)}`,
                  totalRisk: `$${portfolioRisk.totalRisk.toFixed(2)}`,
                  riskMetrics: {
                    portfolioVar95: `$${portfolioRisk.portfolioVar95.toFixed(2)}`,
                    portfolioVar99: `$${portfolioRisk.portfolioVar99.toFixed(2)}`,
                    maxDrawdown: `${(portfolioRisk.maxDrawdown * 100).toFixed(2)}%`,
                    sharpeRatio: portfolioRisk.sharpeRatio.toFixed(3),
                    sortino: portfolioRisk.sortino.toFixed(3),
                  },
                  positions: portfolioRisk.positions.map((pos) => ({
                    symbol: pos.symbol,
                    size: pos.size,
                    currentPrice: `$${pos.currentPrice.toFixed(2)}`,
                    unrealizedPnl: `$${pos.unrealizedPnl.toFixed(2)}`,
                    riskScore: `${pos.riskScore.toFixed(1)}/100`,
                    var95: `$${pos.var95.toFixed(2)}`,
                    concentration: `${((pos.concentration / portfolioRisk.totalValue) * 100).toFixed(2)}%`,
                  })),
                  stressTests: portfolioRisk.stressTestResults.map((test) => ({
                    scenario: test.scenario,
                    description: test.description,
                    impact: `$${test.portfolioImpact.toFixed(2)} (${test.impactPercent.toFixed(2)}%)`,
                  })),
                },
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
                action: 'portfolio_risk_analysis',
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

  private async getRiskLimits(): Promise<CallToolResult> {
    try {
      const limits = this.riskEngine.getRiskLimits();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_risk_limits',
                limits: {
                  maxPositionSize: `$${limits.maxPositionSize}`,
                  maxLeverage: `${limits.maxLeverage}x`,
                  maxDailyLoss: `$${limits.maxDailyLoss}`,
                  maxDrawdown: `${(limits.maxDrawdown * 100).toFixed(2)}%`,
                  maxConcentration: `${(limits.maxConcentration * 100).toFixed(2)}%`,
                  varLimit: `$${limits.varLimit}`,
                  stopLossPercent: `${(limits.stopLossPercent * 100).toFixed(2)}%`,
                  maxOrderValue: `$${limits.maxOrderValue}`,
                },
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
                action: 'get_risk_limits',
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

  private async updateRiskLimits(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      maxPositionSize: z.number().min(1000).optional(),
      maxLeverage: z.number().min(1).max(50).optional(),
      maxDailyLoss: z.number().min(100).optional(),
      maxDrawdown: z.number().min(0.01).max(1).optional(),
      maxConcentration: z.number().min(0.01).max(1).optional(),
      varLimit: z.number().min(100).optional(),
      stopLossPercent: z.number().min(0.001).max(0.5).optional(),
      maxOrderValue: z.number().min(100).optional(),
    });

    const parsed = schema.parse(args);

    try {
      this.riskEngine.updateRiskLimits(parsed);
      const updatedLimits = this.riskEngine.getRiskLimits();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'update_risk_limits',
                success: true,
                updatedLimits: {
                  maxPositionSize: `$${updatedLimits.maxPositionSize}`,
                  maxLeverage: `${updatedLimits.maxLeverage}x`,
                  maxDailyLoss: `$${updatedLimits.maxDailyLoss}`,
                  maxDrawdown: `${(updatedLimits.maxDrawdown * 100).toFixed(2)}%`,
                  maxConcentration: `${(updatedLimits.maxConcentration * 100).toFixed(2)}%`,
                  varLimit: `$${updatedLimits.varLimit}`,
                  stopLossPercent: `${(updatedLimits.stopLossPercent * 100).toFixed(2)}%`,
                  maxOrderValue: `$${updatedLimits.maxOrderValue}`,
                },
                changes: parsed,
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
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to update limits: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  private async getRiskAlerts(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      includeResolved: z.boolean().default(false),
    });

    const parsed = schema.parse(args);

    try {
      const alerts = parsed.includeResolved
        ? this.riskEngine.getAllAlerts()
        : this.riskEngine.getActiveAlerts();
      const statistics = this.riskEngine.getRiskStatistics();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_risk_alerts',
                alerts: alerts.map((alert) => ({
                  id: alert.id,
                  type: alert.type,
                  severity: alert.severity,
                  message: alert.message,
                  symbol: alert.symbol,
                  currentValue: alert.currentValue,
                  limit: alert.limit,
                  timestamp: alert.timestamp,
                  resolved: alert.resolved,
                })),
                statistics: {
                  totalActiveAlerts: statistics.activeAlerts,
                  totalAlerts: statistics.totalAlerts,
                  byType: statistics.alertsByType,
                  bySeverity: statistics.alertsBySeverity,
                },
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
                action: 'get_risk_alerts',
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

  private async resolveAlert(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      alertId: z.string(),
    });

    const parsed = schema.parse(args);

    try {
      const resolved = this.riskEngine.resolveAlert(parsed.alertId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'resolve_alert',
                alertId: parsed.alertId,
                resolved,
                message: resolved
                  ? 'Alert resolved successfully'
                  : 'Alert not found or already resolved',
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
                action: 'resolve_alert',
                alertId: parsed.alertId,
                error: error instanceof Error ? error.message : 'Unknown error',
                resolved: false,
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

  private async performStressTest(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      scenarios: z
        .array(
          z.object({
            name: z.string(),
            description: z.string(),
            marketShock: z.number().min(-1).max(1),
          })
        )
        .optional(),
    });

    const parsed = schema.parse(args);

    try {
      const portfolioRisk = await this.riskEngine.calculatePortfolioRisk();

      // Use provided scenarios or default ones
      const scenarios = parsed.scenarios || [
        { name: 'Market Crash', description: '30% market decline', marketShock: -0.3 },
        { name: 'Flash Crash', description: '15% rapid decline', marketShock: -0.15 },
        { name: 'Bull Run', description: '25% market surge', marketShock: 0.25 },
      ];

      const customResults = scenarios.map((scenario) => {
        const portfolioImpact = portfolioRisk.positions.reduce((total, position) => {
          const positionValue = Math.abs(position.size * position.currentPrice);
          return total + positionValue * scenario.marketShock;
        }, 0);

        const impactPercent = (portfolioImpact / portfolioRisk.totalValue) * 100;

        return {
          scenario: scenario.name,
          description: scenario.description,
          marketShock: `${(scenario.marketShock * 100).toFixed(1)}%`,
          portfolioImpact: portfolioImpact,
          portfolioImpactFormatted: `$${portfolioImpact.toFixed(2)}`,
          impactPercent: `${impactPercent.toFixed(2)}%`,
          newPortfolioValue: `$${(portfolioRisk.totalValue + portfolioImpact).toFixed(2)}`,
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'portfolio_stress_test',
                currentPortfolioValue: `$${portfolioRisk.totalValue.toFixed(2)}`,
                results: customResults,
                scenarios: customResults,
                standardStressTests: portfolioRisk.stressTestResults.map((test) => ({
                  scenario: test.scenario,
                  description: test.description,
                  impact: `$${test.portfolioImpact.toFixed(2)} (${test.impactPercent.toFixed(2)}%)`,
                })),
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
        isError: true,
        content: [
          {
            type: 'text',
            text: `Stress test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  private async getRiskStatistics(): Promise<CallToolResult> {
    try {
      const statistics = this.riskEngine.getRiskStatistics();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_risk_statistics',
                statistics: {
                  totalAlerts: statistics.totalAlerts,
                  activeAlerts: statistics.activeAlerts,
                  resolvedAlerts: statistics.resolvedAlerts,
                  resolutionRate:
                    statistics.totalAlerts > 0
                      ? `${((statistics.resolvedAlerts / statistics.totalAlerts) * 100).toFixed(1)}%`
                      : 'N/A',
                  portfolioHealth: 'good',
                  alertsByType: statistics.alertsByType,
                  alertsBySeverity: statistics.alertsBySeverity,
                },
                systemStatus: 'operational',
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
                action: 'get_risk_statistics',
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

  private async engineControl(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      action: z.enum(['start', 'stop', 'status']),
    });

    const parsed = schema.parse(args);

    try {
      let result: any = {};

      switch (parsed.action) {
        case 'start':
          await this.riskEngine.start();
          result = {
            status: 'started',
            success: true,
            message: 'Risk management engine is now monitoring portfolio',
          };
          break;
        case 'stop':
          await this.riskEngine.stop();
          result = {
            status: 'stopped',
            success: true,
            message: 'Risk management engine monitoring paused',
          };
          break;
        case 'status': {
          const activeAlerts = this.riskEngine.getActiveAlerts();
          result = {
            status: {
              isActive: true,
              activeAlerts: activeAlerts.length,
              criticalAlerts: activeAlerts.filter((a) => a.severity === 'critical').length,
            },
            success: true,
          };
          break;
        }
      }

      const response: any = {
        action: 'risk_engine_control',
        engineAction: parsed.action,
        command: parsed.action,
        timestamp: new Date().toISOString(),
      };

      if (parsed.action === 'status') {
        response.status = result.status;
      } else {
        response.success = result.success;
        response.result = result;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Engine control failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}
