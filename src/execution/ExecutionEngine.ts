import { EventEmitter } from 'events';
import { SimpleHyperLiquidAdapter } from '../adapters/hyperliquid/SimpleHyperLiquidAdapter.js';
// import { MarketIntelligence } from '../analytics/MarketIntelligence.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('EXECUTION_ENGINE');

export interface ExecutionOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit';
  limitPrice?: number;
  timeInForce: 'gtc' | 'ioc' | 'fok';
  algorithm: 'twap' | 'vwap' | 'iceberg' | 'immediate';
  algorithmParams: Record<string, unknown>;
  created: Date;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  parentOrderId?: string;
}

export interface ExecutionSlice {
  id: string;
  parentOrderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  scheduled: Date;
  executed?: Date;
  status: 'pending' | 'submitted' | 'filled' | 'cancelled' | 'failed';
  fillQuantity?: number;
  fillPrice?: number;
  orderId?: number; // HyperLiquid order ID
}

export interface ExecutionReport {
  orderId: string;
  symbol: string;
  algorithm: string;
  totalQuantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  averagePrice?: number;
  slices: ExecutionSlice[];
  startTime: Date;
  endTime?: Date;
  status: ExecutionOrder['status'];
  performance: {
    slippage?: number;
    marketImpact?: number;
    timing?: number;
    efficiency?: number;
  };
}

export class ExecutionEngine extends EventEmitter {
  private adapter: SimpleHyperLiquidAdapter;
  // Market intelligence for future advanced features
  // private _marketIntelligence?: MarketIntelligence;
  private activeOrders: Map<string, ExecutionOrder> = new Map();
  private orderSlices: Map<string, ExecutionSlice[]> = new Map();
  private executionReports: Map<string, ExecutionReport> = new Map();
  private isRunning: boolean = false;

  constructor(adapter: SimpleHyperLiquidAdapter) {
    super();
    this.adapter = adapter;
    // this._marketIntelligence = new MarketIntelligence(adapter);

    logger.info('ExecutionEngine initialized');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('ExecutionEngine already running');
      return;
    }

    this.isRunning = true;
    this.startExecutionLoop();
    logger.info('ExecutionEngine started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Cancel all active orders
    for (const order of this.activeOrders.values()) {
      if (order.status === 'running') {
        await this.cancelOrder(order.id);
      }
    }

    logger.info('ExecutionEngine stopped');
  }

  /**
   * Submit an execution order with algorithm
   */
  async submitOrder(order: Omit<ExecutionOrder, 'id' | 'created' | 'status'>): Promise<string> {
    const executionOrder: ExecutionOrder = {
      ...order,
      id: this.generateOrderId(),
      created: new Date(),
      status: 'pending',
    };

    // Validate order
    const validation = await this.validateOrder(executionOrder);
    if (!validation.valid) {
      throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
    }

    this.activeOrders.set(executionOrder.id, executionOrder);

    // Create initial execution report
    const report: ExecutionReport = {
      orderId: executionOrder.id,
      symbol: executionOrder.symbol,
      algorithm: executionOrder.algorithm,
      totalQuantity: executionOrder.quantity,
      filledQuantity: 0,
      remainingQuantity: executionOrder.quantity,
      slices: [],
      startTime: new Date(),
      status: 'pending',
      performance: {},
    };
    this.executionReports.set(executionOrder.id, report);

    logger.info('Execution order submitted', {
      orderId: executionOrder.id,
      symbol: executionOrder.symbol,
      algorithm: executionOrder.algorithm,
      quantity: executionOrder.quantity,
    });

    this.emit('orderSubmitted', executionOrder);
    return executionOrder.id;
  }

  /**
   * Cancel an execution order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.activeOrders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Cancel all pending slices
    const slices = this.orderSlices.get(orderId) || [];
    for (const slice of slices) {
      if (slice.status === 'submitted' && slice.orderId) {
        try {
          await this.adapter.cancelOrder(0, slice.orderId); // Asset ID would be resolved
        } catch (error) {
          logger.error('Failed to cancel slice', { sliceId: slice.id, error });
        }
      }
      slice.status = 'cancelled';
    }

    order.status = 'cancelled';
    this.updateExecutionReport(orderId);

    logger.info('Execution order cancelled', { orderId });
    this.emit('orderCancelled', order);
    return true;
  }

  /**
   * Get execution order status
   */
  getOrderStatus(orderId: string): ExecutionOrder | undefined {
    return this.activeOrders.get(orderId);
  }

  /**
   * Get execution report
   */
  getExecutionReport(orderId: string): ExecutionReport | undefined {
    return this.executionReports.get(orderId);
  }

