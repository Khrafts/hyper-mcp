import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createComponentLogger, logMCPMessage, logToolInvocation } from '../utils/logger.js';
import { getConfig } from '../config/index.js';
import { SessionManager, ISessionManager } from './SessionManager.js';
import { ToolRegistry, IToolRegistry, MCPTool } from './ToolRegistry.js';

const logger = createComponentLogger('MCP_SERVER');
const config = getConfig();

export interface MCPRequest {
  method: string;
  params?: unknown;
  id?: string | number;
  sessionId?: string;
}

export interface MCPResponse {
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id?: string | number;
}

export interface MCPNotification {
  method: string;
  params?: unknown;
}

export interface IMCPServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  registerTool(tool: MCPTool): void;
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  broadcastNotification(notification: MCPNotification): void;
  getHealthStatus(): { healthy: boolean; details: Record<string, unknown> };
}

export class MCPServer implements IMCPServer {
  private server: Server;
  private _sessionManager: ISessionManager;
  private _toolRegistry: IToolRegistry;
  private isRunning: boolean = false;
  private startTime: number = 0;

  constructor() {
    this.server = new Server(
      {
        name: 'hyperliquid-intelligence-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          logging: {},
          prompts: {},
        },
      }
    );

    this._sessionManager = new SessionManager();
    this._toolRegistry = new ToolRegistry();

    this.setupHandlers();

    logger.info('MCPServer initialized', {
      server_name: 'hyperliquid-intelligence-mcp',
      server_version: '1.0.0',
      port: config.MCP_SERVER_PORT,
    });
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const startTime = Date.now();
      logMCPMessage('incoming', 'list_tools');

