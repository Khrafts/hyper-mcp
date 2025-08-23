import winston from 'winston';
import { getConfig } from '../config/index.js';

const config = getConfig();

// Custom log format with timestamp, level, component, and structured data
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, component, ...meta }) => {
    const logObject = {
      timestamp,
      level: level.toUpperCase(),
      component: component || 'UNKNOWN',
      message,
      ...meta,
    };
    
    return JSON.stringify(logObject);
  })
);

// Create the main logger instance
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: 'hyperliquid-mcp',
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // File transports for production
    ...(config.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
          }),
        ]
      : []),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
  exitOnError: false,
});

// Component-specific logger factory
export function createComponentLogger(component: string) {
  return {
    error: (message: string, meta?: Record<string, unknown>) =>
      logger.error(message, { component, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) =>
      logger.warn(message, { component, ...meta }),
    info: (message: string, meta?: Record<string, unknown>) =>
      logger.info(message, { component, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) =>
      logger.debug(message, { component, ...meta }),
  };
}

// Performance logging utilities
export function logPerformance(
  component: string,
  operation: string,
  startTime: number,
  meta?: Record<string, unknown>
) {
  const duration = Date.now() - startTime;
  logger.info('Performance metric', {
    component,
    operation,
    duration_ms: duration,
    ...meta,
  });
  
  // Warn if operation is slow
  if (duration > 1000) {
    logger.warn('Slow operation detected', {
      component,
      operation,
      duration_ms: duration,
      ...meta,
    });
  }
}

// Request/response logging
export function logRequest(
  component: string,
  method: string,
  url: string,
  startTime: number
) {
  const duration = Date.now() - startTime;
  logger.info('API Request', {
    component,
    method,
    url,
    duration_ms: duration,
  });
}

export function logResponse(
  component: string,
  method: string,
  url: string,
  statusCode: number,
  startTime: number,
  responseSize?: number
) {
  const duration = Date.now() - startTime;
  logger.info('API Response', {
    component,
    method,
    url,
    status_code: statusCode,
    duration_ms: duration,
    response_size_bytes: responseSize,
  });
}

// Error logging with context
export function logError(
  component: string,
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  if (error instanceof Error) {
    logger.error('Error occurred', {
      component,
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  } else {
    logger.error('Unknown error occurred', {
      component,
      error: String(error),
      ...context,
    });
  }
}

// MCP-specific logging
export function logMCPMessage(
  direction: 'incoming' | 'outgoing',
  messageType: string,
  sessionId?: string,
  meta?: Record<string, unknown>
) {
  logger.debug('MCP Message', {
    component: 'MCP_SERVER',
    direction,
    message_type: messageType,
    session_id: sessionId,
    ...meta,
  });
}

export function logToolInvocation(
  toolName: string,
  sessionId: string,
  startTime: number,
  success: boolean,
  error?: string
) {
  const duration = Date.now() - startTime;
  
  if (success) {
    logger.info('Tool invocation successful', {
      component: 'TOOL_EXECUTION',
      tool_name: toolName,
      session_id: sessionId,
      duration_ms: duration,
      success: true,
    });
  } else {
    logger.error('Tool invocation failed', {
      component: 'TOOL_EXECUTION',
      tool_name: toolName,
      session_id: sessionId,
      duration_ms: duration,
      success: false,
      error_message: error,
    });
  }
}

// System health logging
export function logHealthCheck(
  component: string,
  healthy: boolean,
  details?: Record<string, unknown>
) {
  if (healthy) {
    logger.debug('Health check passed', {
      component,
      healthy: true,
      ...details,
    });
  } else {
    logger.warn('Health check failed', {
      component,
      healthy: false,
      ...details,
    });
  }
}

// Connection logging
export function logConnection(
  component: string,
  event: 'connected' | 'disconnected' | 'reconnecting',
  target: string,
  meta?: Record<string, unknown>
) {
  logger.info('Connection event', {
    component,
    connection_event: event,
    target,
    ...meta,
  });
}

export default logger;