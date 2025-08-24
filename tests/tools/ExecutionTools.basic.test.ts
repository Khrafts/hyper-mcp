import { ExecutionTools } from '../../src/tools/ExecutionTools.js';
import { ExecutionEngine } from '../../src/execution/ExecutionEngine.js';

describe('ExecutionTools Basic Tests', () => {
  let mockExecutionEngine: jest.Mocked<ExecutionEngine>;
  let executionTools: ExecutionTools;

  beforeEach(() => {
    mockExecutionEngine = {
      submitOrder: jest.fn(),
      cancelOrder: jest.fn(),
      getOrderStatus: jest.fn(),
      getExecutionReport: jest.fn(),
      getActiveOrders: jest.fn(),
      getExecutionStatistics: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    } as any;

    executionTools = new ExecutionTools(mockExecutionEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Definitions', () => {
    it('should return correct number of tool definitions', () => {
      const definitions = executionTools.getToolDefinitions();
      expect(definitions).toHaveLength(7);
    });

    it('should include all required execution tools', () => {
      const definitions = executionTools.getToolDefinitions();
      const toolNames = definitions.map(def => def.name);

      expect(toolNames).toContain('execution_submit_order');
      expect(toolNames).toContain('execution_cancel_order');
      expect(toolNames).toContain('execution_get_order_status');
      expect(toolNames).toContain('execution_get_order_report');
      expect(toolNames).toContain('execution_list_active_orders');
      expect(toolNames).toContain('execution_get_statistics');
      expect(toolNames).toContain('execution_engine_control');
    });

    it('should have proper schema definitions', () => {
      const definitions = executionTools.getToolDefinitions();
      
      definitions.forEach(def => {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('description');
        expect(def).toHaveProperty('inputSchema');
        expect(def.inputSchema).toHaveProperty('type', 'object');
        expect(def.inputSchema).toHaveProperty('properties');
      });
    });
  });

  describe('Basic Tool Execution', () => {
    it('should handle list active orders', async () => {
      mockExecutionEngine.getActiveOrders.mockReturnValue([]);

      const result = await executionTools.handleToolCall('execution_list_active_orders', {});

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      
      if (result.content[0] && 'text' in result.content[0]) {
        const responseData = JSON.parse(result.content[0].text as string);
        expect(responseData.action).toBe('list_active_orders');
        expect(responseData.totalActive).toBe(0);
      }
    });

    it('should handle statistics request', async () => {
      mockExecutionEngine.getExecutionStatistics.mockReturnValue({
        totalOrders: 10,
        activeOrders: 0,
        completedOrders: 8,
        cancelledOrders: 2,
        failedOrders: 0,
        averageExecutionTime: 30000,
        averageSlippage: 0.001,
      });

      const result = await executionTools.handleToolCall('execution_get_statistics', {});

      expect(result.isError).toBeUndefined();
      
      if (result.content[0] && 'text' in result.content[0]) {
        const responseData = JSON.parse(result.content[0].text as string);
        expect(responseData.action).toBe('get_execution_statistics');
        expect(responseData.statistics).toBeDefined();
      }
    });

    it('should handle engine control status', async () => {
      mockExecutionEngine.getActiveOrders.mockReturnValue([]);

      const result = await executionTools.handleToolCall('execution_engine_control', {
        action: 'status',
      });

      expect(result.isError).toBeUndefined();
      
      if (result.content[0] && 'text' in result.content[0]) {
        const responseData = JSON.parse(result.content[0].text as string);
        expect(responseData.action).toBe('execution_engine_control');
        expect(responseData.result).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool names', async () => {
      const result = await executionTools.handleToolCall('unknown_tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0]?.type).toBe('text');
      
      if (result.content[0] && 'text' in result.content[0]) {
        expect(result.content[0].text).toContain('Unknown execution tool: unknown_tool');
      }
    });

    it('should handle invalid input parameters', async () => {
      const result = await executionTools.handleToolCall('execution_submit_order', {
        // Missing required parameters
      });

      expect(result.isError).toBe(true);
    });
  });
});