      try {
        const tools = this._toolRegistry.getTools();
        const mcpTools: Tool[] = tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

        logger.info('Tools listed successfully', {
          tool_count: mcpTools.length,
          duration_ms: Date.now() - startTime,
        });

        logMCPMessage('outgoing', 'list_tools_response', undefined, {
          tool_count: mcpTools.length,
        });

        return { tools: mcpTools };
      } catch (error) {
        logger.error('Failed to list tools', {
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startTime,
        });
        throw error;
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const { name: toolName, arguments: toolArgs } = request.params;
      const sessionId = 'default'; // Extract from context if available

      logMCPMessage('incoming', 'call_tool', sessionId, {
        tool_name: toolName,
      });

      try {
        const tool = this._toolRegistry.getTool(toolName);
        if (!tool) {
          const error = `Tool '${toolName}' not found or disabled`;
          logger.warn('Tool not found', {
            tool_name: toolName,
            session_id: sessionId,
          });
          
          logToolInvocation(toolName, sessionId, startTime, false, error);
          
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error}`,
              },
            ],
          };
        }

        // Validate input if schema is provided
        if (tool.schema) {
          try {
            tool.schema.parse(toolArgs);
          } catch (validationError) {
            const error = `Invalid tool arguments: ${validationError instanceof Error ? validationError.message : String(validationError)}`;
            logger.warn('Tool argument validation failed', {
              tool_name: toolName,
              session_id: sessionId,
              error,
            });

            logToolInvocation(toolName, sessionId, startTime, false, error);

            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${error}`,
                },
              ],
            };
          }
        }

        // Execute the tool
        const result = await tool.handler(toolArgs);

        logToolInvocation(toolName, sessionId, startTime, true);

        logMCPMessage('outgoing', 'call_tool_response', sessionId, {
          tool_name: toolName,
          success: true,
        });

        // Format result for MCP response
        if (typeof result === 'string') {
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        logger.error('Tool execution failed', {
          tool_name: toolName,
          session_id: sessionId,
          error: errorMessage,
          duration_ms: Date.now() - startTime,
        });

        logToolInvocation(toolName, sessionId, startTime, false, errorMessage);

        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool '${toolName}': ${errorMessage}`,
            },
          ],
        };
      }
    });

    // Setup error handlers
    this.server.onerror = (error) => {
      logger.error('MCP Server error', {
        error: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : undefined,
      });
    };

    // Setup connection handlers
    this.server.onclose = () => {
      logger.info('MCP Server connection closed');
    };

    logger.debug('MCP Server handlers configured');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Server is already running');
      return;
    }

    try {
      this.startTime = Date.now();

      // Start server (it connects via stdio automatically)
      // The @modelcontextprotocol/sdk server doesn't need explicit connection

      this.isRunning = true;

      logger.info('MCP Server started successfully', {
        start_time: new Date(this.startTime).toISOString(),
        capabilities: ['tools', 'logging', 'prompts'],
      });

      // Register some basic test tools for validation
      this.registerDefaultTools();

      logger.info('MCP Server ready to accept connections', {
        registered_tools: this.toolRegistry.getStatistics().totalTools,
      });

    } catch (error) {
      logger.error('Failed to start MCP Server', {
        error: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Server is not running');
      return;
    }

    try {
      const shutdownStart = Date.now();

      // Cleanup sessions
      await this._sessionManager.cleanup();

      // Close server (no explicit close method in current SDK)
      // The server will clean up automatically

      this.isRunning = false;

      const shutdownDuration = Date.now() - shutdownStart;
      const totalUptime = shutdownStart - this.startTime;

      logger.info('MCP Server stopped successfully', {
        shutdown_duration_ms: shutdownDuration,
        total_uptime_ms: totalUptime,
      });

    } catch (error) {
      logger.error('Error stopping MCP Server', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  registerTool(tool: MCPTool): void {
    try {
      this._toolRegistry.register(tool.category, tool);
      
      logger.info('Tool registered with MCP Server', {
        tool_name: tool.name,
        category: tool.category,
        version: tool.version,
      });
    } catch (error) {
      logger.error('Failed to register tool', {
        tool_name: tool.name,
        category: tool.category,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();
    
    logMCPMessage('incoming', request.method, request.sessionId);

    try {
      // This is a simplified handler - the actual MCP protocol handling 
      // is done by the @modelcontextprotocol/sdk Server class
      // This method is primarily for custom request handling if needed

      logger.debug('Custom request handled', {
        method: request.method,
        session_id: request.sessionId,
        has_params: !!request.params,
        duration_ms: Date.now() - startTime,
      });

      return {
        result: { success: true },
        id: request.id,
      };
    } catch (error) {
      logger.error('Request handling failed', {
        method: request.method,
        session_id: request.sessionId,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startTime,
      });

      return {
        error: {
          code: -32603, // Internal error
          message: error instanceof Error ? error.message : 'Internal error',
        },
        id: request.id,
      };
    }
  }

  broadcastNotification(notification: MCPNotification): void {
    logMCPMessage('outgoing', notification.method, undefined, {
      has_params: !!notification.params,
    });

    // For now, just log the notification
    // In a full implementation, this would send to connected clients
    logger.info('Notification broadcasted', {
      method: notification.method,
      has_params: !!notification.params,
    });
  }

  getHealthStatus(): { healthy: boolean; details: Record<string, unknown> } {
    const sessionHealth = this._sessionManager.getHealthStatus();
    const toolHealth = this._toolRegistry.getHealthStatus();
    const uptime = this.isRunning ? Date.now() - this.startTime : 0;

    const healthy = this.isRunning && sessionHealth.healthy && toolHealth.healthy;

    return {
      healthy,
      details: {
        server_running: this.isRunning,
        uptime_ms: uptime,
        sessions: sessionHealth,
        tools: toolHealth.details,
        capabilities: ['tools', 'logging', 'prompts'],
      },
    };
  }

  // Register some basic tools for testing
  private registerDefaultTools(): void {
    // Health check tool
    this.registerTool({
      name: 'health_check',
      description: 'Check the health status of the MCP server',
      category: 'system',
      version: '1.0.0',
      enabled: true,
      handler: async () => {
        return this.getHealthStatus();
      },
    });

    // Echo tool for testing
    this.registerTool({
      name: 'echo',
      description: 'Echo back the provided message',
      category: 'test',
      version: '1.0.0',
      enabled: true,
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message to echo back',
          },
        },
        required: ['message'],
      },
      handler: async (params: any) => {
        return { echoed: params.message, timestamp: new Date().toISOString() };
      },
    });

    // System info tool
    this.registerTool({
      name: 'system_info',
      description: 'Get system information',
      category: 'system',
      version: '1.0.0',
      enabled: true,
      handler: async () => {
        const sessionStats = this._sessionManager.getStatistics();
        const toolStats = this._toolRegistry.getStatistics();

        return {
          server: {
            name: 'hyperliquid-intelligence-mcp',
            version: '1.0.0',
            uptime_ms: Date.now() - this.startTime,
            node_version: process.version,
            platform: process.platform,
            memory_usage: process.memoryUsage(),
          },
          sessions: sessionStats,
          tools: toolStats,
        };
      },
    });

    logger.info('Default tools registered', {
      tool_count: 3,
    });
  }

  // Getters for testing and monitoring
  get sessionManager(): ISessionManager {
    return this._sessionManager;
  }

  get toolRegistry(): IToolRegistry {
    return this._toolRegistry;
  }

  get isServerRunning(): boolean {
    return this.isRunning;
  }
}