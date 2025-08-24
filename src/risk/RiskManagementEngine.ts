import { EventEmitter } from 'events';
import { SimpleHyperLiquidAdapter } from '../adapters/hyperliquid/SimpleHyperLiquidAdapter.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('RISK_MANAGEMENT');

export interface RiskLimits {
  maxPositionSize: number;
  maxLeverage: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxConcentration: number;
  varLimit: number;
  stopLossPercent: number;
  maxOrderValue: number;
}

export interface PositionRisk {
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  unrealizedPnl: number;
  riskScore: number;
  var95: number;
  var99: number;
  expectedShortfall: number;
  concentration: number;
}

export interface PortfolioRisk {
  totalValue: number;
  totalRisk: number;
  portfolioVar95: number;
  portfolioVar99: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortino: number;
  beta: number;
  positions: PositionRisk[];
  correlationMatrix: Record<string, Record<string, number>>;
  stressTestResults: StressTestResult[];
}

export interface StressTestResult {
  scenario: string;
  description: string;
  portfolioImpact: number;
  impactPercent: number;
  positionImpacts: Array<{
    symbol: string;
    impact: number;
    impactPercent: number;
  }>;
}

export interface RiskAlert {
  id: string;
  type: 'limit_breach' | 'var_exceeded' | 'concentration' | 'drawdown' | 'position_size';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  symbol?: string;
  currentValue: number;
  limit: number;
  timestamp: Date;
  resolved: boolean;
}

export interface OrderRiskCheck {
  approved: boolean;
  warnings: string[];
  rejectionReasons: string[];
  riskMetrics: {
    newPortfolioVar: number;
    concentrationImpact: number;
    leverageImpact: number;
    liquidationRisk: number;
  };
}

export class RiskManagementEngine extends EventEmitter {
  private adapter: SimpleHyperLiquidAdapter;
  private riskLimits: RiskLimits;
  private activeAlerts: Map<string, RiskAlert> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private returns: Map<string, number[]> = new Map();
  private isActive = false;

  constructor(adapter: SimpleHyperLiquidAdapter, riskLimits?: Partial<RiskLimits>) {
    super();
    this.adapter = adapter;
    this.riskLimits = {
      maxPositionSize: 100000,
      maxLeverage: 10,
      maxDailyLoss: 5000,
      maxDrawdown: 0.2,
      maxConcentration: 0.3,
      varLimit: 10000,
      stopLossPercent: 0.05,
      maxOrderValue: 50000,
      ...riskLimits,
    };

    logger.info('RiskManagementEngine initialized', { riskLimits: this.riskLimits });
  }

  async start(): Promise<void> {
    if (this.isActive) return;

    this.isActive = true;
    logger.info('Risk management engine started');

    this.startRiskMonitoring();
  }

  async stop(): Promise<void> {
    this.isActive = false;
    logger.info('Risk management engine stopped');
  }

  private startRiskMonitoring(): void {
    if (!this.isActive) return;

    setInterval(async () => {
      if (!this.isActive) return;

      try {
        await this.performRiskCheck();
      } catch (error) {
        logger.error('Error during risk monitoring', { error });
      }
    }, 30000); // Check every 30 seconds
  }

  async performRiskCheck(): Promise<void> {
    try {
      const portfolioRisk = await this.calculatePortfolioRisk();
      this.checkRiskLimits(portfolioRisk);
      this.updatePriceHistory();
    } catch (error) {
      logger.error('Failed to perform risk check', { error });
      throw error;
    }
  }

