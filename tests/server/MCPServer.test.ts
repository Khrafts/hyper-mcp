// Mock the MCP SDK before importing
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: class MockServer {
    constructor() {}
    setRequestHandler() {}
    onerror = null;
    onclose = null;
  },
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: {},
  ListToolsRequestSchema: {},
}));

// Mock SimpleAdapterManager to prevent real API calls
jest.mock('../../src/server/SimpleAdapterManager.js', () => ({
  SimpleAdapterManager: class MockSimpleAdapterManager {
    constructor() {}
    async initialize() {
      return Promise.resolve();
    }
    async cleanup() {
      return Promise.resolve();
    }
    getInitializedAdapters() {
      return [];
    }
    async getHealthStatus() {
      return { healthy: true };
    }
    getAdapterMetadata() {
      return {};
    }
  },
}));

import { MCPServer } from '../../src/server/MCPServer.js';
import { ToolRegistry } from '../../src/server/ToolRegistry.js';
import { SessionManager } from '../../src/server/SessionManager.js';

describe('MCPServer Tests', () => {
  let mcpServer: MCPServer;
  let mockToolRegistry: jest.Mocked<ToolRegistry>;
  let mockSessionManager: jest.Mocked<SessionManager>;

  beforeEach(() => {
    mockToolRegistry = {
      register: jest.fn(),
      unregister: jest.fn(),
      getTool: jest.fn(),
      getTools: jest.fn().mockReturnValue([]),
      validateTool: jest.fn(),
      disable: jest.fn(),
      enable: jest.fn(),
      clear: jest.fn(),
      getStatistics: jest.fn().mockReturnValue({
        totalTools: 0,
        enabledTools: 0,
        disabledTools: 0,
        toolsByCategory: {},
      }),
      getHealthStatus: jest.fn().mockReturnValue({ healthy: true }),
    } as any;

    mockSessionManager = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      updateSession: jest.fn(),
      closeSession: jest.fn(),
      getStatistics: jest.fn().mockReturnValue({ total: 0, active: 0 }),
      cleanup: jest.fn(),
      getHealthStatus: jest.fn().mockReturnValue({ healthy: true }),
    } as any;

    mcpServer = new MCPServer();
    // Replace the internal instances with mocks
    (mcpServer as any)._toolRegistry = mockToolRegistry;
    (mcpServer as any)._sessionManager = mockSessionManager;
    // AdapterManager is already mocked at module level
  });

  afterEach(async () => {
    await mcpServer.stop();
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    it('should initialize server with tool registry and session manager', () => {
      expect(mcpServer).toBeDefined();
      expect(mcpServer.isServerRunning).toBe(false);
    });

    it('should start server successfully', async () => {
      await mcpServer.start();
      expect(mcpServer.isServerRunning).toBe(true);
    });

    it('should stop server successfully', async () => {
      await mcpServer.start();
      await mcpServer.stop();
      expect(mcpServer.isServerRunning).toBe(false);
    });

    it('should handle multiple start calls gracefully', async () => {
      await mcpServer.start();
      await mcpServer.start(); // Should not throw
      expect(mcpServer.isServerRunning).toBe(true);
    });

    it('should handle multiple stop calls gracefully', async () => {
      await mcpServer.start();
      await mcpServer.stop();
      await mcpServer.stop(); // Should not throw
      expect(mcpServer.isServerRunning).toBe(false);
    });
  });

  describe('Tool Management', () => {
    beforeEach(async () => {
      await mcpServer.start();
    });

    it('should register tool successfully', () => {
      const toolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      };

      mcpServer.registerTool({
        ...toolDefinition,
        category: 'test',
        version: '1.0.0',
        enabled: true,
        handler: async () => ({ result: 'success' }),
      });

      expect(mockToolRegistry.register).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ name: 'test_tool' })
      );
    });

    it('should unregister tool successfully', () => {
      mcpServer.toolRegistry.unregister('test_tool');

      expect(mockToolRegistry.unregister).toHaveBeenCalledWith('test_tool');
    });

    it('should get all tools', () => {
      const mockTools = [
        { name: 'tool1', description: 'Tool 1' },
        { name: 'tool2', description: 'Tool 2' },
      ];
      const fullMockTools = mockTools.map((tool) => ({
        ...tool,
        category: 'test',
        version: '1.0.0',
        enabled: true,
        handler: jest.fn(),
      }));
      mockToolRegistry.getTools.mockReturnValue(fullMockTools);

      const tools = mcpServer.toolRegistry.getTools();

      expect(tools).toHaveLength(2);
      expect(mockToolRegistry.getTools).toHaveBeenCalled();
    });

    it('should call tool successfully', async () => {
      const mockResult = { success: true, data: 'test result' };
      const mockTool = {
        name: 'test_tool',
        description: 'Test tool',
        category: 'test',
        version: '1.0.0',
        enabled: true,
        handler: jest.fn().mockResolvedValue(mockResult),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      // Use handleRequest instead of direct callTool
      const response = await mcpServer.handleRequest({
        method: 'tools/call',
        params: { name: 'test_tool', arguments: { message: 'test' } },
        id: 1,
        sessionId: 'session1',
      });

      expect(response.result).toBeDefined();
      expect(mockToolRegistry.getTool).toHaveBeenCalledWith('test_tool');
    });

    it('should handle tool call errors', async () => {
      const error = new Error('Tool execution failed');
      const mockTool = {
        name: 'failing_tool',
        description: 'Failing tool',
        category: 'test',
        version: '1.0.0',
        enabled: true,
        handler: jest.fn().mockRejectedValue(error),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      const response = await mcpServer.handleRequest({
        method: 'tools/call',
        params: { name: 'failing_tool', arguments: {} },
        id: 1,
        sessionId: 'session1',
      });

      expect(response.result).toBeDefined();
      // The response should contain error information, not throw
      expect(JSON.stringify(response.result)).toContain('Tool execution failed');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await mcpServer.start();
    });

    it('should create session successfully', async () => {
      const sessionId = 'test_session_123';
      const mockSession = {
        id: sessionId,
        clientId: sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        state: {},
        capabilities: [],
        isActive: true,
      };
      mockSessionManager.createSession.mockResolvedValue(mockSession);

      const session = await mcpServer.sessionManager.createSession(sessionId);

      expect(session).toEqual(mockSession);
      expect(mockSessionManager.createSession).toHaveBeenCalledWith(sessionId);
    });

    it('should get session successfully', () => {
      const sessionId = 'test_session_123';
      const mockSession = {
        id: sessionId,
        clientId: sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        state: {},
        capabilities: [],
        isActive: true,
      };
      mockSessionManager.getSession.mockReturnValue(mockSession);

      const session = mcpServer.sessionManager.getSession(sessionId);

      expect(session).toEqual(mockSession);
      expect(mockSessionManager.getSession).toHaveBeenCalledWith(sessionId);
    });

    it('should close session successfully', async () => {
      const sessionId = 'test_session_123';
      mockSessionManager.closeSession.mockResolvedValue(undefined);

      await mcpServer.sessionManager.closeSession(sessionId);

      expect(mockSessionManager.closeSession).toHaveBeenCalledWith(sessionId);
    });

    it('should get session statistics', () => {
      const mockStats = {
        totalSessions: 2,
        activeSessions: 2,
        averageSessionDuration: 300000,
        sessionsCreatedLastHour: 1,
      };
      mockSessionManager.getStatistics.mockReturnValue(mockStats);

      const stats = mcpServer.sessionManager.getStatistics();

      expect(stats).toEqual(mockStats);
      expect(mockSessionManager.getStatistics).toHaveBeenCalled();
    });
  });

  describe('Server Statistics', () => {
    beforeEach(async () => {
      await mcpServer.start();
    });

    it('should return server statistics', async () => {
      const mockToolStats = {
        totalTools: 10,
        enabledTools: 8,
        disabledTools: 2,
        categories: 3,
        toolsByCategory: { trading: 5, market: 3, system: 2 },
      };
      mockToolRegistry.getStatistics.mockReturnValue(mockToolStats);
      mockSessionManager.getStatistics.mockReturnValue({
        totalSessions: 3,
        activeSessions: 3,
        averageSessionDuration: 300000,
        sessionsCreatedLastHour: 1,
      });

      const health = await mcpServer.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.details.server_running).toBe(true);
      expect(health.details.tools).toEqual(mockToolStats);
      expect(health.details.uptime_ms).toBeGreaterThan(0);
    });

    it('should track uptime correctly', async () => {
      await mcpServer.start();

      // Wait a small amount
      await new Promise((resolve) => setTimeout(resolve, 10));

      const health = await mcpServer.getHealthStatus();
      const uptime = health.details.uptime_ms as number;

      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(uptime).toBeLessThan(1000); // Should be less than 1 second
    });
  });

  describe('Health Checks', () => {
    it('should return healthy status when running', async () => {
      await mcpServer.start();

      const health = await mcpServer.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.details.uptime_ms).toBeGreaterThan(0);
      expect(health.details.server_running).toBe(true);
    });

    it('should return unhealthy status when stopped', async () => {
      const health = await mcpServer.getHealthStatus();

      expect(health.healthy).toBe(false);
      expect(health.details.uptime_ms).toBe(0);
    });

    it('should detect component failures', async () => {
      await mcpServer.start();

      // Mock a tool registry failure
      mockToolRegistry.getHealthStatus.mockReturnValue({
        healthy: false,
        details: { error: 'Registry failure' },
      });

      const health = await mcpServer.getHealthStatus();

      expect(health.healthy).toBe(false);
      expect(health.details.tools).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle tool registry initialization errors', async () => {
      // Mock adapter manager to throw during initialization
      const mockAdapter = (mcpServer as any)._adapterManager;
      mockAdapter.initialize = jest
        .fn()
        .mockRejectedValue(new Error('Registry initialization failed'));

      await expect(mcpServer.start()).rejects.toThrow();
    });

    it('should handle session manager initialization errors', async () => {
      // Mock adapter manager to throw during initialization
      const mockAdapter = (mcpServer as any)._adapterManager;
      mockAdapter.initialize = jest
        .fn()
        .mockRejectedValue(new Error('Session manager initialization failed'));

      await expect(mcpServer.start()).rejects.toThrow();
    });

    it('should handle shutdown errors gracefully', async () => {
      await mcpServer.start();

      mockSessionManager.cleanup.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      // Should not throw despite cleanup errors
      await mcpServer.stop();
      expect(mcpServer.isServerRunning).toBe(false);
    });
  });

  describe('Request Processing', () => {
    beforeEach(async () => {
      await mcpServer.start();
    });

    it('should handle MCP protocol messages', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      const fullMockTool = {
        name: 'test_tool',
        description: 'Test tool',
        category: 'test',
        version: '1.0.0',
        enabled: true,
        handler: jest.fn(),
      };
      mockToolRegistry.getTools.mockReturnValue([fullMockTool]);

      const response = await mcpServer.handleRequest(request);

      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
    });

    it('should handle tools/call requests', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: { message: 'hello' },
        },
      };

      const response = await mcpServer.handleRequest(request);

      expect(response.id).toBe(2);
      expect(response.result).toBeDefined();
    });

    it('should handle invalid method errors', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 3,
        method: 'invalid/method',
        params: {},
      };

      const response = await mcpServer.handleRequest(request);

      expect(response.id).toBe(3);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32603); // Internal error (simplified)
    });

    it('should handle malformed requests', async () => {
      const request = {
        // Missing jsonrpc
        id: 4,
        method: 'tools/list',
      };

      const response = await mcpServer.handleRequest(
        request as typeof request & { jsonrpc: string }
      );

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32603); // Internal error (simplified)
    });
  });
});