  /**
   * Get all active orders
   */
  getActiveOrders(): ExecutionOrder[] {
    return Array.from(this.activeOrders.values()).filter(order => 
      order.status === 'pending' || order.status === 'running'
    );
  }

  /**
   * Get execution statistics
   */
  getExecutionStatistics(): {
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    failedOrders: number;
    averageExecutionTime: number;
    averageSlippage: number;
  } {
    const allOrders = Array.from(this.activeOrders.values());
    const completedReports = Array.from(this.executionReports.values())
      .filter(report => report.status === 'completed');

    const averageExecutionTime = completedReports.length > 0
      ? completedReports.reduce((sum, report) => {
          const duration = report.endTime 
            ? report.endTime.getTime() - report.startTime.getTime()
            : 0;
          return sum + duration;
        }, 0) / completedReports.length
      : 0;

    const averageSlippage = completedReports.length > 0
      ? completedReports.reduce((sum, report) => {
          return sum + (report.performance.slippage || 0);
        }, 0) / completedReports.length
      : 0;

    return {
      totalOrders: allOrders.length,
      activeOrders: allOrders.filter(o => o.status === 'running' || o.status === 'pending').length,
      completedOrders: allOrders.filter(o => o.status === 'completed').length,
      cancelledOrders: allOrders.filter(o => o.status === 'cancelled').length,
      failedOrders: allOrders.filter(o => o.status === 'failed').length,
      averageExecutionTime,
      averageSlippage,
    };
  }

  private startExecutionLoop(): void {
    const executeOrders = async () => {
      if (!this.isRunning) return;

      try {
        await this.processActiveOrders();
        await this.processScheduledSlices();
      } catch (error) {
        logger.error('Error in execution loop', { error });
      }

      // Schedule next iteration
      if (this.isRunning) {
        setTimeout(executeOrders, 1000); // Run every second
      }
    };

    executeOrders();
  }

  private async processActiveOrders(): Promise<void> {
    const pendingOrders = Array.from(this.activeOrders.values())
      .filter(order => order.status === 'pending');

    for (const order of pendingOrders) {
      try {
        await this.startOrderExecution(order);
      } catch (error) {
        logger.error('Failed to start order execution', {
          orderId: order.id,
          error,
        });
        order.status = 'failed';
        this.updateExecutionReport(order.id);
        this.emit('orderFailed', order, error);
      }
    }
  }

  private async processScheduledSlices(): Promise<void> {
    const now = new Date();
    
    for (const [orderId, slices] of this.orderSlices.entries()) {
      const pendingSlices = slices.filter(slice => 
        slice.status === 'pending' && slice.scheduled <= now
      );

      for (const slice of pendingSlices) {
        try {
          await this.executeSlice(slice);
        } catch (error) {
          logger.error('Failed to execute slice', {
            sliceId: slice.id,
            orderId,
            error,
          });
          slice.status = 'failed';
          this.checkOrderCompletion(orderId);
        }
      }
    }
  }

  private async startOrderExecution(order: ExecutionOrder): Promise<void> {
    order.status = 'running';
    
    // Generate execution slices based on algorithm
    const slices = await this.generateExecutionSlices(order);
    this.orderSlices.set(order.id, slices);

    this.updateExecutionReport(order.id);
    this.emit('orderStarted', order);

    logger.info('Order execution started', {
      orderId: order.id,
      algorithm: order.algorithm,
      sliceCount: slices.length,
    });
  }

  private async generateExecutionSlices(order: ExecutionOrder): Promise<ExecutionSlice[]> {
    switch (order.algorithm) {
      case 'immediate':
        return this.generateImmediateSlices(order);
      case 'twap':
        return this.generateTWAPSlices(order);
      case 'vwap':
        return this.generateVWAPSlices(order);
      case 'iceberg':
        return this.generateIcebergSlices(order);
      default:
        throw new Error(`Unknown algorithm: ${order.algorithm}`);
    }
  }

  private generateImmediateSlices(order: ExecutionOrder): ExecutionSlice[] {
    return [{
      id: this.generateSliceId(),
      parentOrderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: order.limitPrice,
      scheduled: new Date(),
      status: 'pending',
    }];
  }

