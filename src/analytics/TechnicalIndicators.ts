import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('TECHNICAL_INDICATORS');

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  value: number;
  timestamp: number;
}

export interface RSIResult extends IndicatorResult {
  signal: 'oversold' | 'overbought' | 'neutral';
}

export interface MACDResult extends IndicatorResult {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface BollingerBandsResult extends IndicatorResult {
  upper: number;
  middle: number;
  lower: number;
  position: 'above_upper' | 'below_lower' | 'between' | 'on_upper' | 'on_lower';
}

export interface MovingAverageResult extends IndicatorResult {
  sma: number;
  ema: number;
  trend: 'up' | 'down' | 'sideways';
}

export class TechnicalIndicators {
  /**
   * Calculate Simple Moving Average (SMA)
   */
  static calculateSMA(prices: number[], period: number): number[] {
    if (prices.length < period) {
      throw new Error(`Not enough data points. Need at least ${period}, got ${prices.length}`);
    }

    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }

    return sma;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  static calculateEMA(prices: number[], period: number): number[] {
    if (prices.length < period) {
      throw new Error(`Not enough data points. Need at least ${period}, got ${prices.length}`);
    }

    const multiplier = 2 / (period + 1);
    const ema: number[] = [];

    // Start with SMA as the first EMA value
    const smaFirst = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(smaFirst);

    for (let i = period; i < prices.length; i++) {
      const emaValue = prices[i]! * multiplier + ema[ema.length - 1]! * (1 - multiplier);
      ema.push(emaValue);
    }

    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  static calculateRSI(prices: number[], period: number = 14): RSIResult[] {
    if (prices.length < period + 1) {
      throw new Error(`Not enough data points. Need at least ${period + 1}, got ${prices.length}`);
    }

    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i]! - prices[i - 1]!;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const rsiResults: RSIResult[] = [];

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      let signal: 'oversold' | 'overbought' | 'neutral' = 'neutral';
      if (rsi < 30) signal = 'oversold';
      else if (rsi > 70) signal = 'overbought';

      rsiResults.push({
        value: rsi,
        timestamp: Date.now() - (gains.length - i - 1) * 60000, // Approximate timestamp
        signal,
      });
    }

    return rsiResults;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  static calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): MACDResult[] {
    if (prices.length < slowPeriod) {
      throw new Error(`Not enough data points. Need at least ${slowPeriod}, got ${prices.length}`);
    }

    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    // Calculate MACD line
    const macdLine: number[] = [];
    const startIndex = slowPeriod - fastPeriod;

    for (let i = 0; i < slowEMA.length; i++) {
      const fastValue = fastEMA[i + startIndex];
      const slowValue = slowEMA[i];
      if (fastValue !== undefined && slowValue !== undefined) {
        const macdValue = fastValue - slowValue;
        macdLine.push(macdValue);
      }
    }

    // Calculate signal line (EMA of MACD line)
    const signalLine = this.calculateEMA(macdLine, signalPeriod);

    // Calculate histogram and results
    const macdResults: MACDResult[] = [];
    const histogramStartIndex = signalPeriod - 1;

    for (let i = 0; i < signalLine.length; i++) {
      const macdValue = macdLine[i + histogramStartIndex];
      const signalValue = signalLine[i];

      if (macdValue !== undefined && signalValue !== undefined) {
        const histogram = macdValue - signalValue;

        let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        if (macdValue > signalValue && histogram > 0) trend = 'bullish';
        else if (macdValue < signalValue && histogram < 0) trend = 'bearish';

        macdResults.push({
          value: macdValue,
          macd: macdValue,
          signal: signalValue,
          histogram,
          trend,
          timestamp: Date.now() - (signalLine.length - i - 1) * 60000,
        });
      }
    }

    return macdResults;
  }

