import {
  SimpleHyperLiquidAdapter,
  SimpleHyperLiquidConfig,
} from '../adapters/hyperliquid/SimpleHyperLiquidAdapter.js';
import { SimpleHyperLiquidTools } from '../tools/SimpleHyperLiquidTools.js';
import { SimpleGlueXAdapter, SimpleGlueXConfig } from '../adapters/gluex/SimpleGlueXAdapter.js';
import { SimpleGlueXTools } from '../tools/SimpleGlueXTools.js';
import { MarketIntelligenceTools } from '../tools/MarketIntelligenceTools.js';
import { ExecutionEngine } from '../execution/ExecutionEngine.js';
import { ExecutionTools } from '../tools/ExecutionTools.js';
import { RiskManagementEngine } from '../risk/RiskManagementEngine.js';
import { RiskManagementTools } from '../tools/RiskManagementTools.js';
import { HyperLiquidNodeInfoAdapter } from '../adapters/hyperliquid/HyperLiquidNodeInfoAdapter.js';
import { NodeInfoTools } from '../tools/NodeInfoTools.js';
// import { MarketIntelligence } from '../analytics/MarketIntelligence.js';
import { createComponentLogger } from '../utils/logger.js';
import { getConfig, createConfigSections } from '../config/index.js';
import { ToolRegistry } from './ToolRegistry.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const logger = createComponentLogger('SIMPLE_ADAPTER_MANAGER');

export interface SimpleAdapterManagerConfig {
  enableHyperLiquid?: boolean;
  enableGlueX?: boolean;
  testnet?: boolean;
}

export class SimpleAdapterManager {
  private hyperLiquidAdapter?: SimpleHyperLiquidAdapter;
  private hyperLiquidTools?: SimpleHyperLiquidTools;
  private glueXAdapter?: SimpleGlueXAdapter;
  private glueXTools?: SimpleGlueXTools;
  private marketIntelligenceTools?: MarketIntelligenceTools;
  // Market intelligence for tools initialization
  // private _marketIntelligence?: MarketIntelligence;
  private executionEngine?: ExecutionEngine;
  private executionTools?: ExecutionTools;
  private riskEngine?: RiskManagementEngine;
  private riskTools?: RiskManagementTools;
  private nodeInfoAdapter?: HyperLiquidNodeInfoAdapter;
  private nodeInfoTools?: NodeInfoTools;
  private toolRegistry: ToolRegistry;
  private config: SimpleAdapterManagerConfig;

  constructor(toolRegistry: ToolRegistry, config?: SimpleAdapterManagerConfig) {
    this.toolRegistry = toolRegistry;
    this.config = {
      enableHyperLiquid: config?.enableHyperLiquid ?? true,
      enableGlueX: config?.enableGlueX ?? true,
      testnet: config?.testnet ?? false,
    };

    logger.info('SimpleAdapterManager initialized', {
      hyperliquid_enabled: this.config.enableHyperLiquid,
      gluex_enabled: this.config.enableGlueX,
      testnet: this.config.testnet,
    });
  }

  async initialize(): Promise<void> {
    const appConfig = getConfig();
    const sections = createConfigSections(appConfig);

    try {
      if (this.config.enableHyperLiquid) {
        await this.initializeHyperLiquid(sections);
      }

      if (this.config.enableGlueX) {
        await this.initializeGlueX(sections);
      }

      logger.info('SimpleAdapterManager initialization completed', {
        adapters_initialized: this.getInitializedAdapters(),
      });
    } catch (error) {
      logger.error('Failed to initialize adapters', { error });
      throw error;
    }
  }

