import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ExecutionEngine } from '../execution/ExecutionEngine.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('EXECUTION_TOOLS');

export class ExecutionTools {
  private executionEngine: ExecutionEngine;

  constructor(executionEngine: ExecutionEngine) {
    this.executionEngine = executionEngine;
  }

  getToolDefinitions() {
    return [
      {
        name: 'execution_submit_order',
        description: 'Submit an order for algorithmic execution (TWAP, VWAP, Iceberg)',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Trading symbol (e.g., BTC, ETH)',
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
            orderType: {
              type: 'string',
              enum: ['market', 'limit'],
              description: 'Order type',
            },
            limitPrice: {
              type: 'number',
              description: 'Limit price (required for limit orders)',
              minimum: 0.0001,
            },
            timeInForce: {
              type: 'string',
              enum: ['gtc', 'ioc', 'fok'],
              default: 'gtc',
              description: 'Time in force',
            },
            algorithm: {
              type: 'string',
              enum: ['twap', 'vwap', 'iceberg', 'immediate'],
              description: 'Execution algorithm',
            },
            algorithmParams: {
              type: 'object',
              description: 'Algorithm-specific parameters',
              properties: {
                duration: {
                  type: 'number',
                  description: 'Duration in minutes (TWAP/VWAP)',
                },
                sliceCount: {
                  type: 'number',
                  description: 'Number of slices (TWAP)',
                },
                participation: {
                  type: 'number',
                  description: 'Volume participation rate 0-1 (VWAP)',
                },
                sliceSize: {
                  type: 'number',
                  description: 'Size of each slice (Iceberg)',
                },
                randomization: {
                  type: 'number',
                  description: 'Randomization factor 0-1 (Iceberg)',
                },
              },
              additionalProperties: true,
            },
          },
          required: ['symbol', 'side', 'quantity', 'orderType', 'algorithm', 'algorithmParams'],
          additionalProperties: false,
        },
      },
      {
        name: 'execution_cancel_order',
        description: 'Cancel an execution order',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Execution order ID to cancel',
            },
          },
          required: ['orderId'],
          additionalProperties: false,
        },
      },
      {
        name: 'execution_get_order_status',
        description: 'Get status of an execution order',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Execution order ID',
            },
          },
          required: ['orderId'],
          additionalProperties: false,
        },
      },
      {
        name: 'execution_get_order_report',
        description: 'Get detailed execution report for an order',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Execution order ID',
            },
          },
          required: ['orderId'],
          additionalProperties: false,
        },
      },
      {
        name: 'execution_list_active_orders',
        description: 'List all active execution orders',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'execution_get_statistics',
        description: 'Get execution engine performance statistics',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'execution_engine_control',
        description: 'Start or stop the execution engine',
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
      logger.info('Handling execution tool call', { tool: name, args });

      switch (name) {
        case 'execution_submit_order':
          return await this.submitOrder(args);

        case 'execution_cancel_order':
          return await this.cancelOrder(args);

        case 'execution_get_order_status':
          return await this.getOrderStatus(args);

        case 'execution_get_order_report':
          return await this.getOrderReport(args);

        case 'execution_list_active_orders':
          return await this.listActiveOrders();

        case 'execution_get_statistics':
          return await this.getStatistics();

        case 'execution_engine_control':
          return await this.engineControl(args);

        default:
          throw new Error(`Unknown execution tool: ${name}`);
      }
    } catch (error) {
      logger.error('Execution tool call failed', { tool: name, error });

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

  private async submitOrder(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      symbol: z.string(),
      side: z.enum(['buy', 'sell']),
      quantity: z.number().min(0.0001),
      orderType: z.enum(['market', 'limit']),
      limitPrice: z.number().min(0.0001).optional(),
      timeInForce: z.enum(['gtc', 'ioc', 'fok']).default('gtc'),
      algorithm: z.enum(['twap', 'vwap', 'iceberg', 'immediate']),
      algorithmParams: z.record(z.unknown()),
    });

    const parsed = schema.parse(args);

    // Validate limit price for limit orders
    if (parsed.orderType === 'limit' && !parsed.limitPrice) {
      throw new Error('Limit price is required for limit orders');
    }

    try {
      const orderId = await this.executionEngine.submitOrder({
        symbol: parsed.symbol,
        side: parsed.side,
        quantity: parsed.quantity,
        orderType: parsed.orderType,
        limitPrice: parsed.limitPrice,
        timeInForce: parsed.timeInForce,
        algorithm: parsed.algorithm,
        algorithmParams: parsed.algorithmParams,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'submit_execution_order',
                orderId,
                order: {
                  symbol: parsed.symbol,
                  side: parsed.side,
                  quantity: parsed.quantity,
                  algorithm: parsed.algorithm,
                  orderType: parsed.orderType,
                  limitPrice: parsed.limitPrice,
                },
                status: 'submitted',
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
                action: 'submit_execution_order',
                error: error instanceof Error ? error.message : 'Unknown error',
                order: {
                  symbol: parsed.symbol,
                  side: parsed.side,
                  quantity: parsed.quantity,
                  algorithm: parsed.algorithm,
                },
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

  private async cancelOrder(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      orderId: z.string(),
    });

    const parsed = schema.parse(args);

    try {
      const success = await this.executionEngine.cancelOrder(parsed.orderId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'cancel_execution_order',
                orderId: parsed.orderId,
                success,
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
                action: 'cancel_execution_order',
                orderId: parsed.orderId,
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

  private async getOrderStatus(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      orderId: z.string(),
    });

    const parsed = schema.parse(args);

    try {
      const order = this.executionEngine.getOrderStatus(parsed.orderId);

      if (!order) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  action: 'get_order_status',
                  orderId: parsed.orderId,
                  error: 'Order not found',
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_order_status',
                orderId: parsed.orderId,
                order: {
                  id: order.id,
                  symbol: order.symbol,
                  side: order.side,
                  quantity: order.quantity,
                  orderType: order.orderType,
                  limitPrice: order.limitPrice,
                  algorithm: order.algorithm,
                  status: order.status,
                  created: order.created,
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
                action: 'get_order_status',
                orderId: parsed.orderId,
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

  private async getOrderReport(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      orderId: z.string(),
    });

    const parsed = schema.parse(args);

    try {
      const report = this.executionEngine.getExecutionReport(parsed.orderId);

      if (!report) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  action: 'get_execution_report',
                  orderId: parsed.orderId,
                  error: 'Report not found',
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_execution_report',
                orderId: parsed.orderId,
                report: {
                  ...report,
                  summary: {
                    symbol: report.symbol,
                    algorithm: report.algorithm,
                    status: report.status,
                    progress: `${report.filledQuantity}/${report.totalQuantity} (${((report.filledQuantity / report.totalQuantity) * 100).toFixed(1)}%)`,
                    averagePrice: report.averagePrice?.toFixed(6) || 'N/A',
                    sliceCount: report.slices.length,
                    completedSlices: report.slices.filter(s => s.status === 'filled').length,
                    execution_time: report.endTime 
                      ? `${Math.round((report.endTime.getTime() - report.startTime.getTime()) / 1000)}s`
                      : 'In progress',
                  },
                  performance: report.performance,
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
                action: 'get_execution_report',
                orderId: parsed.orderId,
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

  private async listActiveOrders(): Promise<CallToolResult> {
    try {
      const activeOrders = this.executionEngine.getActiveOrders();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'list_active_orders',
                activeOrders: activeOrders.map(order => ({
                  id: order.id,
                  symbol: order.symbol,
                  side: order.side,
                  quantity: order.quantity,
                  algorithm: order.algorithm,
                  status: order.status,
                  created: order.created,
                })),
                totalActive: activeOrders.length,
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
                action: 'list_active_orders',
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

  private async getStatistics(): Promise<CallToolResult> {
    try {
      const stats = this.executionEngine.getExecutionStatistics();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_execution_statistics',
                statistics: {
                  ...stats,
                  averageExecutionTime: `${Math.round(stats.averageExecutionTime / 1000)}s`,
                  averageSlippage: `${(stats.averageSlippage * 100).toFixed(4)}%`,
                  successRate: stats.totalOrders > 0 
                    ? `${((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}%`
                    : 'N/A',
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
                action: 'get_execution_statistics',
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
          await this.executionEngine.start();
          result = { status: 'started' };
          break;
        case 'stop':
          await this.executionEngine.stop();
          result = { status: 'stopped' };
          break;
        case 'status':
          const activeOrders = this.executionEngine.getActiveOrders();
          result = { 
            status: 'running',
            activeOrders: activeOrders.length,
          };
          break;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'execution_engine_control',
                command: parsed.action,
                result,
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
                action: 'execution_engine_control',
                command: parsed.action,
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