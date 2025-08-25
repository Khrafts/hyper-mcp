#!/usr/bin/env node

/**
 * HyperLiquid MCP Server
 *
 * Installable MCP server for HyperLiquid DEX integration
 * Compatible with Claude Desktop, Cursor, and other MCP clients
 *
 * Usage:
 *   hyperliquid-mcp-server [options]
 *
 * Environment Variables:
 *   HYPERLIQUID_PRIVATE_KEY     - Your wallet private key
 *   HYPERLIQUID_USER_ADDRESS    - Your wallet address
 *   HYPERLIQUID_TESTNET         - Set to 'true' for testnet (default: false)
 *   GLUEX_API_KEY              - Optional GlueX API key for cross-chain
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getConfig, validateConfig } from '../dist/src/config/index.js';
import { SimpleAdapterManager } from '../dist/src/server/SimpleAdapterManager.js';
import { ToolRegistry } from '../dist/src/server/ToolRegistry.js';
import { createComponentLogger } from '../dist/src/utils/logger.js';

const logger = createComponentLogger('MCP_SERVER_CLI');

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const validation = validateConfig();

  if (!validation.valid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  const config = getConfig();

  // Check required credentials
  if (
    !config.HYPERLIQUID_PRIVATE_KEY ||
    config.HYPERLIQUID_PRIVATE_KEY === 'your_private_key_here'
  ) {
    console.error('❌ HYPERLIQUID_PRIVATE_KEY is required');
    console.error('   Set your wallet private key in the environment');
    process.exit(1);
  }

  if (
    !config.HYPERLIQUID_USER_ADDRESS ||
    config.HYPERLIQUID_USER_ADDRESS === 'your_wallet_address_here'
  ) {
    console.error('❌ HYPERLIQUID_USER_ADDRESS is required');
    console.error('   Set your wallet address in the environment');
    process.exit(1);
  }

  return config;
}

/**
 * Display startup information
 */
function displayStartupInfo(config) {
  const network = config.HYPERLIQUID_TESTNET ? 'TESTNET' : 'MAINNET';

  console.error('🚀 HyperLiquid MCP Server starting...');
  console.error(`📡 Network: ${network}`);
  console.error(`👛 Address: ${config.HYPERLIQUID_USER_ADDRESS}`);
  console.error(
    `🔗 API: ${config.HYPERLIQUID_TESTNET ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz'}`
  );

  if (config.GLUEX_API_KEY && config.GLUEX_API_KEY !== 'your_gluex_api_key_here') {
    console.error('✅ GlueX integration enabled');
  }

  console.error('⏳ Initializing adapters...\n');
}

/**
 * Create and configure MCP server
 */
async function createMCPServer() {
  const config = validateEnvironment();
  displayStartupInfo(config);

  // Initialize components
  const toolRegistry = new ToolRegistry();
  const adapterManager = new SimpleAdapterManager(toolRegistry);

  try {
    // Initialize all adapters and tools
    await adapterManager.initialize();

    const registeredTools = toolRegistry.getAllTools();
    console.error(`✅ Server ready with ${registeredTools.length} tools available`);
    console.error('📋 Available tool categories:');

    const categories = [...new Set(registeredTools.map((tool) => tool.category))];
    categories.forEach((category) => {
      const count = registeredTools.filter((t) => t.category === category).length;
      console.error(`   - ${category}: ${count} tools`);
    });

    console.error('\n🔄 MCP Server is running and waiting for client connections...\n');
  } catch (error) {
    console.error('❌ Failed to initialize server:', error.message);
    logger.error('Server initialization failed', { error: error.stack });
    process.exit(1);
  }

  // Create MCP server
  const server = new Server(
    {
      name: 'hyperliquid-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  // Register all tools from the registry
  server.setRequestHandler('tools/list', async () => {
    const tools = toolRegistry.getAllTools();
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.schema,
      })),
    };
  });

  // Handle tool execution
  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const tool = toolRegistry.getToolByName(name);
      if (!tool) {
        throw new Error(`Tool '${name}' not found`);
      }

      logger.debug('Executing tool', { name, category: tool.category });
      const result = await tool.handler(args || {});

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Tool execution failed', { name, error: error.message });

      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('\n🛑 Shutting down HyperLiquid MCP Server...');
    try {
      await adapterManager.cleanup();
      console.error('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('\n🛑 Received SIGTERM, shutting down...');
    try {
      await adapterManager.cleanup();
      console.error('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }
    process.exit(0);
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  try {
    const server = await createMCPServer();

    // Use stdio transport for MCP communication
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error.message);
    logger.error('Server startup failed', { error: error.stack });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  logger.error('Uncaught exception', { error: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the server
main();