  private async initializeHyperLiquid(
    sections: ReturnType<typeof createConfigSections>
  ): Promise<void> {
    try {
      // Create adapter configuration
      const adapterConfig: SimpleHyperLiquidConfig = {
        name: 'hyperliquid',
        baseUrl: sections.hyperliquid.apiBaseUrl,
        wsUrl: sections.hyperliquid.wsUrl,
        privateKey: sections.hyperliquid.secretKey,
        address: sections.hyperliquid.userAddress,
        testnet: sections.hyperliquid.testnet,
        timeout: sections.rateLimiting.apiTimeoutMs,
      };

      // Initialize adapter
      this.hyperLiquidAdapter = new SimpleHyperLiquidAdapter(adapterConfig);
      await this.hyperLiquidAdapter.connect();

      // Initialize node info adapter (optional)
      this.nodeInfoAdapter = new HyperLiquidNodeInfoAdapter({
        name: 'hyperliquid-node-info',
        baseUrl: sections.nodeInfo.apiBaseUrl,
        timeout: sections.rateLimiting.apiTimeoutMs,
      });

      // Initialize market intelligence and advanced engines
      // this._marketIntelligence = new MarketIntelligence(this.hyperLiquidAdapter);
      this.executionEngine = new ExecutionEngine(this.hyperLiquidAdapter);
      this.riskEngine = new RiskManagementEngine(this.hyperLiquidAdapter);

      // Initialize tools
      this.hyperLiquidTools = new SimpleHyperLiquidTools(this.hyperLiquidAdapter);
      this.marketIntelligenceTools = new MarketIntelligenceTools(this.hyperLiquidAdapter);
      this.executionTools = new ExecutionTools(this.executionEngine);
      this.riskTools = new RiskManagementTools(this.riskEngine);

      // Node info tools are registered only if the endpoint is reachable
      try {
        const nodeHealth = await this.nodeInfoAdapter.healthCheck();
        if (nodeHealth.healthy) {
          this.nodeInfoTools = new NodeInfoTools(this.nodeInfoAdapter);
          this.registerNodeInfoTools();
          logger.info('Node Info tools enabled', { base_url: sections.nodeInfo.apiBaseUrl });
        } else {
          logger.warn('Node Info API unreachable; Node Info tools disabled', {
            base_url: sections.nodeInfo.apiBaseUrl,
            details: nodeHealth.details,
          });
          this.nodeInfoAdapter = undefined as unknown as HyperLiquidNodeInfoAdapter;
        }
      } catch (e) {
        logger.warn('Node Info API health check failed; Node Info tools disabled', {
          base_url: sections.nodeInfo.apiBaseUrl,
          error: e instanceof Error ? e.message : String(e),
        });
        this.nodeInfoAdapter = undefined as unknown as HyperLiquidNodeInfoAdapter;
      }

      // Register all tools
      this.registerHyperLiquidTools();
      this.registerMarketIntelligenceTools();
      this.registerExecutionTools();
      this.registerRiskManagementTools();

      logger.info('HyperLiquid adapter initialized successfully', {
        metadata: this.hyperLiquidAdapter.getMetadata(),
      });
    } catch (error) {
      logger.error('Failed to initialize HyperLiquid adapter', { error });
      throw error;
    }
  }

  private async initializeGlueX(sections: ReturnType<typeof createConfigSections>): Promise<void> {
    try {
      // Create adapter configuration
      const adapterConfig: SimpleGlueXConfig = {
        name: 'gluex',
        baseUrl: sections.gluex.apiBaseUrl,
        apiKey: sections.gluex.apiKey,
        timeout: sections.rateLimiting.apiTimeoutMs,
      };

      // Initialize adapter
      this.glueXAdapter = new SimpleGlueXAdapter(adapterConfig);
      await this.glueXAdapter.initialize();

      // Initialize tools
      this.glueXTools = new SimpleGlueXTools(this.glueXAdapter);

      // Register all tools
      this.registerGlueXTools();

      logger.info('GlueX adapter initialized successfully', {
        metadata: this.glueXAdapter.getMetadata(),
      });
    } catch (error) {
      logger.error('Failed to initialize GlueX adapter', { error });
      throw error;
    }
  }

  private registerHyperLiquidTools(): void {
    if (!this.hyperLiquidTools) {
      throw new Error('HyperLiquid tools not initialized');
    }

    const toolDefinitions = this.hyperLiquidTools.getToolDefinitions();

    for (const toolDef of toolDefinitions) {
      this.toolRegistry.register('hyperliquid', {
        name: toolDef.name,
        description: toolDef.description,
        category: 'hyperliquid',
        version: '1.0.0',
        enabled: true,
        inputSchema: toolDef.inputSchema,
        handler: async (args: unknown): Promise<CallToolResult> => {
          return await this.hyperLiquidTools!.handleToolCall(toolDef.name, args);
        },
      });

      logger.debug('Registered HyperLiquid tool', {
        tool_name: toolDef.name,
        description: toolDef.description,
      });
    }

    logger.info('HyperLiquid tools registered', {
      tool_count: toolDefinitions.length,
    });
  }