  private generateTWAPSlices(order: ExecutionOrder): ExecutionSlice[] {
    const params = order.algorithmParams as {
      duration: number; // minutes
      sliceCount?: number;
    };

    const duration = params.duration * 60 * 1000; // Convert to milliseconds
    const sliceCount = params.sliceCount || Math.ceil(params.duration / 5); // Default 5-minute slices
    const sliceQuantity = order.quantity / sliceCount;
    const sliceInterval = duration / sliceCount;

    const slices: ExecutionSlice[] = [];
    const startTime = new Date();

    for (let i = 0; i < sliceCount; i++) {
      const scheduled = new Date(startTime.getTime() + i * sliceInterval);
      const quantity = i === sliceCount - 1 
        ? order.quantity - (sliceQuantity * (sliceCount - 1)) // Handle rounding
        : sliceQuantity;

      slices.push({
        id: this.generateSliceId(),
        parentOrderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity,
        price: order.limitPrice,
        scheduled,
        status: 'pending',
      });
    }

    return slices;
  }

  private async generateVWAPSlices(order: ExecutionOrder): Promise<ExecutionSlice[]> {
    // Simplified VWAP - would need historical volume data for accurate implementation
    const params = order.algorithmParams as {
      duration: number; // minutes
      participation: number; // 0-1, percentage of historical volume
    };

    // For now, generate time-weighted slices similar to TWAP
    // In production, this would use historical volume profiles
    return this.generateTWAPSlices({
      ...order,
      algorithmParams: {
        duration: params.duration,
        sliceCount: Math.ceil(params.duration / 10), // 10-minute slices for VWAP
      },
    });
  }

  private generateIcebergSlices(order: ExecutionOrder): ExecutionSlice[] {
    const params = order.algorithmParams as {
      sliceSize: number;
      randomization?: number; // 0-1, amount of randomization
    };

    const baseSliceSize = params.sliceSize;
    const randomization = params.randomization || 0;
    const slices: ExecutionSlice[] = [];
    let remainingQuantity = order.quantity;
    const startTime = new Date();

    let sliceIndex = 0;
    while (remainingQuantity > 0) {
      let sliceQuantity = Math.min(baseSliceSize, remainingQuantity);
      
      // Add randomization
      if (randomization > 0) {
        const randomFactor = 1 + (Math.random() - 0.5) * randomization;
        sliceQuantity = Math.min(sliceQuantity * randomFactor, remainingQuantity);
      }

      slices.push({
        id: this.generateSliceId(),
        parentOrderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: sliceQuantity,
        price: order.limitPrice,
        scheduled: new Date(startTime.getTime() + sliceIndex * 1000), // 1 second apart
        status: 'pending',
      });

      remainingQuantity -= sliceQuantity;
      sliceIndex++;
    }

    return slices;
  }

  private async executeSlice(slice: ExecutionSlice): Promise<void> {
    slice.status = 'submitted';

    try {
      // Resolve symbol to asset ID for HyperLiquid API  
      const order = this.activeOrders.get(slice.parentOrderId);
      if (!order) {
        throw new Error(`Order not found for slice: ${slice.parentOrderId}`);
      }
      
      const assetId = await this.resolveSymbolToAssetId(order.symbol);
      
      let result;
      if (slice.price) {
        result = await this.adapter.placeLimitOrder(
          assetId,
          slice.side === 'buy',
          slice.price.toString(),
          slice.quantity.toString()
        );
      } else {
        result = await this.adapter.placeMarketOrder(
          assetId,
          slice.side === 'buy',
          slice.quantity.toString()
        );
      }

      // Parse HyperLiquid response to get order ID
      if (result && typeof result === 'object' && 'orderId' in result) {
        slice.orderId = result.orderId as number;
      }

      slice.executed = new Date();
      slice.status = 'filled'; // Simplified - would need to track actual fill status

      logger.info('Slice executed', {
        sliceId: slice.id,
        orderId: slice.parentOrderId,
        quantity: slice.quantity,
      });

      this.checkOrderCompletion(slice.parentOrderId);
    } catch (error) {
      slice.status = 'failed';
      logger.error('Slice execution failed', {
        sliceId: slice.id,
        error,
      });
      throw error;
    }
  }

  private checkOrderCompletion(orderId: string): void {
    const slices = this.orderSlices.get(orderId) || [];
    const completedSlices = slices.filter(s => s.status === 'filled' || s.status === 'failed');
    
    if (completedSlices.length === slices.length) {
      const order = this.activeOrders.get(orderId);
      if (order) {
        const filledSlices = slices.filter(s => s.status === 'filled');
        order.status = filledSlices.length > 0 ? 'completed' : 'failed';
        this.updateExecutionReport(orderId);
        this.emit('orderCompleted', order);
      }
    }
  }

