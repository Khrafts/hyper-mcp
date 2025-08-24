import { MarketIntelligenceTools } from '../../src/tools/MarketIntelligenceTools.js';
import { SimpleHyperLiquidAdapter } from '../../src/adapters/hyperliquid/SimpleHyperLiquidAdapter.js';
import { MarketIntelligence } from '../../src/analytics/MarketIntelligence.js';

jest.mock('../../src/analytics/MarketIntelligence.js', () => ({
  MarketIntelligence: jest.fn().mockImplementation(() => ({
    generateMarketReport: jest.fn(),
    analyzePortfolio: jest.fn(),
    getMarketSentiment: jest.fn(),
  })),
}));

jest.mock('../../src/utils/logger.js', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('MarketIntelligenceTools', () => {
  let tools: MarketIntelligenceTools;
  let mockAdapter: SimpleHyperLiquidAdapter;
  let mockMarketIntelligence: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = {} as SimpleHyperLiquidAdapter;
    tools = new MarketIntelligenceTools(mockAdapter);
    mockMarketIntelligence = (MarketIntelligence as unknown as jest.Mock).mock.results[0]?.value;
  });

  describe('getToolDefinitions', () => {
    it('should return all tool definitions', () => {
      const definitions = tools.getToolDefinitions();

      expect(definitions).toHaveLength(3);
      expect(definitions[0]?.name).toBe('market_intelligence_report');
      expect(definitions[1]?.name).toBe('market_intelligence_portfolio_analysis');
      expect(definitions[2]?.name).toBe('market_intelligence_sentiment');
    });

    it('should have correct schema for market_intelligence_report', () => {
      const definitions = tools.getToolDefinitions();
      const reportTool = definitions[0]!;

      expect(reportTool.inputSchema.type).toBe('object');
      expect(reportTool.inputSchema.properties.symbol).toBeDefined();
      expect(reportTool.inputSchema.required).toContain('symbol');
    });

    it('should have correct schema for portfolio_analysis', () => {
      const definitions = tools.getToolDefinitions();
      const portfolioTool = definitions[1]!;

      expect(portfolioTool.inputSchema.type).toBe('object');
      expect(portfolioTool.inputSchema.properties.address).toBeDefined();
      expect(portfolioTool.inputSchema.required).toBeUndefined();
    });

    it('should have correct schema for market_sentiment', () => {
      const definitions = tools.getToolDefinitions();
      const sentimentTool = definitions[2]!;

      expect(sentimentTool.inputSchema.type).toBe('object');
      expect(sentimentTool.inputSchema.properties.symbols).toBeDefined();
      expect((sentimentTool.inputSchema.properties.symbols as any).type).toBe('array');
      expect(sentimentTool.inputSchema.required).toContain('symbols');
    });
  });

  describe('handleToolCall', () => {
    describe('market_intelligence_report', () => {
      const mockReport = {
        currentPrice: 50000,
        priceChangePercent24h: 5.5,
        overallTrend: 'bullish',
        riskLevel: 'medium',
        recommendation: {
          action: 'BUY',
          confidence: 75,
          reasoning: ['Strong momentum', 'Good support levels'],
        },
        analysis: {
          rsi: { value: 65, signal: 'neutral' },
          macd: { trend: 'bullish' },
          bollingerBands: { position: 'upper' },
          volatility: 0.025,
        },
        signals: ['Breaking resistance', 'Volume surge'],
      };

      beforeEach(() => {
        mockMarketIntelligence.generateMarketReport.mockResolvedValue(mockReport);
      });

      it('should generate market report successfully', async () => {
        const result = await tools.handleToolCall('market_intelligence_report', {
          symbol: 'BTC',
        });

        expect(mockMarketIntelligence.generateMarketReport).toHaveBeenCalledWith('BTC');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('market_intelligence_report');
        expect(content.symbol).toBe('BTC');
        expect(content.report.summary.current_price).toBe(50000);
        expect(content.report.summary.price_change_24h).toBe('5.50%');
        expect(content.report.summary.overall_trend).toBe('bullish');
      });

      it('should handle errors in market report generation', async () => {
        const error = new Error('API error');
        mockMarketIntelligence.generateMarketReport.mockRejectedValue(error);

        const result = await tools.handleToolCall('market_intelligence_report', {
          symbol: 'BTC',
        });

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('API error');
      });

      it('should validate input schema', async () => {
        const result = await tools.handleToolCall('market_intelligence_report', {});

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });
    });

    describe('market_intelligence_portfolio_analysis', () => {
      const mockAnalysis = {
        totalValue: 100000,
        unrealizedPnl: 5000,
        realizedPnl: 2000,
        positions: [
          { symbol: 'BTC', pnlPercent: 10 },
          { symbol: 'ETH', pnlPercent: -5 },
          { symbol: 'SOL', pnlPercent: 15 },
        ],
        riskMetrics: {
          totalRisk: 0.15,
          maxDrawdown: 12.5,
          concentration: {
            BTC: 40,
            ETH: 30,
            SOL: 20,
            OTHER: 10,
          },
        },
        recommendations: ['Diversify portfolio', 'Take profits on SOL'],
      };

      beforeEach(() => {
        mockMarketIntelligence.analyzePortfolio.mockResolvedValue(mockAnalysis);
      });

      it('should analyze portfolio successfully', async () => {
        const result = await tools.handleToolCall('market_intelligence_portfolio_analysis', {
          address: '0x123',
        });

        expect(mockMarketIntelligence.analyzePortfolio).toHaveBeenCalledWith('0x123');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('portfolio_analysis');
        expect(content.address).toBe('0x123');
        expect(content.portfolio.summary.total_value).toBe(100000);
        expect(content.portfolio.summary.unrealized_pnl).toBe(5000);
      });

      it('should analyze portfolio with default address', async () => {
        const result = await tools.handleToolCall('market_intelligence_portfolio_analysis', {});

        expect(mockMarketIntelligence.analyzePortfolio).toHaveBeenCalledWith(undefined);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.address).toBe('default');
      });

      it('should handle portfolio analysis errors', async () => {
        const error = new Error('Portfolio not found');
        mockMarketIntelligence.analyzePortfolio.mockRejectedValue(error);

        const result = await tools.handleToolCall('market_intelligence_portfolio_analysis', {});

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Portfolio not found');
      });

      it('should include top performers in portfolio analysis', async () => {
        const result = await tools.handleToolCall('market_intelligence_portfolio_analysis', {});

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.portfolio.top_performers).toHaveLength(3);
        expect(content.portfolio.top_performers[0]).toBe('SOL: 15.00%');
        expect(content.portfolio.top_performers[1]).toBe('BTC: 10.00%');
      });
    });

    describe('market_intelligence_sentiment', () => {
      const mockSentiment = {
        overall: 'bullish',
        bySymbol: {
          BTC: { sentiment: 'bullish', confidence: 80 },
          ETH: { sentiment: 'neutral', confidence: 60 },
          SOL: { sentiment: 'bearish', confidence: 70 },
        },
        insights: ['Market showing strength', 'Caution on altcoins'],
      };

      beforeEach(() => {
        mockMarketIntelligence.getMarketSentiment.mockResolvedValue(mockSentiment);
      });

      it('should get market sentiment successfully', async () => {
        const result = await tools.handleToolCall('market_intelligence_sentiment', {
          symbols: ['BTC', 'ETH', 'SOL'],
        });

        expect(mockMarketIntelligence.getMarketSentiment).toHaveBeenCalledWith([
          'BTC',
          'ETH',
          'SOL',
        ]);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('market_sentiment_analysis');
        expect(content.symbols).toEqual(['BTC', 'ETH', 'SOL']);
        expect(content.sentiment.summary.overall_sentiment).toBe('bullish');
        expect(content.sentiment.summary.bullish_count).toBe(1);
        expect(content.sentiment.summary.bearish_count).toBe(1);
        expect(content.sentiment.summary.neutral_count).toBe(1);
      });

      it('should validate minimum symbols', async () => {
        const result = await tools.handleToolCall('market_intelligence_sentiment', {
          symbols: [],
        });

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });

      it('should validate maximum symbols', async () => {
        const symbols = Array(11).fill('BTC');
        const result = await tools.handleToolCall('market_intelligence_sentiment', {
          symbols,
        });

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });

      it('should handle sentiment analysis errors', async () => {
        const error = new Error('Sentiment service unavailable');
        mockMarketIntelligence.getMarketSentiment.mockRejectedValue(error);

        const result = await tools.handleToolCall('market_intelligence_sentiment', {
          symbols: ['BTC'],
        });

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Sentiment service unavailable');
      });

      it('should format sentiment by symbol correctly', async () => {
        const result = await tools.handleToolCall('market_intelligence_sentiment', {
          symbols: ['BTC', 'ETH', 'SOL'],
        });

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.sentiment.by_symbol).toHaveLength(3);
        expect(content.sentiment.by_symbol[0]).toEqual({
          symbol: 'BTC',
          sentiment: 'bullish',
          confidence: '80%',
        });
      });
    });

    describe('error handling', () => {
      it('should handle unknown tool names', async () => {
        const result = await tools.handleToolCall('unknown_tool', {});

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Unknown market intelligence tool');
      });

      it('should handle invalid arguments gracefully', async () => {
        const result = await tools.handleToolCall('market_intelligence_report', null);

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });

      it('should handle non-Error exceptions', async () => {
        mockMarketIntelligence.generateMarketReport.mockRejectedValue('string error');

        const result = await tools.handleToolCall('market_intelligence_report', {
          symbol: 'BTC',
        });

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Unknown error');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty portfolio positions', async () => {
      const mockAnalysis = {
        totalValue: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        positions: [],
        riskMetrics: {
          totalRisk: 0,
          maxDrawdown: 0,
          concentration: {},
        },
        recommendations: [],
      };

      mockMarketIntelligence.analyzePortfolio.mockResolvedValue(mockAnalysis);

      const result = await tools.handleToolCall('market_intelligence_portfolio_analysis', {});

      const content = JSON.parse((result.content[0] as any).text);
      expect(content.portfolio.top_performers).toEqual([]);
      expect(content.portfolio.risk_summary.top_concentration).toEqual([]);
    });

    it('should handle NaN values in calculations', async () => {
      const mockAnalysis = {
        totalValue: 0,
        unrealizedPnl: 100,
        realizedPnl: 0,
        positions: [],
        riskMetrics: {
          totalRisk: 0,
          maxDrawdown: 0,
          concentration: {},
        },
        recommendations: [],
      };

      mockMarketIntelligence.analyzePortfolio.mockResolvedValue(mockAnalysis);

      const result = await tools.handleToolCall('market_intelligence_portfolio_analysis', {});

      const content = JSON.parse((result.content[0] as any).text);
      expect(content.portfolio.summary.overall_pnl_percent).toBe('Infinity%');
    });

    it('should handle very large numbers', async () => {
      const mockReport = {
        currentPrice: 1e10,
        priceChangePercent24h: 999.99,
        overallTrend: 'bullish',
        riskLevel: 'extreme',
        recommendation: {
          action: 'WAIT',
          confidence: 100,
          reasoning: ['Extreme volatility'],
        },
        analysis: {
          rsi: { value: 100, signal: 'overbought' },
          macd: { trend: 'bullish' },
          bollingerBands: { position: 'above' },
          volatility: 1,
        },
        signals: [],
      };

      mockMarketIntelligence.generateMarketReport.mockResolvedValue(mockReport);

      const result = await tools.handleToolCall('market_intelligence_report', {
        symbol: 'MEME',
      });

      const content = JSON.parse((result.content[0] as any).text);
      expect(content.report.summary.current_price).toBe(1e10);
      expect(content.report.technical_analysis.volatility).toBe('100.00%');
    });
  });
});