  private registerGlueXTools(): void {
    if (!this.glueXTools) {
      throw new Error('GlueX tools not initialized');
    }

    const toolDefinitions = this.glueXTools.getToolDefinitions();

    for (const toolDef of toolDefinitions) {
      this.toolRegistry.register('gluex', {
        name: toolDef.name,
        description: toolDef.description,
        category: 'gluex',
        version: '1.0.0',
        enabled: true,
        inputSchema: toolDef.inputSchema,
        handler: async (args: unknown): Promise<CallToolResult> => {
          return await this.glueXTools!.handleToolCall(toolDef.name, args);
        },
      });

      logger.debug('Registered GlueX tool', {
        tool_name: toolDef.name,
        description: toolDef.description,
      });
    }

    logger.info('GlueX tools registered', {
      tool_count: toolDefinitions.length,
    });
  }

  private registerMarketIntelligenceTools(): void {
    if (!this.marketIntelligenceTools) {
      throw new Error('Market intelligence tools not initialized');
    }

    const toolDefinitions = this.marketIntelligenceTools.getToolDefinitions();

    for (const toolDef of toolDefinitions) {
      this.toolRegistry.register('market_intelligence', {
        name: toolDef.name,
        description: toolDef.description,
        category: 'market_intelligence',
        version: '1.0.0',
        enabled: true,
        inputSchema: toolDef.inputSchema,
        handler: async (args: unknown): Promise<CallToolResult> => {
          return await this.marketIntelligenceTools!.handleToolCall(toolDef.name, args);
        },
      });

      logger.debug('Registered Market Intelligence tool', {
        tool_name: toolDef.name,
        description: toolDef.description,
      });
    }

    logger.info('Market Intelligence tools registered', {
      tool_count: toolDefinitions.length,
    });
  }

  private registerExecutionTools(): void {
    if (!this.executionTools) {
      throw new Error('Execution tools not initialized');
    }

    const toolDefinitions = this.executionTools.getToolDefinitions();

    for (const toolDef of toolDefinitions) {
      this.toolRegistry.register('execution', {
        name: toolDef.name,
        description: toolDef.description,
        category: 'execution',
        version: '1.0.0',
        enabled: true,
        inputSchema: toolDef.inputSchema,
        handler: async (args: unknown): Promise<CallToolResult> => {
          return await this.executionTools!.handleToolCall(toolDef.name, args);
        },
      });

      logger.debug('Registered Execution tool', {
        tool_name: toolDef.name,
        description: toolDef.description,
      });
    }

    logger.info('Execution tools registered', {
      tool_count: toolDefinitions.length,
    });
  }

  private registerRiskManagementTools(): void {
    if (!this.riskTools) {
      throw new Error('Risk management tools not initialized');
    }

    const toolDefinitions = this.riskTools.getToolDefinitions();

    for (const toolDef of toolDefinitions) {
      this.toolRegistry.register('risk_management', {
        name: toolDef.name,
        description: toolDef.description,
        category: 'risk_management',
        version: '1.0.0',
        enabled: true,
        inputSchema: toolDef.inputSchema,
        handler: async (args: unknown): Promise<CallToolResult> => {
          return await this.riskTools!.handleToolCall(toolDef.name, args);
        },
      });

      logger.debug('Registered Risk Management tool', {
        tool_name: toolDef.name,
        description: toolDef.description,
      });
    }

    logger.info('Risk Management tools registered', {
      tool_count: toolDefinitions.length,
    });
  }

