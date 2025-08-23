#!/usr/bin/env node

import { MCPServer } from './server/MCPServer.js';
import { getConfig, validateConfig } from './config/index.js';
import { createComponentLogger } from './utils/logger.js';

const logger = createComponentLogger('MAIN');

async function main() {
  logger.info('HyperLiquid Intelligence MCP starting...');

  try {
    // Validate configuration
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      logger.error('Configuration validation failed', {
        errors: configValidation.errors,
      });
      process.exit(1);
    }

    const config = getConfig();
    logger.info('Configuration loaded successfully', {
      node_env: config.NODE_ENV,
      log_level: config.LOG_LEVEL,
      port: config.MCP_SERVER_PORT,
    });

    // Create and start MCP server
    const server = new MCPServer();

    // Setup graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', {
          error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', {
        reason: String(reason),
      });
      process.exit(1);
    });

    // Start the server
    await server.start();

    // Log successful startup
    const healthStatus = server.getHealthStatus();
    logger.info('HyperLiquid Intelligence MCP started successfully', {
      healthy: healthStatus.healthy,
      uptime_ms: healthStatus.details.uptime_ms,
      tools_registered: (healthStatus.details.tools as any)?.totalTools || 0,
    });

    // Keep process running
    logger.info('Server is running. Press Ctrl+C to stop.');
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