  /**
   * Calculate Bollinger Bands
   */
  static calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
  ): BollingerBandsResult[] {
    if (prices.length < period) {
      throw new Error(`Not enough data points. Need at least ${period}, got ${prices.length}`);
    }

    const sma = this.calculateSMA(prices, period);
    const bollingerResults: BollingerBandsResult[] = [];

    for (let i = 0; i < sma.length; i++) {
      const priceWindow = prices.slice(i, i + period);
      const mean = sma[i];
      const currentPrice = prices[i + period - 1];

      if (mean !== undefined && currentPrice !== undefined) {
        // Calculate standard deviation
        const variance =
          priceWindow.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        const upper = mean + stdDevMultiplier * stdDev;
        const lower = mean - stdDevMultiplier * stdDev;

        let position: BollingerBandsResult['position'] = 'between';
        if (currentPrice > upper) position = 'above_upper';
        else if (currentPrice < lower) position = 'below_lower';
        else if (Math.abs(currentPrice - upper) < 0.001) position = 'on_upper';
        else if (Math.abs(currentPrice - lower) < 0.001) position = 'on_lower';

        bollingerResults.push({
          value: currentPrice,
          upper,
          middle: mean,
          lower,
          position,
          timestamp: Date.now() - (sma.length - i - 1) * 60000,
        });
      }
    }

    return bollingerResults;
  }

  /**
   * Calculate multiple moving averages with trend analysis
   */
  static calculateMovingAverages(
    prices: number[],
    periods: number[] = [5, 10, 20, 50, 200]
  ): MovingAverageResult[] {
    const results: MovingAverageResult[] = [];

    for (const period of periods) {
      if (prices.length < period) continue;

      const sma = this.calculateSMA(prices, period);
      const ema = this.calculateEMA(prices, period);

      // Determine trend by comparing recent values
      const recentSMA = sma.slice(-3);
      const recentEMA = ema.slice(-3);

      let trend: 'up' | 'down' | 'sideways' = 'sideways';
      if (recentSMA.length >= 2 && recentSMA[0] !== undefined && recentEMA[0] !== undefined) {
        const smaChange = recentSMA[recentSMA.length - 1]! - recentSMA[0];
        const emaChange = recentEMA[recentEMA.length - 1]! - recentEMA[0];

        if (smaChange > 0 && emaChange > 0) trend = 'up';
        else if (smaChange < 0 && emaChange < 0) trend = 'down';
      }

      const latestSMA = sma[sma.length - 1];
      const latestEMA = ema[ema.length - 1];

      if (latestSMA !== undefined && latestEMA !== undefined) {
        results.push({
          value: period,
          sma: latestSMA,
          ema: latestEMA,
          trend,
          timestamp: Date.now(),
        });
      }
    }

    return results;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  static calculateVolatility(prices: number[], period: number = 20): number {
    if (prices.length < period + 1) {
      throw new Error(`Not enough data points. Need at least ${period + 1}, got ${prices.length}`);
    }

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const returnVal = (prices[i]! - prices[i - 1]!) / prices[i - 1]!;
      returns.push(returnVal);
    }

    const recentReturns = returns.slice(-period);
    const meanReturn = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
    const variance =
      recentReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) /
      recentReturns.length;

    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  /**
   * Comprehensive market analysis
   */
  static analyzeMarket(candles: CandleData[]): {
    rsi: RSIResult[];
    macd: MACDResult[];
    bollingerBands: BollingerBandsResult[];
    movingAverages: MovingAverageResult[];
    volatility: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    signals: string[];
  } {
    if (candles.length < 50) {
      throw new Error('Need at least 50 candles for comprehensive analysis');
    }

    const closePrices = candles.map((c) => c.close);
    const signals: string[] = [];

    try {
      const rsi = this.calculateRSI(closePrices);
      const macd = this.calculateMACD(closePrices);
      const bollingerBands = this.calculateBollingerBands(closePrices);
      const movingAverages = this.calculateMovingAverages(closePrices);
      const volatility = this.calculateVolatility(closePrices);

      // Generate trading signals
      const latestRSI = rsi[rsi.length - 1];
      const latestMACD = macd[macd.length - 1];
      const latestBB = bollingerBands[bollingerBands.length - 1];

      if (latestRSI?.signal === 'oversold') {
        signals.push('RSI indicates oversold conditions - potential buy signal');
      } else if (latestRSI?.signal === 'overbought') {
        signals.push('RSI indicates overbought conditions - potential sell signal');
      }

      if (latestMACD?.trend === 'bullish') {
        signals.push('MACD showing bullish momentum');
      } else if (latestMACD?.trend === 'bearish') {
        signals.push('MACD showing bearish momentum');
      }

      if (latestBB?.position === 'below_lower') {
        signals.push('Price below Bollinger lower band - oversold');
      } else if (latestBB?.position === 'above_upper') {
        signals.push('Price above Bollinger upper band - overbought');
      }

      // Determine overall trend
      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      const bullishSignals = signals.filter(
        (s) => s.includes('bullish') || s.includes('buy')
      ).length;
      const bearishSignals = signals.filter(
        (s) => s.includes('bearish') || s.includes('sell')
      ).length;

      if (bullishSignals > bearishSignals) trend = 'bullish';
      else if (bearishSignals > bullishSignals) trend = 'bearish';

      return {
        rsi,
        macd,
        bollingerBands,
        movingAverages,
        volatility,
        trend,
        signals,
      };
    } catch (error) {
      logger.error('Error in market analysis', { error });
      throw error;
    }
  }
}
