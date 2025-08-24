import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MarketIntelligence } from '../analytics/MarketIntelligence.js';
import { SimpleHyperLiquidAdapter } from '../adapters/hyperliquid/SimpleHyperLiquidAdapter.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('MARKET_INTELLIGENCE_TOOLS');

export class MarketIntelligenceTools {
  private marketIntelligence: MarketIntelligence;

  constructor(adapter: SimpleHyperLiquidAdapter) {
    this.marketIntelligence = new MarketIntelligence(adapter);
  }

  getToolDefinitions() {
    return [
      {
        name: 'market_intelligence_report',
        description: 'Generate comprehensive market analysis report for a trading symbol',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Trading symbol to analyze (e.g., BTC, ETH)',
            },
          },
          required: ['symbol'],
          additionalProperties: false,
        },
      },
      {
        name: 'market_intelligence_portfolio_analysis',
        description: 'Analyze portfolio performance, risk metrics, and generate recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Optional wallet address. Uses default if not provided.',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'market_intelligence_sentiment',
        description: 'Get overall market sentiment analysis across multiple symbols',
        inputSchema: {
          type: 'object',
          properties: {
            symbols: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of trading symbols to analyze',
              minItems: 1,
              maxItems: 10,
            },
          },
          required: ['symbols'],
          additionalProperties: false,
        },
      },
    ];
  }

  async handleToolCall(name: string, args: unknown): Promise<CallToolResult> {
    try {
      logger.info('Handling market intelligence tool call', { tool: name, args });

      switch (name) {
        case 'market_intelligence_report':
          return await this.generateMarketReport(args);

        case 'market_intelligence_portfolio_analysis':
          return await this.analyzePortfolio(args);

        case 'market_intelligence_sentiment':
          return await this.getMarketSentiment(args);

        default:
          throw new Error(`Unknown market intelligence tool: ${name}`);
      }
    } catch (error) {
      logger.error('Market intelligence tool call failed', { tool: name, error });

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

  private async generateMarketReport(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      symbol: z.string(),
    });

    const parsed = schema.parse(args);

    try {
      const report = await this.marketIntelligence.generateMarketReport(parsed.symbol);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'market_intelligence_report',
                symbol: parsed.symbol,
                report: {
                  ...report,
                  summary: {
                    current_price: report.currentPrice,
                    price_change_24h: `${report.priceChangePercent24h.toFixed(2)}%`,
                    overall_trend: report.overallTrend,
                    risk_level: report.riskLevel,
                    recommendation: report.recommendation.action,
                    confidence: `${report.recommendation.confidence}%`,
                  },
                  technical_analysis: {
                    rsi: `${report.analysis.rsi.value.toFixed(2)} (${report.analysis.rsi.signal})`,
                    macd_trend: report.analysis.macd.trend,
                    bollinger_position: report.analysis.bollingerBands.position,
                    volatility: `${(report.analysis.volatility * 100).toFixed(2)}%`,
                  },
                  key_signals: report.signals,
                  reasoning: report.recommendation.reasoning,
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
                action: 'market_intelligence_report',
                symbol: parsed.symbol,
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

  private async analyzePortfolio(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      address: z.string().optional(),
    });

    const parsed = schema.parse(args);

    try {
      const analysis = await this.marketIntelligence.analyzePortfolio(parsed.address);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'portfolio_analysis',
                address: parsed.address || 'default',
                portfolio: {
                  ...analysis,
                  summary: {
                    total_value: analysis.totalValue,
                    unrealized_pnl: analysis.unrealizedPnl,
                    realized_pnl: analysis.realizedPnl,
                    total_positions: analysis.positions.length,
                    overall_pnl_percent:
                      ((analysis.unrealizedPnl / analysis.totalValue) * 100).toFixed(2) + '%',
                  },
                  risk_summary: {
                    total_risk: analysis.riskMetrics.totalRisk.toFixed(2),
                    max_drawdown: analysis.riskMetrics.maxDrawdown.toFixed(2) + '%',
                    top_concentration: Object.entries(analysis.riskMetrics.concentration)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([symbol, weight]) => `${symbol}: ${weight.toFixed(1)}%`),
                  },
                  top_performers: analysis.positions
                    .sort((a, b) => b.pnlPercent - a.pnlPercent)
                    .slice(0, 3)
                    .map((pos) => `${pos.symbol}: ${pos.pnlPercent.toFixed(2)}%`),
                  recommendations: analysis.recommendations,
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
                action: 'portfolio_analysis',
                address: parsed.address || 'default',
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

  private async getMarketSentiment(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      symbols: z.array(z.string()).min(1).max(10),
    });

    const parsed = schema.parse(args);

    try {
      const sentiment = await this.marketIntelligence.getMarketSentiment(parsed.symbols);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'market_sentiment_analysis',
                symbols: parsed.symbols,
                sentiment: {
                  ...sentiment,
                  summary: {
                    overall_sentiment: sentiment.overall,
                    symbols_analyzed: Object.keys(sentiment.bySymbol).length,
                    bullish_count: Object.values(sentiment.bySymbol).filter(
                      (s) => s.sentiment === 'bullish'
                    ).length,
                    bearish_count: Object.values(sentiment.bySymbol).filter(
                      (s) => s.sentiment === 'bearish'
                    ).length,
                    neutral_count: Object.values(sentiment.bySymbol).filter(
                      (s) => s.sentiment === 'neutral'
                    ).length,
                  },
                  by_symbol: Object.entries(sentiment.bySymbol).map(([symbol, data]) => ({
                    symbol,
                    sentiment: data.sentiment,
                    confidence: `${data.confidence}%`,
                  })),
                  market_insights: sentiment.insights,
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
                action: 'market_sentiment_analysis',
                symbols: parsed.symbols,
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
}
