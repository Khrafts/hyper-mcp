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

import { getConfig, validateConfig, createCommunitySystemConfig } from '../config/index.js';
import { MCPServer } from '../server/MCPServer.js';
import { createComponentLogger } from '../utils/logger.js';
import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ProtocolValidator } from '../community/validation/ProtocolValidator.js';
import { ToolGenerator } from '../community/generation/ToolGenerator.js';

const logger = createComponentLogger('MCP_SERVER_CLI');

/**
 * Validate a single protocol file
 */
async function validateProtocol(protocolPath: string): Promise<boolean> {
  try {
    console.log(`\n🔍 Validating protocol: ${protocolPath}`);

    // Read protocol file
    const protocolContent = await readFile(protocolPath, 'utf-8');
    const protocol = JSON.parse(protocolContent);

    // Validate protocol structure
    const validator = new ProtocolValidator({
      strictMode: true,
      maxEndpoints: 50,
      requiredFields: ['name', 'version', 'description', 'author', 'license'],
    });
    const validationResult = await validator.validate(protocol);

    if (!validationResult.valid) {
      console.error('❌ Protocol validation failed:');
      validationResult.errors.forEach((error) => {
        console.error(`   - ${error}`);
      });
      if (validationResult.warnings.length > 0) {
        console.warn('⚠️  Warnings:');
        validationResult.warnings.forEach((warning) => {
          console.warn(`   - ${warning}`);
        });
      }
      return false;
    }

    // Test tool generation
    console.log('🔧 Testing tool generation...');
    const toolGenerator = new ToolGenerator();
    const tools = await toolGenerator.generateTools(protocol);

    console.log(`✅ Protocol is valid!`);
    console.log(`   Name: ${protocol.name}`);
    console.log(`   Version: ${protocol.version}`);
    console.log(`   Tools generated: ${tools.length}`);

    if (tools.length > 0) {
      console.log('   Generated tools:');
      tools.forEach((tool) => {
        console.log(`     - ${tool.name}: ${tool.description}`);
      });
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Error validating protocol: ${error.message}`);
    return false;
  }
}

/**
 * Validate all protocols in a directory
 */
async function validateAllProtocols(protocolsDir: string): Promise<boolean> {
  try {
    console.log(`\n📂 Validating all protocols in: ${protocolsDir}`);

    const files = await readdir(protocolsDir);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.warn('⚠️  No protocol files found in directory');
      return true;
    }

    console.log(`Found ${jsonFiles.length} protocol file(s)\n`);

    let allValid = true;
    const results: { file: string; valid: boolean; tools: number }[] = [];

    for (const file of jsonFiles) {
      const protocolPath = join(protocolsDir, file);
      const valid = await validateProtocol(protocolPath);

      if (valid) {
        // Get tool count for summary
        const protocolContent = await readFile(protocolPath, 'utf-8');
        const protocol = JSON.parse(protocolContent);
        const toolGenerator = new ToolGenerator();
        const tools = await toolGenerator.generateTools(protocol);
        results.push({ file, valid: true, tools: tools.length });
      } else {
        results.push({ file, valid: false, tools: 0 });
        allValid = false;
      }
    }

    // Print summary
    console.log('\n📊 Validation Summary:');
    console.log('─'.repeat(60));
    results.forEach((result) => {
      const status = result.valid ? '✅' : '❌';
      const toolsInfo = result.valid ? ` (${result.tools} tools)` : '';
      console.log(`${status} ${result.file}${toolsInfo}`);
    });
    console.log('─'.repeat(60));

    const validCount = results.filter((r) => r.valid).length;
    const totalTools = results.reduce((sum, r) => sum + r.tools, 0);

    console.log(`Valid protocols: ${validCount}/${results.length}`);
    if (validCount > 0) {
      console.log(`Total tools available: ${totalTools}`);
    }

    return allValid;
  } catch (error: any) {
    console.error(`❌ Error validating protocols: ${error.message}`);
    return false;
  }
}

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
  --help, -h                     Show this help message
  --version, -v                  Show version information
  --check-config                 Validate configuration without starting server
  --validate-protocol <path>     Validate a single protocol file
  --validate-all-protocols       Validate all protocols in ./protocols directory

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

  # Validate a specific protocol
  hl-eco-mcp --validate-protocol protocols/gluex-protocol.json

  # Validate all protocols
  hl-eco-mcp --validate-all-protocols

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

  // Private key is only required for write operations
  // Read-only operations can proceed without it
  const hasPrivateKey =
    config.HYPERLIQUID_PRIVATE_KEY && config.HYPERLIQUID_PRIVATE_KEY !== 'your_private_key_here';

  const hasAddress =
    config.HYPERLIQUID_USER_ADDRESS &&
    config.HYPERLIQUID_USER_ADDRESS !== 'your_wallet_address_here';

  if (!hasPrivateKey) {
    console.warn('⚠️  HYPERLIQUID_PRIVATE_KEY not configured');
    console.warn('   Running in read-only mode (no trading operations available)');
  }

  if (!hasAddress) {
    console.warn('⚠️  HYPERLIQUID_USER_ADDRESS not configured');
    console.warn('   Account-specific operations will not be available');
  }

  return config;
}

/**
 * Display startup information
 */
function displayStartupInfo(config: ReturnType<typeof getConfig>) {
  const network = config.HYPERLIQUID_NETWORK;
  const isTestnet = network === 'testnet';

  const hasPrivateKey =
    config.HYPERLIQUID_PRIVATE_KEY && config.HYPERLIQUID_PRIVATE_KEY !== 'your_private_key_here';
  const hasAddress =
    config.HYPERLIQUID_USER_ADDRESS &&
    config.HYPERLIQUID_USER_ADDRESS !== 'your_wallet_address_here';

  console.error('🚀 HyperLiquid MCP Server starting...');
  console.error(`📡 Network: ${network.toUpperCase()}`);

  if (hasAddress) {
    console.error(`👛 Address: ${config.HYPERLIQUID_USER_ADDRESS}`);
  }

  if (hasPrivateKey) {
    console.error('🔐 Mode: Full access (read/write)');
  } else {
    console.error('👁️  Mode: Read-only (no private key configured)');
  }

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

  // Create MCPServer
  const mcpServer = new MCPServer();

  try {
    // The MCPServer automatically initializes adapters internally

    // Initialize community system if enabled
    if (config.ENABLE_COMMUNITY_SYSTEM) {
      console.error('🌐 Initializing community protocol system...');

      const communityConfig = createCommunitySystemConfig(config);
      await mcpServer.initializeCommunitySystem(communityConfig);

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

            // Use proper community manager method
            if (mcpServer.communityManager) {
              const protocolContent = await readFile(protocolPath, 'utf-8');
              const protocolData = JSON.parse(protocolContent);
              const loadedProtocol = await mcpServer.communityManager.loadProtocol(protocolData);

              console.error(`✅ Loaded ${loadedProtocol.tools.length} tools from ${protocolName}`);
            }
          } catch (protocolError: any) {
            console.error(`❌ Failed to load protocol ${file}: ${protocolError.message}`);
          }
        }
      } catch (dirError: any) {
        console.error(`⚠️  Protocols directory not found or inaccessible: ${dirError.message}`);
      }
    }

    const registeredTools = mcpServer.toolRegistry.getTools();
    console.error(`✅ Server ready with ${registeredTools.length} tools available`);
    console.error('📋 Available tool categories:');

    const categories = [...new Set(registeredTools.map((tool: any) => tool.category))];
    categories.forEach((category) => {
      const count = registeredTools.filter((t: any) => t.category === category).length;
      console.error(`   - ${category}: ${count} tools`);
    });

    console.error('\n🔄 MCP Server is running and waiting for client connections...\n');

    return mcpServer;
  } catch (error: any) {
    console.error('❌ Failed to initialize server:', error.message);
    process.exit(1);
  }
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
      const hasPrivateKey =
        config.HYPERLIQUID_PRIVATE_KEY &&
        config.HYPERLIQUID_PRIVATE_KEY !== 'your_private_key_here';
      const hasAddress =
        config.HYPERLIQUID_USER_ADDRESS &&
        config.HYPERLIQUID_USER_ADDRESS !== 'your_wallet_address_here';

      console.log('✅ Configuration is valid');
      console.log(`Network: ${config.HYPERLIQUID_NETWORK.toUpperCase()}`);

      if (hasAddress) {
        console.log(`Address: ${config.HYPERLIQUID_USER_ADDRESS}`);
      } else {
        console.log('Address: Not configured (read-only mode)');
      }

      if (hasPrivateKey) {
        console.log('Mode: Full access (read/write)');
      } else {
        console.log('Mode: Read-only');
      }
    }
    process.exit(config ? 0 : 1);
  }

  // Handle protocol validation commands
  const validateProtocolIndex = args.indexOf('--validate-protocol');
  if (validateProtocolIndex !== -1) {
    const protocolPath = args[validateProtocolIndex + 1];
    if (!protocolPath) {
      console.error('❌ Error: --validate-protocol requires a file path');
      console.error('Usage: hl-eco-mcp --validate-protocol <path>');
      process.exit(1);
    }

    const resolvedPath = resolve(protocolPath);
    const success = await validateProtocol(resolvedPath);
    process.exit(success ? 0 : 1);
  }

  if (args.includes('--validate-all-protocols')) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const protocolsDir = join(__dirname, '../../protocols');

    const success = await validateAllProtocols(protocolsDir);
    process.exit(success ? 0 : 1);
  }

  try {
    const mcpServer = await createMCPServer();

    // Start the MCP server (handles stdio transport internally)
    await mcpServer.start();
  } catch (error: any) {
    console.error('❌ Failed to start MCP server:', error.message);
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