  async checkOrderRisk(
    symbol: string,
    side: 'buy' | 'sell',
    quantity: number,
    price?: number
  ): Promise<OrderRiskCheck> {
    try {
      const currentPortfolio = await this.calculatePortfolioRisk();
      const orderValue = quantity * (price || await this.getCurrentPrice(symbol));

      const warnings: string[] = [];
      const rejectionReasons: string[] = [];

      if (orderValue > this.riskLimits.maxOrderValue) {
        rejectionReasons.push(`Order value ${orderValue} exceeds limit ${this.riskLimits.maxOrderValue}`);
      }

      const existingPosition = currentPortfolio.positions.find(p => p.symbol === symbol);
      const newSize = existingPosition 
        ? existingPosition.size + (side === 'buy' ? quantity : -quantity)
        : (side === 'buy' ? quantity : -quantity);

      const newPositionValue = Math.abs(newSize) * (price || await this.getCurrentPrice(symbol));
      
      if (newPositionValue > this.riskLimits.maxPositionSize) {
        rejectionReasons.push(`New position size ${newPositionValue} exceeds limit ${this.riskLimits.maxPositionSize}`);
      }

      const newConcentration = newPositionValue / (currentPortfolio.totalValue + orderValue);
      if (newConcentration > this.riskLimits.maxConcentration) {
        warnings.push(`Position concentration will be ${(newConcentration * 100).toFixed(2)}%`);
      }

      const simulatedVar = await this.simulateOrderVaR(symbol, side, quantity, price);
      const riskMetrics = {
        newPortfolioVar: simulatedVar,
        concentrationImpact: newConcentration - (existingPosition?.concentration || 0),
        leverageImpact: 0, // To be calculated based on margin
        liquidationRisk: this.calculateLiquidationRisk(symbol, newSize, price),
      };

      if (simulatedVar > this.riskLimits.varLimit) {
        rejectionReasons.push(`Order would increase portfolio VaR to ${simulatedVar}, exceeding limit ${this.riskLimits.varLimit}`);
      }

      return {
        approved: rejectionReasons.length === 0,
        warnings,
        rejectionReasons,
        riskMetrics,
      };
    } catch (error) {
      logger.error('Failed to check order risk', { symbol, side, quantity, error });
      return {
        approved: false,
        warnings: [],
        rejectionReasons: ['Risk check failed due to system error'],
        riskMetrics: {
          newPortfolioVar: 0,
          concentrationImpact: 0,
          leverageImpact: 0,
          liquidationRisk: 1,
        },
      };
    }
  }

  async calculatePortfolioRisk(userAddress?: string): Promise<PortfolioRisk> {
    try {
      const accountState = await this.adapter.getAccountState(userAddress);
      const positions = this.parsePositions(accountState);
      const currentPrices = await this.adapter.getAllMids();

      const positionRisks = await Promise.all(
        positions.map(position => this.calculatePositionRisk(position, currentPrices))
      );

      const totalValue = positionRisks.reduce((sum, pos) => sum + Math.abs(pos.size * pos.currentPrice), 0);
      const portfolioVar95 = await this.calculatePortfolioVaR(positionRisks, 0.95);
      const portfolioVar99 = await this.calculatePortfolioVaR(positionRisks, 0.99);

      const returns = this.getPortfolioReturns(positionRisks);
      const sharpeRatio = this.calculateSharpeRatio(returns);
      const sortino = this.calculateSortino(returns);
      const maxDrawdown = this.calculateMaxDrawdown(returns);

      const correlationMatrix = await this.calculateCorrelationMatrix(
        positionRisks.map(p => p.symbol)
      );

      const stressTestResults = await this.performStressTests(positionRisks);

      return {
        totalValue,
        totalRisk: portfolioVar95,
        portfolioVar95,
        portfolioVar99,
        maxDrawdown,
        sharpeRatio,
        sortino,
        beta: 1, // Simplified, would need market data
        positions: positionRisks,
        correlationMatrix,
        stressTestResults,
      };
    } catch (error) {
      logger.error('Failed to calculate portfolio risk', { error });
      throw error;
    }
  }

  private async calculatePositionRisk(position: any, currentPrices: Record<string, string>): Promise<PositionRisk> {
    const currentPrice = parseFloat(currentPrices[position.symbol]) || position.entryPrice;
    const positionValue = Math.abs(position.size * currentPrice);
    
    const returns = this.returns.get(position.symbol) || [];
    const var95 = this.calculateVaR(returns, 0.95) * positionValue;
    const var99 = this.calculateVaR(returns, 0.99) * positionValue;
    const expectedShortfall = this.calculateExpectedShortfall(returns, 0.95) * positionValue;

    return {
      symbol: position.symbol,
      size: position.size,
      entryPrice: position.entryPrice,
      currentPrice,
      leverage: position.leverage || 1,
      unrealizedPnl: (currentPrice - position.entryPrice) * position.size,
      riskScore: this.calculateRiskScore(position, var95),
      var95: Math.abs(var95),
      var99: Math.abs(var99),
      expectedShortfall: Math.abs(expectedShortfall),
      concentration: positionValue,
    };
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return Math.abs(sortedReturns[index] || 0);
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const cutoffIndex = Math.floor((1 - confidence) * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, cutoffIndex);
    
    return tailReturns.length > 0 
      ? Math.abs(tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length)
      : 0;
  }

  private async calculatePortfolioVaR(positions: PositionRisk[], confidence: number): Promise<number> {
    // Simplified portfolio VaR using correlation
    const positionVaRs = positions.map(p => confidence === 0.95 ? p.var95 : p.var99);
    const correlationAdjustment = 0.8; // Simplified correlation factor
    
    return Math.sqrt(positionVaRs.reduce((sum, varValue) => sum + varValue * varValue, 0)) * correlationAdjustment;
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;

    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / (returns.length - 1)
    );

