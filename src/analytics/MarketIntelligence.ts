import { TechnicalIndicators, CandleData } from './TechnicalIndicators.js';
import { SimpleHyperLiquidAdapter } from '../adapters/hyperliquid/SimpleHyperLiquidAdapter.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('MARKET_INTELLIGENCE');

export interface MarketIntelligenceConfig {
  rsiPeriod: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  bbPeriod: number;
  bbStdDev: number;
  maPeriods: number[];
  volatilityPeriod: number;
}

export interface MarketReport {
  symbol: string;
  timestamp: number;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  analysis: {
    rsi: {
      value: number;
      signal: 'oversold' | 'overbought' | 'neutral';
    };
    macd: {
      macd: number;
      signal: number;
      histogram: number;
      trend: 'bullish' | 'bearish' | 'neutral';
    };
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
      position: string;
    };
    movingAverages: Array<{
      period: number;
      sma: number;
      ema: number;
      trend: string;
    }>;
    volatility: number;
  };
  overallTrend: 'bullish' | 'bearish' | 'neutral';
  signals: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: {
    action: 'buy' | 'sell' | 'hold' | 'watch';
    confidence: number;
    reasoning: string[];
  };
}

export interface PortfolioAnalysis {
  totalValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  positions: Array<{
    symbol: string;
    size: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnl: number;
    pnlPercent: number;
  }>;
  riskMetrics: {
    totalRisk: number;
    concentration: Record<string, number>;
    maxDrawdown: number;
    sharpeRatio?: number;
  };
  recommendations: string[];
}

export class MarketIntelligence {
  private adapter: SimpleHyperLiquidAdapter;
  private config: MarketIntelligenceConfig;

  constructor(adapter: SimpleHyperLiquidAdapter, config?: Partial<MarketIntelligenceConfig>) {
    this.adapter = adapter;
    this.config = {
      rsiPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bbPeriod: 20,
      bbStdDev: 2,
      maPeriods: [5, 10, 20, 50, 200],
      volatilityPeriod: 20,
      ...config,
    };

    logger.info('MarketIntelligence initialized', { config: this.config });
  }

  /**
   * Generate comprehensive market report for a symbol
   */
  async generateMarketReport(symbol: string): Promise<MarketReport> {
    try {
      // Get current price and recent candles
      const [currentPrices, candleData] = await Promise.all([
        this.adapter.getAllMids(),
        this.adapter.getCandles(symbol, '1h'),
      ]);

      if (!currentPrices[symbol]) {
        throw new Error(`Price data not available for ${symbol}`);
      }

      const currentPrice = parseFloat(currentPrices[symbol]);

      // Parse candle data - structure depends on HyperLiquid API response
      const candles = this.parseCandleData(candleData);

      if (candles.length < 50) {
        throw new Error(
          `Insufficient historical data for ${symbol}. Need at least 50 candles, got ${candles.length}`
        );
      }

      // Calculate 24h price change
      const price24hAgo =
        candles[candles.length - 24]?.close || candles[candles.length - 1]?.close || currentPrice;
      const priceChange24h = currentPrice - price24hAgo;
      const priceChangePercent24h = (priceChange24h / price24hAgo) * 100;

      // Perform comprehensive analysis
      const analysis = TechnicalIndicators.analyzeMarket(candles);

      const marketReport: MarketReport = {
        symbol,
        timestamp: Date.now(),
        currentPrice,
        priceChange24h,
        priceChangePercent24h,
        analysis: {
          rsi: {
            value: analysis.rsi[analysis.rsi.length - 1]?.value || 0,
            signal: analysis.rsi[analysis.rsi.length - 1]?.signal || 'neutral',
          },
          macd: {
            macd: analysis.macd[analysis.macd.length - 1]?.macd || 0,
            signal: analysis.macd[analysis.macd.length - 1]?.signal || 0,
            histogram: analysis.macd[analysis.macd.length - 1]?.histogram || 0,
            trend: analysis.macd[analysis.macd.length - 1]?.trend || 'neutral',
          },
          bollingerBands: {
            upper: analysis.bollingerBands[analysis.bollingerBands.length - 1]?.upper || 0,
            middle: analysis.bollingerBands[analysis.bollingerBands.length - 1]?.middle || 0,
            lower: analysis.bollingerBands[analysis.bollingerBands.length - 1]?.lower || 0,
            position:
              analysis.bollingerBands[analysis.bollingerBands.length - 1]?.position || 'between',
          },
          movingAverages: analysis.movingAverages.map((ma: any) => ({
            period: ma.value,
            sma: ma.sma,
            ema: ma.ema,
            trend: ma.trend,
          })),
          volatility: analysis.volatility,
        },
        overallTrend: analysis.trend,
        signals: analysis.signals,
        riskLevel: this.calculateRiskLevel(
          analysis.volatility,
          analysis.rsi[analysis.rsi.length - 1]?.value || 50
        ),
        recommendation: this.generateRecommendation(analysis, currentPrice, priceChangePercent24h),
      };

      logger.info('Market report generated', {
        symbol,
        trend: marketReport.overallTrend,
        riskLevel: marketReport.riskLevel,
        signalCount: marketReport.signals.length,
      });

      return marketReport;
    } catch (error) {
      logger.error('Failed to generate market report', { symbol, error });
      throw error;
    }
  }