  private registerNodeInfoTools(): void {
    if (!this.nodeInfoTools) {
      throw new Error('Node info tools not initialized');
    }

    const toolDefinitions = this.nodeInfoTools.getToolDefinitions();

    for (const toolDef of toolDefinitions) {
      this.toolRegistry.register('node_info', {
        name: toolDef.name,
        description: toolDef.description,
        category: 'node_info',
        version: '1.0.0',
        enabled: true,
        inputSchema: toolDef.inputSchema,
        handler: async (args: unknown): Promise<CallToolResult> => {
          return await this.nodeInfoTools!.handleToolCall(toolDef.name, args);
        },
      });

      logger.debug('Registered Node Info tool', {
        tool_name: toolDef.name,
        description: toolDef.description,
      });
    }

    logger.info('Node Info tools registered', {
      tool_count: toolDefinitions.length,
    });
  }

  async cleanup(): Promise<void> {
    try {
      if (this.executionEngine) {
        await this.executionEngine.stop();
      }

      if (this.riskEngine) {
        await this.riskEngine.stop();
      }

      if (this.hyperLiquidAdapter) {
        await this.hyperLiquidAdapter.disconnect();
      }

      if (this.glueXAdapter) {
        await this.glueXAdapter.disconnect();
      }

      if (this.nodeInfoAdapter) {
        await this.nodeInfoAdapter.disconnect();
      }

      logger.info('SimpleAdapterManager cleanup completed');
    } catch (error) {
      logger.error('Error during SimpleAdapterManager cleanup', { error });
      throw error;
    }
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    adapters: Record<string, { healthy: boolean; details?: Record<string, unknown> }>;
  }> {
    const adapters: Record<string, { healthy: boolean; details?: Record<string, unknown> }> = {};

    if (this.hyperLiquidAdapter) {
      try {
        const health = await this.hyperLiquidAdapter.healthCheck();
        adapters.hyperliquid = {
          healthy: health.healthy,
          details: health.details,
        };
      } catch (error) {
        adapters.hyperliquid = {
          healthy: false,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }

    if (this.glueXAdapter) {
      try {
        const health = await this.glueXAdapter.healthCheck();
        adapters.gluex = {
          healthy: health.healthy,
          details: health.details,
        };
      } catch (error) {
        adapters.gluex = {
          healthy: false,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }

    const overallHealthy = Object.values(adapters).every((adapter) => adapter.healthy);

    return {
      healthy: overallHealthy,
      adapters,
    };
  }

  getInitializedAdapters(): string[] {
    const adapters: string[] = [];

    if (this.hyperLiquidAdapter) {
      adapters.push('hyperliquid');
    }

    if (this.glueXAdapter) {
      adapters.push('gluex');
    }

    return adapters;
  }

  getAdapterMetadata(): Record<string, Record<string, unknown>> {
    const metadata: Record<string, Record<string, unknown>> = {};

    if (this.hyperLiquidAdapter) {
      metadata.hyperliquid = this.hyperLiquidAdapter.getMetadata() as unknown as Record<
        string,
        unknown
      >;
    }

    if (this.glueXAdapter) {
      metadata.gluex = this.glueXAdapter.getMetadata() as unknown as Record<string, unknown>;
    }

    return metadata;
  }

  // Getter methods for direct access (if needed)
  getHyperLiquidAdapter(): SimpleHyperLiquidAdapter | undefined {
    return this.hyperLiquidAdapter;
  }

  getHyperLiquidTools(): SimpleHyperLiquidTools | undefined {
    return this.hyperLiquidTools;
  }

  getGlueXAdapter(): SimpleGlueXAdapter | undefined {
    return this.glueXAdapter;
  }

  getGlueXTools(): SimpleGlueXTools | undefined {
    return this.glueXTools;
  }

  getMarketIntelligenceTools(): MarketIntelligenceTools | undefined {
    return this.marketIntelligenceTools;
  }

  getExecutionEngine(): ExecutionEngine | undefined {
    return this.executionEngine;
  }

  getExecutionTools(): ExecutionTools | undefined {
    return this.executionTools;
  }

  getRiskEngine(): RiskManagementEngine | undefined {
    return this.riskEngine;
  }

  getRiskTools(): RiskManagementTools | undefined {
    return this.riskTools;
  }

  getNodeInfoAdapter(): HyperLiquidNodeInfoAdapter | undefined {
    return this.nodeInfoAdapter;
  }

  getNodeInfoTools(): NodeInfoTools | undefined {
    return this.nodeInfoTools;
  }
}
