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
import { SimpleAdapterManager } from './SimpleAdapterManager.js';
import { CommunityManager } from '../community/CommunityManager.js';
import { CommunitySystemConfig, LoadedProtocol } from '../community/types/index.js';

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
  getHealthStatus(): Promise<{ healthy: boolean; details: Record<string, unknown> }>;
  initializeCommunitySystem(config: CommunitySystemConfig): Promise<void>;
  loadCommunityProtocol(protocolName: string): Promise<void>;
  unloadCommunityProtocol(protocolName: string): Promise<void>;
}

export class MCPServer implements IMCPServer {
  private server: Server;
  private _sessionManager: ISessionManager;
  private _toolRegistry: IToolRegistry;
  private _adapterManager: SimpleAdapterManager;
  private _communityManager?: CommunityManager;
  private isRunning: boolean = false;
  private startTime: number = 0;
  private communityToolsMap: Map<string, string[]> = new Map(); // protocol -> tool names

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
    this._adapterManager = new SimpleAdapterManager(this._toolRegistry as ToolRegistry);

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
        const mcpTools: Tool[] = tools.map((tool) => ({
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

      // Initialize adapters and tools
      await this._adapterManager.initialize();

      // Start server (it connects via stdio automatically)
      // The @modelcontextprotocol/sdk server doesn't need explicit connection

      this.isRunning = true;

      logger.info('MCP Server started successfully', {
        start_time: new Date(this.startTime).toISOString(),
        capabilities: ['tools', 'logging', 'prompts'],
        adapters_initialized: this._adapterManager.getInitializedAdapters(),
      });

      // Register some basic test tools for validation
      this.registerDefaultTools();

      logger.info('MCP Server ready to accept connections', {
        registered_tools: this._toolRegistry.getStatistics().totalTools,
        adapters: this._adapterManager.getInitializedAdapters(),
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

      // Cleanup community system
      if (this._communityManager) {
        await this._communityManager.shutdown();
        this._communityManager = undefined;
      }

      // Cleanup adapters
      await this._adapterManager.cleanup();

      // Cleanup sessions
      await this._sessionManager.cleanup();

      // Clear community tools mapping
      this.communityToolsMap.clear();

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

  async getHealthStatus(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    const sessionHealth = this._sessionManager.getHealthStatus();
    const toolHealth = this._toolRegistry.getHealthStatus();
    const adapterHealth = await this._adapterManager.getHealthStatus();
    const communityHealth = this._communityManager ? {
      initialized: true,
      stats: this._communityManager.getStats(),
      loaded_protocols: this._communityManager.getLoadedProtocols().length
    } : { initialized: false };
    const uptime = this.isRunning ? Date.now() - this.startTime : 0;

    const healthy =
      this.isRunning && sessionHealth.healthy && toolHealth.healthy && adapterHealth.healthy;

    return {
      healthy,
      details: {
        server_running: this.isRunning,
        uptime_ms: uptime,
        sessions: sessionHealth,
        tools: toolHealth.details,
        adapters: adapterHealth,
        community: communityHealth,
        capabilities: ['tools', 'logging', 'prompts', ...(this._communityManager ? ['community'] : [])],
        metadata: this._adapterManager.getAdapterMetadata(),
      },
    };
  }

  async initializeCommunitySystem(config: CommunitySystemConfig): Promise<void> {
    try {
      logger.info('Initializing community system', { config });

      this._communityManager = new CommunityManager(config);

      // Set up event listeners for community events
      this._communityManager.on('protocol:loaded', (loadedProtocol: LoadedProtocol) => {
        this.onCommunityProtocolLoaded(loadedProtocol);
      });

      this._communityManager.on('protocol:unloaded', (protocolName: string) => {
        this.onCommunityProtocolUnloaded(protocolName);
      });

      this._communityManager.on('protocol:error', (protocolName: string, error: Error) => {
        logger.error('Community protocol error', {
          protocol: protocolName,
          error: error.message
        });
      });

      this._communityManager.on('submission:processed', (submission: any) => {
        logger.info('Community submission processed', {
          pr_number: submission.pullRequestNumber,
          status: submission.status,
          author: submission.author
        });
      });

      logger.info('Community system initialized successfully', {
        validation_config: config.validation,
        github_config: { repository: config.github.repository, autoMerge: config.github.autoMerge }
      });
    } catch (error) {
      logger.error('Failed to initialize community system', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async loadCommunityProtocol(protocolName: string): Promise<void> {
    if (!this._communityManager) {
      throw new Error('Community system not initialized');
    }

    try {
      logger.info('Loading community protocol', { protocol: protocolName });

      // For demonstration - in real implementation, would load from file/URL
      // This would typically be called by the community manager automatically
      // when protocols are submitted via GitHub
      throw new Error('Direct protocol loading not implemented - protocols are loaded via GitHub submissions');
    } catch (error) {
      logger.error('Failed to load community protocol', {
        protocol: protocolName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async unloadCommunityProtocol(protocolName: string): Promise<void> {
    if (!this._communityManager) {
      throw new Error('Community system not initialized');
    }

    try {
      logger.info('Unloading community protocol', { protocol: protocolName });

      // Unload from community manager
      await this._communityManager.unloadProtocol(protocolName);

      logger.info('Community protocol unloaded successfully', { protocol: protocolName });
    } catch (error) {
      logger.error('Failed to unload community protocol', {
        protocol: protocolName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private onCommunityProtocolLoaded(loadedProtocol: LoadedProtocol): void {
    try {
      const protocolName = loadedProtocol.protocol.name;
      const toolNames: string[] = [];

      logger.info('Registering community protocol tools', {
        protocol: protocolName,
        version: loadedProtocol.protocol.version,
        tool_count: loadedProtocol.tools.length
      });

      // Register each tool with the MCP server
      for (const tool of loadedProtocol.tools) {
        try {
          const mcpTool: MCPTool = {
            name: tool.name,
            description: tool.description,
            category: 'community',
            version: loadedProtocol.protocol.version,
            enabled: true,
            handler: tool.handler as (params: unknown) => Promise<unknown>,
            inputSchema: tool.parameters,
            // metadata removed - not part of MCPTool interface
          };

          this.registerTool(mcpTool);
          toolNames.push(tool.name);

          logger.debug('Community tool registered', {
            tool: tool.name,
            protocol: protocolName,
            endpoint: tool.metadata.endpoint
          });
        } catch (error) {
          logger.error('Failed to register community tool', {
            tool: tool.name,
            protocol: protocolName,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Track tools for this protocol
      this.communityToolsMap.set(protocolName, toolNames);

      logger.info('Community protocol loaded successfully', {
        protocol: protocolName,
        version: loadedProtocol.protocol.version,
        registered_tools: toolNames.length,
        total_community_protocols: this.communityToolsMap.size
      });

      // Broadcast notification about new protocol
      this.broadcastNotification({
        method: 'community/protocol_loaded',
        params: {
          protocol: protocolName,
          version: loadedProtocol.protocol.version,
          tools: toolNames,
          loaded_at: loadedProtocol.loadedAt
        }
      });
    } catch (error) {
      logger.error('Failed to process community protocol loading', {
        protocol: loadedProtocol.protocol.name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private onCommunityProtocolUnloaded(protocolName: string): void {
    try {
      const toolNames = this.communityToolsMap.get(protocolName);
      if (!toolNames) {
        logger.warn('No tools found for unloaded protocol', { protocol: protocolName });
        return;
      }

      logger.info('Unregistering community protocol tools', {
        protocol: protocolName,
        tool_count: toolNames.length
      });

      // Unregister tools from the tool registry
      for (const toolName of toolNames) {
        try {
          this._toolRegistry.unregister(toolName);
          logger.debug('Community tool unregistered', {
            tool: toolName,
            protocol: protocolName
          });
        } catch (error) {
          logger.warn('Failed to unregister community tool', {
            tool: toolName,
            protocol: protocolName,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Remove from tracking
      this.communityToolsMap.delete(protocolName);

      logger.info('Community protocol unloaded successfully', {
        protocol: protocolName,
        unregistered_tools: toolNames.length,
        remaining_community_protocols: this.communityToolsMap.size
      });

      // Broadcast notification about protocol removal
      this.broadcastNotification({
        method: 'community/protocol_unloaded',
        params: {
          protocol: protocolName,
          tools_removed: toolNames,
          unloaded_at: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to process community protocol unloading', {
        protocol: protocolName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
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
        return await this.getHealthStatus();
      },
    });

    // Community protocols tool
    this.registerTool({
      name: 'list_community_protocols',
      description: 'List all loaded community protocols',
      category: 'community',
      version: '1.0.0',
      enabled: true,
      handler: async () => {
        if (!this._communityManager) {
          return { error: 'Community system not initialized' };
        }

        const loadedProtocols = this._communityManager.getLoadedProtocols();
        const stats = this._communityManager.getStats();

        return {
          protocols: loadedProtocols.map(protocol => ({
            name: protocol.protocol.name,
            version: protocol.protocol.version,
            description: protocol.protocol.description,
            author: protocol.protocol.author,
            status: protocol.status,
            tools_count: protocol.tools.length,
            loaded_at: protocol.loadedAt
          })),
          stats,
          total_protocols: loadedProtocols.length,
          community_tools: Array.from(this.communityToolsMap.entries()).map(([protocol, tools]) => ({
            protocol,
            tools
          }))
        };
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
      tool_count: 4,
    });
  }

  // Getters for testing and monitoring
  get sessionManager(): ISessionManager {
    return this._sessionManager;
  }

  get toolRegistry(): IToolRegistry {
    return this._toolRegistry;
  }

  get communityManager(): CommunityManager | undefined {
    return this._communityManager;
  }

  get isServerRunning(): boolean {
    return this.isRunning;
  }
}