  /**
   * Analyze portfolio performance and risk
   */
  async analyzePortfolio(userAddress?: string): Promise<PortfolioAnalysis> {
    try {
      const accountState = await this.adapter.getAccountState(userAddress);

      // Parse account state - structure depends on HyperLiquid API response
      const portfolioData = this.parseAccountState(accountState);

      if (!portfolioData) {
        throw new Error('Unable to parse portfolio data');
      }

      const analysis: PortfolioAnalysis = {
        totalValue: portfolioData.totalValue,
        unrealizedPnl: portfolioData.unrealizedPnl,
        realizedPnl: portfolioData.realizedPnl,
        positions: portfolioData.positions,
        riskMetrics: {
          totalRisk: this.calculatePortfolioRisk(portfolioData.positions),
          concentration: this.calculateConcentration(portfolioData.positions),
          maxDrawdown: this.calculateMaxDrawdown(portfolioData.positions),
        },
        recommendations: this.generatePortfolioRecommendations(portfolioData),
      };

      logger.info('Portfolio analysis completed', {
        totalValue: analysis.totalValue,
        positionCount: analysis.positions.length,
        totalRisk: analysis.riskMetrics.totalRisk,
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze portfolio', { error });
      throw error;
    }
  }

  /**
   * Get market sentiment analysis
   */
  async getMarketSentiment(symbols: string[]): Promise<{
    overall: 'bullish' | 'bearish' | 'neutral';
    bySymbol: Record<
      string,
      {
        sentiment: 'bullish' | 'bearish' | 'neutral';
        confidence: number;
      }
    >;
    insights: string[];
  }> {
    try {
      const reports = await Promise.all(
        symbols.map((symbol) =>
          this.generateMarketReport(symbol).catch((error) => {
            logger.warn('Failed to get report for symbol', { symbol, error });
            return null;
          })
        )
      );

      const validReports = reports.filter((r) => r !== null) as MarketReport[];

      const sentiments = validReports.map((r) => r.overallTrend);
      const bullishCount = sentiments.filter((s) => s === 'bullish').length;
      const bearishCount = sentiments.filter((s) => s === 'bearish').length;

      let overall: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (bullishCount > bearishCount && bullishCount > sentiments.length * 0.6) {
        overall = 'bullish';
      } else if (bearishCount > bullishCount && bearishCount > sentiments.length * 0.6) {
        overall = 'bearish';
      }

      const bySymbol: Record<
        string,
        { sentiment: 'bullish' | 'bearish' | 'neutral'; confidence: number }
      > = {};
      validReports.forEach((report) => {
        bySymbol[report.symbol] = {
          sentiment: report.overallTrend,
          confidence: report.recommendation.confidence,
        };
      });

      const insights: string[] = [
        `Analyzed ${validReports.length} symbols`,
        `${bullishCount} bullish, ${bearishCount} bearish, ${sentiments.length - bullishCount - bearishCount} neutral`,
        `Overall market sentiment: ${overall}`,
      ];

      return { overall, bySymbol, insights };
    } catch (error) {
      logger.error('Failed to get market sentiment', { error });
      throw error;
    }
  }

  private parseCandleData(candleData: unknown): CandleData[] {
    // Parse actual HyperLiquid API candle response format
    if (!Array.isArray(candleData)) {
      logger.error('Invalid candle data format - expected array', {
        type: typeof candleData,
        isArray: Array.isArray(candleData),
      });
      throw new Error('Invalid candle data format from HyperLiquid API');
    }

    if (candleData.length === 0) {
      logger.warn('Empty candle data received from API');
      return [];
    }

    try {
      // HyperLiquid candle format: { T, c, h, i, l, n, o, s, t, v }
      return candleData
        .map((candle: any, index: number) => {
          if (!candle || typeof candle !== 'object') {
            throw new Error(`Invalid candle object at index ${index}`);
          }

          const parsed = {
            timestamp: parseInt(candle.T) || parseInt(candle.t) || Date.now(),
            open: parseFloat(candle.o) || 0,
            high: parseFloat(candle.h) || 0,
            low: parseFloat(candle.l) || 0,
            close: parseFloat(candle.c) || 0,
            volume: parseFloat(candle.v) || 0,
          };

          // Validate parsed candle data
          if (parsed.high < parsed.low || parsed.open <= 0 || parsed.close <= 0) {
            logger.warn('Invalid candle price data detected', {
              index,
              candle: parsed,
              symbol: candle.s,
            });
          }

          return parsed;
        })
        .filter((candle) => candle.open > 0 && candle.close > 0); // Filter out invalid candles
    } catch (error) {
      logger.error('Failed to parse candle data from HyperLiquid API', { error });
      throw new Error(
        `Candle data parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private parseAccountState(accountState: unknown): any {
    // Parse actual HyperLiquid account state response format
    if (!accountState || typeof accountState !== 'object') {
      logger.error('Invalid account state format', {
        type: typeof accountState,
        isNull: accountState === null,
      });
      throw new Error('Invalid account state data from HyperLiquid API');
    }

    const state = accountState as any;

    // Handle different possible response formats
    let clearinghouseState;
    if (Array.isArray(state) && state.length > 0) {
      // Subaccount array format
      clearinghouseState = state[0]?.clearinghouseState;
    } else if (state.clearinghouseState) {
      // Direct clearinghouse state
      clearinghouseState = state.clearinghouseState;
    } else {
      // Already in clearinghouse format
      clearinghouseState = state;
    }

    if (!clearinghouseState) {
      logger.error('Missing clearinghouse state in account data');
      throw new Error('Missing clearinghouse state in HyperLiquid account response');
    }

    try {
      const marginSummary = clearinghouseState.marginSummary || {};
      const assetPositions = clearinghouseState.assetPositions || [];

      // Calculate total portfolio value
      const totalValue = parseFloat(marginSummary.accountValue || '0');
      const totalRawUsd = parseFloat(marginSummary.totalRawUsd || '0');
      const withdrawable = parseFloat(clearinghouseState.withdrawable || '0');

      // Parse positions
      const positions = assetPositions
        .map((position: any, index: number) => {
          const symbol = position.coin || position.symbol || `UNKNOWN_${index}`;
          const positionSize = parseFloat(position.szi || position.size || '0');
          const entryPrice = parseFloat(position.entryPx || position.entryPrice || '0');
          const unrealizedPnl = parseFloat(position.unrealizedPnl || '0');

          // Calculate current price from unrealized PnL if available
          let currentPrice = entryPrice;
          if (positionSize !== 0 && unrealizedPnl !== 0) {
            currentPrice = entryPrice + unrealizedPnl / positionSize;
          }

          const pnlPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

          return {
            symbol,
            size: positionSize,
            entryPrice,
            currentPrice,
            unrealizedPnl,
            pnlPercent,
            marginUsed: parseFloat(position.marginUsed || '0'),
            maxTradeSzs: position.maxTradeSzs || [],
          };
        })
        .filter((pos: any) => pos.size !== 0); // Filter out zero positions

      // Calculate total unrealized PnL
      const totalUnrealizedPnl = positions.reduce(
        (sum: number, pos: any) => sum + pos.unrealizedPnl,
        0
      );

      // Calculate realized PnL (not directly available, estimate from total value changes)
      const realizedPnl = totalValue - totalRawUsd - totalUnrealizedPnl;

      const portfolioData = {
        totalValue,
        unrealizedPnl: totalUnrealizedPnl,
        realizedPnl,
        withdrawable,
        marginUsed: parseFloat(marginSummary.totalMarginUsed || '0'),
        positions,
        raw: {
          marginSummary,
          assetPositions: positions.length,
          withdrawable,
        },
      };

      logger.info('Account state parsed successfully', {
        totalValue: portfolioData.totalValue,
        positionCount: portfolioData.positions.length,
        unrealizedPnl: portfolioData.unrealizedPnl,
      });

      return portfolioData;
    } catch (error) {
      logger.error('Failed to parse HyperLiquid account state', { error });
      throw new Error(
        `Account state parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private calculateRiskLevel(volatility: number, rsi: number): 'low' | 'medium' | 'high' {
    if (volatility > 0.8 || rsi > 80 || rsi < 20) return 'high';
    if (volatility > 0.4 || rsi > 70 || rsi < 30) return 'medium';
    return 'low';
  }

  private generateRecommendation(
    analysis: any,
    _currentPrice: number,
    priceChange24h: number
  ): {
    action: 'buy' | 'sell' | 'hold' | 'watch';
    confidence: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let score = 0;

    // RSI analysis
    if (analysis.rsi[analysis.rsi.length - 1].signal === 'oversold') {
      score += 2;
      reasoning.push('RSI indicates oversold conditions');
    } else if (analysis.rsi[analysis.rsi.length - 1].signal === 'overbought') {
      score -= 2;
      reasoning.push('RSI indicates overbought conditions');
    }

    // MACD analysis
    if (analysis.macd[analysis.macd.length - 1].trend === 'bullish') {
      score += 2;
      reasoning.push('MACD showing bullish momentum');
    } else if (analysis.macd[analysis.macd.length - 1].trend === 'bearish') {
      score -= 2;
      reasoning.push('MACD showing bearish momentum');
    }

    // Price trend
    if (priceChange24h > 2) {
      score += 1;
      reasoning.push('Strong 24h price performance');
    } else if (priceChange24h < -2) {
      score -= 1;
      reasoning.push('Weak 24h price performance');
    }

    let action: 'buy' | 'sell' | 'hold' | 'watch';
    let confidence: number;

    if (score >= 3) {
      action = 'buy';
      confidence = Math.min(Math.abs(score) * 20, 90);
    } else if (score <= -3) {
      action = 'sell';
      confidence = Math.min(Math.abs(score) * 20, 90);
    } else if (Math.abs(score) <= 1) {
      action = 'hold';
      confidence = 70;
    } else {
      action = 'watch';
      confidence = 60;
    }

    return { action, confidence, reasoning };
  }

  private calculatePortfolioRisk(positions: any[]): number {
    // Simple risk calculation based on position sizes and volatility
    return positions.reduce((risk, pos) => risk + Math.abs(pos.pnlPercent), 0) / positions.length;
  }

  private calculateConcentration(positions: any[]): Record<string, number> {
    const total = positions.reduce((sum, pos) => sum + Math.abs(pos.size * pos.currentPrice), 0);
    const concentration: Record<string, number> = {};

    positions.forEach((pos) => {
      const weight = (Math.abs(pos.size * pos.currentPrice) / total) * 100;
      concentration[pos.symbol] = weight;
    });

    return concentration;
  }

  private calculateMaxDrawdown(positions: any[]): number {
    // Simplified max drawdown calculation
    const losses = positions.filter((pos) => pos.unrealizedPnl < 0);
    if (losses.length === 0) return 0;

    return Math.abs(Math.min(...losses.map((pos) => pos.pnlPercent)));
  }

  private generatePortfolioRecommendations(portfolioData: any): string[] {
    const recommendations: string[] = [];

    if (portfolioData.positions.length === 1) {
      recommendations.push('Consider diversifying your portfolio across multiple assets');
    }

    const losingPositions = portfolioData.positions.filter((pos: any) => pos.unrealizedPnl < 0);
    if (losingPositions.length > portfolioData.positions.length * 0.7) {
      recommendations.push('High percentage of losing positions - consider risk management');
    }

    if (portfolioData.unrealizedPnl / portfolioData.totalValue < -0.1) {
      recommendations.push('Unrealized losses exceed 10% - consider position sizing review');
    }

    return recommendations;
  }
}
