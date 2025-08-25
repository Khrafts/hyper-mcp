/**
 * HyperLiquid MCP Server
 *
 * Installable MCP server for HyperLiquid DEX integration
 * Compatible with Claude Desktop, Cursor, and other MCP clients
 *
 * Usage:
 *   hyperliquid-mcp [options]
 *
 * Environment Variables:
 *   HYPERLIQUID_PRIVATE_KEY     - Your wallet private key
 *   HYPERLIQUID_USER_ADDRESS    - Your wallet address
 *   HYPERLIQUID_NETWORK         - Network to use: 'mainnet' or 'testnet' (default: mainnet)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getConfig, validateConfig, createCommunitySystemConfig } from '../config/index.js';
import { SimpleAdapterManager } from '../server/SimpleAdapterManager.js';
import { ToolRegistry } from '../server/ToolRegistry.js';
import { CommunityManager } from '../community/CommunityManager.js';
import { ToolGenerator } from '../community/generation/ToolGenerator.js';
import { createComponentLogger } from '../utils/logger.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const logger = createComponentLogger('MCP_SERVER_CLI');

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
🚀 HyperLiquid MCP Server

Transform any AI agent into a HyperLiquid trading powerhouse!

USAGE:
  hl-eco-mcp [options]

OPTIONS:
  --help, -h          Show this help message
  --version, -v       Show version information
  --check-config      Validate configuration without starting server

ENVIRONMENT VARIABLES:
  HYPERLIQUID_PRIVATE_KEY     Your wallet private key (required)
  HYPERLIQUID_USER_ADDRESS    Your wallet address (required)
  HYPERLIQUID_NETWORK         Network to use: 'mainnet' or 'testnet' (default: mainnet)

EXAMPLES:
  # Start server with testnet
  HYPERLIQUID_NETWORK=testnet hl-eco-mcp

  # Start server with mainnet (default)
  HYPERLIQUID_NETWORK=mainnet hl-eco-mcp

  # Start with custom configuration
  HYPERLIQUID_PRIVATE_KEY=0x123... HYPERLIQUID_USER_ADDRESS=0xabc... hl-eco-mcp

For installation and setup instructions, see:
https://github.com/khrafts/hyper-mcp#readme
  `);
}

/**
 * Display version information
 */