  private updateExecutionReport(orderId: string): void {
    const order = this.activeOrders.get(orderId);
    const slices = this.orderSlices.get(orderId) || [];
    const report = this.executionReports.get(orderId);

    if (!order || !report) return;

    const filledSlices = slices.filter(s => s.status === 'filled');
    const filledQuantity = filledSlices.reduce((sum, s) => sum + (s.fillQuantity || s.quantity), 0);

    report.filledQuantity = filledQuantity;
    report.remainingQuantity = order.quantity - filledQuantity;
    report.slices = slices;
    report.status = order.status;

    if (order.status === 'completed') {
      report.endTime = new Date();
    }

    // Calculate performance metrics
    if (filledSlices.length > 0) {
      const totalFilled = filledSlices.reduce((sum, s) => sum + (s.fillQuantity || s.quantity), 0);
      const weightedPrice = filledSlices.reduce((sum, s) => {
        const quantity = s.fillQuantity || s.quantity;
        const price = s.fillPrice || s.price || 0;
        return sum + (quantity * price);
      }, 0);

      report.averagePrice = totalFilled > 0 ? weightedPrice / totalFilled : undefined;
    }
  }

  private async validateOrder(order: ExecutionOrder): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (order.quantity <= 0) {
      errors.push('Quantity must be positive');
    }

    if (order.orderType === 'limit' && !order.limitPrice) {
      errors.push('Limit price required for limit orders');
    }

    if (order.limitPrice && order.limitPrice <= 0) {
      errors.push('Limit price must be positive');
    }

    // Validate algorithm parameters
    switch (order.algorithm) {
      case 'twap':
      case 'vwap':
        const params = order.algorithmParams as { duration?: number };
        if (!params.duration || params.duration <= 0) {
          errors.push('Duration must be positive for TWAP/VWAP algorithms');
        }
        break;
      case 'iceberg':
        const icebergParams = order.algorithmParams as { sliceSize?: number };
        if (!icebergParams.sliceSize || icebergParams.sliceSize <= 0) {
          errors.push('Slice size must be positive for Iceberg algorithm');
        }
        if (icebergParams.sliceSize! >= order.quantity) {
          errors.push('Slice size must be smaller than total quantity');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private generateOrderId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private symbolToAssetIdCache: Map<string, number> = new Map();

  private async resolveSymbolToAssetId(symbol: string): Promise<number> {
    // Check cache first
    if (this.symbolToAssetIdCache.has(symbol)) {
      return this.symbolToAssetIdCache.get(symbol)!;
    }

    try {
      // Get asset metadata from HyperLiquid to resolve symbol to asset ID
      const assets = await this.adapter.getAssets();
      
      if (assets && Array.isArray(assets)) {
        // Look for the symbol in the asset data
        const assetInfo = assets.find((asset: any) => {
          // HyperLiquid assets are often indexed by position, with symbol info
          const assetSymbol = asset?.coin || asset?.symbol || asset?.name;
          return assetSymbol === symbol;
        });

        if (assetInfo) {
          // For HyperLiquid, asset ID is often the index position
          const assetId = parseInt((assetInfo as any)?.assetId || (assetInfo as any)?.id || 
                                  assets.indexOf(assetInfo).toString() || '0');
          
          // Cache the result
          this.symbolToAssetIdCache.set(symbol, assetId);
          
          logger.debug('Symbol resolved to asset ID from assets endpoint', { 
            symbol, 
            assetId,
            cached: false 
          });
          
          return assetId;
        }
      }

      // Fallback: try to resolve from adapter metadata
      const adapterMetadata = this.adapter.getMetadata();
      if (adapterMetadata && typeof adapterMetadata === 'object' && 'symbols' in adapterMetadata) {
        const symbols = adapterMetadata.symbols as any[];
        const symbolIndex = symbols.findIndex((s: string) => s === symbol);
        
        if (symbolIndex >= 0) {
          const assetId = symbolIndex;
          this.symbolToAssetIdCache.set(symbol, assetId);
          
          logger.debug('Symbol resolved via adapter metadata', { 
            symbol, 
            assetId,
            cached: false 
          });
          
          return assetId;
        }
      }

      // Final fallback: use hardcoded common symbols
      const commonSymbols: Record<string, number> = {
        'BTC': 0,
        'ETH': 1,
        'SOL': 2,
        'ARB': 3,
        'AVAX': 4,
      };

      if (commonSymbols[symbol]) {
        const assetId = commonSymbols[symbol];
        this.symbolToAssetIdCache.set(symbol, assetId);
        
        logger.warn('Symbol resolved using fallback mapping', { 
          symbol, 
          assetId,
          warning: 'Using hardcoded fallback - may be inaccurate'
        });
        
        return assetId;
      }

      throw new Error(`Unable to resolve symbol '${symbol}' to asset ID`);
    } catch (error) {
      logger.error('Failed to resolve symbol to asset ID', { 
        symbol, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private generateSliceId(): string {
    return `slice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}