    return stdDev !== 0 ? meanReturn / stdDev : 0;
  }

  private calculateSortino(returns: number[]): number {
    if (returns.length < 2) return 0;

    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const downwardReturns = returns.filter(ret => ret < 0);
    
    if (downwardReturns.length === 0) return Infinity;

    const downsideDeviation = Math.sqrt(
      downwardReturns.reduce((sum, ret) => sum + ret * ret, 0) / downwardReturns.length
    );

    return downsideDeviation !== 0 ? meanReturn / downsideDeviation : 0;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;

    for (const ret of returns) {
      cumulative += ret;
      peak = Math.max(peak, cumulative);
      const drawdown = (peak - cumulative) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private async calculateCorrelationMatrix(symbols: string[]): Promise<Record<string, Record<string, number>>> {
    const matrix: Record<string, Record<string, number>> = {};

    for (const symbol1 of symbols) {
      matrix[symbol1] = {};
      const returns1 = this.returns.get(symbol1) || [];

      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          matrix[symbol1][symbol2] = 1;
          continue;
        }

        const returns2 = this.returns.get(symbol2) || [];
        matrix[symbol1][symbol2] = this.calculateCorrelation(returns1, returns2);
      }
    }

    return matrix;
  }

  private calculateCorrelation(returns1: number[], returns2: number[]): number {
    const n = Math.min(returns1.length, returns2.length);
    if (n < 2) return 0;

    const mean1 = returns1.slice(0, n).reduce((sum, ret) => sum + ret, 0) / n;
    const mean2 = returns2.slice(0, n).reduce((sum, ret) => sum + ret, 0) / n;

    let covariance = 0;
    let variance1 = 0;
    let variance2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      covariance += diff1 * diff2;
      variance1 += diff1 * diff1;
      variance2 += diff2 * diff2;
    }

    const stdDev1 = Math.sqrt(variance1 / (n - 1));
    const stdDev2 = Math.sqrt(variance2 / (n - 1));

    return (stdDev1 * stdDev2) !== 0 ? covariance / (n - 1) / (stdDev1 * stdDev2) : 0;
  }

  private async performStressTests(positions: PositionRisk[]): Promise<StressTestResult[]> {
    const stressScenarios = [
      { name: 'Market Crash', description: '30% market decline', factor: -0.3 },
      { name: 'Volatility Spike', description: '200% volatility increase', factor: -0.15 },
      { name: 'Liquidity Crisis', description: '50% price gaps', factor: -0.25 },
      { name: 'Sector Rotation', description: 'Major sector weakness', factor: -0.2 },
    ];

    return stressScenarios.map(scenario => {
      const positionImpacts = positions.map(position => {
        const impact = position.size * position.currentPrice * scenario.factor;
        return {
          symbol: position.symbol,
          impact,
          impactPercent: scenario.factor * 100,
        };
      });

      const portfolioImpact = positionImpacts.reduce((sum, impact) => sum + impact.impact, 0);
      const totalValue = positions.reduce((sum, pos) => sum + Math.abs(pos.size * pos.currentPrice), 0);

      return {
        scenario: scenario.name,
        description: scenario.description,
        portfolioImpact,
        impactPercent: (portfolioImpact / totalValue) * 100,
        positionImpacts,
      };
    });
  }

  private checkRiskLimits(portfolioRisk: PortfolioRisk): void {
    // Check portfolio VaR limit
    if (portfolioRisk.portfolioVar95 > this.riskLimits.varLimit) {
      this.createAlert({
        type: 'var_exceeded',
        severity: 'high',
        message: `Portfolio VaR ${portfolioRisk.portfolioVar95.toFixed(2)} exceeds limit ${this.riskLimits.varLimit}`,
        currentValue: portfolioRisk.portfolioVar95,
        limit: this.riskLimits.varLimit,
      });
    }

    // Check max drawdown
    if (portfolioRisk.maxDrawdown > this.riskLimits.maxDrawdown) {
      this.createAlert({
        type: 'drawdown',
        severity: 'critical',
        message: `Max drawdown ${(portfolioRisk.maxDrawdown * 100).toFixed(2)}% exceeds limit ${(this.riskLimits.maxDrawdown * 100).toFixed(2)}%`,
        currentValue: portfolioRisk.maxDrawdown,
        limit: this.riskLimits.maxDrawdown,
      });
    }

    // Check position concentration
    portfolioRisk.positions.forEach(position => {
      const concentration = position.concentration / portfolioRisk.totalValue;
      if (concentration > this.riskLimits.maxConcentration) {
        this.createAlert({
          type: 'concentration',
          severity: 'medium',
          message: `Position ${position.symbol} concentration ${(concentration * 100).toFixed(2)}% exceeds limit ${(this.riskLimits.maxConcentration * 100).toFixed(2)}%`,
          symbol: position.symbol,
          currentValue: concentration,
          limit: this.riskLimits.maxConcentration,
        });
      }
    });
  }

  private createAlert(alertData: Omit<RiskAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: RiskAlert = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData,
    };

    this.activeAlerts.set(alert.id, alert);
    
    logger.warn('Risk alert created', { alert });
    this.emit('risk_alert', alert);
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    const prices = await this.adapter.getAllMids();
    return parseFloat(prices[symbol]) || 0;
  }

  private async simulateOrderVaR(symbol: string, side: 'buy' | 'sell', quantity: number, price?: number): Promise<number> {
    // Simplified simulation - would need more sophisticated modeling
    const currentPortfolio = await this.calculatePortfolioRisk();
    const orderValue = quantity * (price || await this.getCurrentPrice(symbol));
    const orderVaR = orderValue * 0.02; // Simplified 2% VaR for new orders
    
    return currentPortfolio.portfolioVar95 + orderVaR;
  }

  private calculateLiquidationRisk(symbol: string, size: number, price?: number): number {
    // Simplified liquidation risk calculation
    // Would need margin requirements and account equity in reality
    return Math.min(Math.abs(size) * 0.01, 1); // Max 1% liquidation risk
  }

  private calculateRiskScore(position: any, var95: number): number {
    // Combined risk score from 0-100
    const sizeScore = Math.min((Math.abs(position.size) / 10) * 20, 40);
    const varScore = Math.min((var95 / 1000) * 30, 30);
    const leverageScore = Math.min((position.leverage - 1) * 10, 30);
    
    return Math.min(sizeScore + varScore + leverageScore, 100);
  }

  private parsePositions(accountState: unknown): any[] {
    // Mock data - would parse actual account state
    return [
      {
        symbol: 'BTC',
        size: 1.5,
        entryPrice: 45000,
        leverage: 2,
      },
      {
        symbol: 'ETH',
        size: 10,
        entryPrice: 3000,
        leverage: 1,
      },
    ];
  }

  private getPortfolioReturns(positions: PositionRisk[]): number[] {
    // Simplified portfolio returns calculation
    const returns: number[] = [];
    const totalValue = positions.reduce((sum, pos) => sum + Math.abs(pos.size * pos.currentPrice), 0);
    
    if (totalValue === 0) return returns;

    for (let i = 0; i < 30; i++) { // Last 30 periods
      let portfolioReturn = 0;
      positions.forEach(pos => {
        const positionReturns = this.returns.get(pos.symbol) || [];
        if (positionReturns[i]) {
          const weight = Math.abs(pos.size * pos.currentPrice) / totalValue;
          portfolioReturn += positionReturns[i] * weight;
        }
      });
      if (portfolioReturn !== 0) returns.push(portfolioReturn);
    }

    return returns;
  }

  private async updatePriceHistory(): Promise<void> {
    try {
      const currentPrices = await this.adapter.getAllMids();
      
      Object.entries(currentPrices).forEach(([symbol, priceStr]) => {
        const price = parseFloat(priceStr);
        const history = this.priceHistory.get(symbol) || [];
        history.push(price);
        
        // Keep last 100 prices
        if (history.length > 100) history.shift();
        this.priceHistory.set(symbol, history);
        
        // Calculate returns
        if (history.length > 1) {
          const returns = this.returns.get(symbol) || [];
          const returnValue = (price - history[history.length - 2]) / history[history.length - 2];
          returns.push(returnValue);
          
          // Keep last 100 returns
          if (returns.length > 100) returns.shift();
          this.returns.set(symbol, returns);
        }
      });
    } catch (error) {
      logger.error('Failed to update price history', { error });
    }
  }

  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  updateRiskLimits(newLimits: Partial<RiskLimits>): void {
    this.riskLimits = { ...this.riskLimits, ...newLimits };
    logger.info('Risk limits updated', { riskLimits: this.riskLimits });
    this.emit('risk_limits_updated', this.riskLimits);
  }

  getActiveAlerts(): RiskAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('risk_alert_resolved', alert);
      return true;
    }
    return false;
  }

  getRiskStatistics(): {
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
  } {
    const allAlerts = Array.from(this.activeAlerts.values());
    const activeAlerts = allAlerts.filter(a => !a.resolved);
    
    const alertsByType: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};
    
    allAlerts.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    });

    return {
      totalAlerts: allAlerts.length,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: allAlerts.length - activeAlerts.length,
      alertsByType,
      alertsBySeverity,
    };
  }
}