async function displayVersion() {
  try {
    const { readFile } = await import('fs/promises');
    const { dirname, join } = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packagePath = join(__dirname, '../../package.json');

    const packageContent = await readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    console.log(`${packageJson.name} v${packageJson.version}`);
  } catch (error) {
    console.log('hl-eco-mcp v0.1.0-alpha');
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const validation = validateConfig();

  if (!validation.valid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach((error) => console.error(`  - ${error}`));
    return null;
  }

  const config = getConfig();

  // Check required credentials
  if (
    !config.HYPERLIQUID_PRIVATE_KEY ||
    config.HYPERLIQUID_PRIVATE_KEY === 'your_private_key_here'
  ) {
    console.error('❌ HYPERLIQUID_PRIVATE_KEY is required');
    console.error('   Set your wallet private key in the environment');
    return null;
  }

  if (
    !config.HYPERLIQUID_USER_ADDRESS ||
    config.HYPERLIQUID_USER_ADDRESS === 'your_wallet_address_here'
  ) {
    console.error('❌ HYPERLIQUID_USER_ADDRESS is required');
    console.error('   Set your wallet address in the environment');
    return null;
  }

  return config;
}

/**
 * Display startup information
 */
function displayStartupInfo(config: ReturnType<typeof getConfig>) {
  const network = config.HYPERLIQUID_NETWORK;
  const isTestnet = network === 'testnet';

  console.error('🚀 HyperLiquid MCP Server starting...');
  console.error(`📡 Network: ${network.toUpperCase()}`);
  console.error(`👛 Address: ${config.HYPERLIQUID_USER_ADDRESS}`);
  console.error(
    `🔗 API: ${isTestnet ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz'}`
  );

  console.error('⏳ Initializing adapters...\n');
}

/**
 * Create and configure MCP server
 */
async function createMCPServer() {
  const config = validateEnvironment();
  if (!config) {
    process.exit(1);
  }

  displayStartupInfo(config);

  // Initialize components
  const toolRegistry = new ToolRegistry();
  const adapterManager = new SimpleAdapterManager(toolRegistry, {
    enableHyperLiquid: true,
    testnet: config.HYPERLIQUID_NETWORK === 'testnet',
  });

  try {
    // Initialize all adapters and tools
    await adapterManager.initialize();

    // Initialize community system if enabled
    if (config.ENABLE_COMMUNITY_SYSTEM) {
      console.error('🌐 Initializing community protocol system...');

      const communityConfig = createCommunitySystemConfig(config);
      const communityManager = new CommunityManager(communityConfig);
      const toolGenerator = new ToolGenerator();

      // Load protocols from the protocols/ directory
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const protocolsDir = join(__dirname, '../../protocols');

      try {
        const protocolFiles = await readdir(protocolsDir);
        const jsonFiles = protocolFiles.filter((file) => file.endsWith('.json'));

        console.error(`📦 Found ${jsonFiles.length} protocol files: ${jsonFiles.join(', ')}`);

        for (const file of jsonFiles) {
          try {
            const protocolPath = join(protocolsDir, file);
            const protocolName = file.replace('.json', '');

            console.error(`⚡ Loading protocol: ${protocolName}`);
            const loadedProtocol = await communityManager['loader'].loadFromFile(protocolPath);

            // Generate and register tools for this protocol
            const tools = await toolGenerator.generateTools(loadedProtocol.protocol);

            for (const tool of tools) {
              toolRegistry.register('community', {
                name: tool.name,
                description: tool.description,
                category: 'community',
                version: loadedProtocol.protocol.version || '1.0.0',
                enabled: true,
                inputSchema: tool.parameters,
                handler: tool.handler,
              });
            }

            console.error(`✅ Loaded ${tools.length} tools from ${protocolName}`);
          } catch (protocolError: any) {
            console.error(`❌ Failed to load protocol ${file}: ${protocolError.message}`);
            logger.warn('Protocol loading failed', { file, error: protocolError.message });
          }
        }
      } catch (dirError: any) {
        console.error(`⚠️  Protocols directory not found or inaccessible: ${dirError.message}`);
      }
    }

    const registeredTools = toolRegistry.getTools();
    console.error(`✅ Server ready with ${registeredTools.length} tools available`);
    console.error('📋 Available tool categories:');

    const categories = [...new Set(registeredTools.map((tool: any) => tool.category))];
    categories.forEach((category) => {
      const count = registeredTools.filter((t: any) => t.category === category).length;
      console.error(`   - ${category}: ${count} tools`);
    });

    console.error('\n🔄 MCP Server is running and waiting for client connections...\n');
  } catch (error: any) {
    console.error('❌ Failed to initialize server:', error.message);
    logger.error('Server initialization failed', { error: error.stack });
    process.exit(1);
  }

  // Create MCP server
  const server = new Server(
    {
      name: 'hl-eco-mcp',
      version: '0.1.6-alpha',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools from the registry
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = toolRegistry.getTools();
    console.error(`[MCP DEBUG] Returning ${tools.length} tools to client`);
    tools.forEach((tool: any) => {
      console.error(`[MCP DEBUG] Tool: ${tool.name} (${tool.category})`);
      console.error(`[MCP DEBUG] Tool schema type:`, typeof tool.schema, typeof tool.inputSchema);
    });
    return {
      tools: tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        // Use inputSchema directly if it exists (already in JSON Schema format)
        // otherwise try to convert from Zod schema
        inputSchema:
          tool.inputSchema ||
          (tool.schema ? zodToJsonSchema(tool.schema) : { type: 'object', properties: {} }),
      })),
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const tool = toolRegistry.getTool(name);
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('❌ Error during cleanup:', error.message);
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('\n🛑 Received SIGTERM, shutting down...');
    try {
      await adapterManager.cleanup();
      console.error('✅ Cleanup completed');
    } catch (error: any) {
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
  // Parse command line arguments
  const args = process.argv.slice(2);

  // Handle CLI options
  if (args.includes('--help') || args.includes('-h')) {
    displayHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    await displayVersion();
    process.exit(0);
  }

  if (args.includes('--check-config')) {
    const config = validateEnvironment();
    if (config) {
      console.log('✅ Configuration is valid');
      console.log(`Network: ${config.HYPERLIQUID_NETWORK.toUpperCase()}`);
      console.log(`Address: ${config.HYPERLIQUID_USER_ADDRESS}`);
    }
    process.exit(config ? 0 : 1);
  }

  try {
    const server = await createMCPServer();

    // Use stdio transport for MCP communication
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error: any) {
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
