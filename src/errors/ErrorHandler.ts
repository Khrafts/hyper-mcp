import {
  BaseError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  NetworkError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  SystemError,
} from './ErrorTypes.js';
import { createComponentLogger, logError } from '../utils/logger.js';

const logger = createComponentLogger('ERROR_HANDLER');

export interface ErrorRecoveryStrategy {
  shouldRetry: boolean;
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  customRecovery?: (error: BaseError, attempt: number) => Promise<boolean>;
}

export interface ErrorHandlerConfig {
  enableGlobalHandler: boolean;
  enableConsoleLogging: boolean;
  enableMetrics: boolean;
  defaultRetryStrategy: ErrorRecoveryStrategy;
  categorizedStrategies: Record<ErrorCategory, ErrorRecoveryStrategy>;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByCode: Record<ErrorCode, number>;
  retryAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageRecoveryTime: number;
}

export class ErrorHandler {
  private metrics!: ErrorMetrics;
  private readonly config: ErrorHandlerConfig;
  private readonly recoveryStrategies: Map<ErrorCode, ErrorRecoveryStrategy>;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.initializeMetrics();
    this.config = {
      enableGlobalHandler: config?.enableGlobalHandler ?? true,
      enableConsoleLogging: config?.enableConsoleLogging ?? true,
      enableMetrics: config?.enableMetrics ?? true,
      defaultRetryStrategy: {
        shouldRetry: true,
        maxRetries: 3,
        backoffMs: 1000,
        backoffMultiplier: 2,
        maxBackoffMs: 30000,
        ...config?.defaultRetryStrategy,
      },
      categorizedStrategies: {
        [ErrorCategory.NETWORK]: {
          shouldRetry: true,
          maxRetries: 5,
          backoffMs: 1000,
          backoffMultiplier: 2,
          maxBackoffMs: 30000,
        },
        [ErrorCategory.RATE_LIMIT]: {
          shouldRetry: true,
          maxRetries: 3,
          backoffMs: 5000,
          backoffMultiplier: 1.5,
          maxBackoffMs: 60000,
        },
        [ErrorCategory.AUTHENTICATION]: {
          shouldRetry: false,
          maxRetries: 1,
          backoffMs: 0,
          backoffMultiplier: 1,
          maxBackoffMs: 0,
        },
        [ErrorCategory.VALIDATION]: {
          shouldRetry: false,
          maxRetries: 0,
          backoffMs: 0,
          backoffMultiplier: 1,
          maxBackoffMs: 0,
        },
        [ErrorCategory.AUTHORIZATION]: {
          shouldRetry: false,
          maxRetries: 0,
          backoffMs: 0,
          backoffMultiplier: 1,
          maxBackoffMs: 0,
        },
        [ErrorCategory.NOT_FOUND]: {
          shouldRetry: false,
          maxRetries: 1,
          backoffMs: 1000,
          backoffMultiplier: 1,
          maxBackoffMs: 1000,
        },
        [ErrorCategory.TIMEOUT]: {
          shouldRetry: true,
          maxRetries: 3,
          backoffMs: 2000,
          backoffMultiplier: 2,
          maxBackoffMs: 20000,
        },
        [ErrorCategory.SERVER_ERROR]: {
          shouldRetry: true,
          maxRetries: 3,
          backoffMs: 1500,
          backoffMultiplier: 2,
          maxBackoffMs: 30000,
        },
        [ErrorCategory.CLIENT_ERROR]: {
          shouldRetry: false,
          maxRetries: 0,
          backoffMs: 0,
          backoffMultiplier: 1,
          maxBackoffMs: 0,
        },
        [ErrorCategory.CONFLICT]: {
          shouldRetry: false,
          maxRetries: 1,
          backoffMs: 500,
          backoffMultiplier: 1,
          maxBackoffMs: 500,
        },
        [ErrorCategory.PROTOCOL]: {
          shouldRetry: false,
          maxRetries: 0,
          backoffMs: 0,
          backoffMultiplier: 1,
          maxBackoffMs: 0,
        },
        [ErrorCategory.CONFIGURATION]: {
          shouldRetry: false,
          maxRetries: 0,
          backoffMs: 0,
          backoffMultiplier: 1,
          maxBackoffMs: 0,
        },
        [ErrorCategory.RESOURCE]: {
          shouldRetry: true,
          maxRetries: 2,
          backoffMs: 2000,
          backoffMultiplier: 2,
          maxBackoffMs: 10000,
        },
        [ErrorCategory.BUSINESS_LOGIC]: {
          shouldRetry: false,
          maxRetries: 0,
          backoffMs: 0,
          backoffMultiplier: 1,
          maxBackoffMs: 0,
        },
        [ErrorCategory.UNKNOWN]: {
          shouldRetry: true,
          maxRetries: 1,
          backoffMs: 1000,
          backoffMultiplier: 1,
          maxBackoffMs: 1000,
        },
        [ErrorCategory.COMMUNITY]: {
          shouldRetry: true,
          maxRetries: 3,
          backoffMs: 2000,
          backoffMultiplier: 2,
          maxBackoffMs: 30000,
        },
        ...config?.categorizedStrategies,
      },
    };

    this.recoveryStrategies = new Map();

    if (this.config.enableGlobalHandler) {
      this.setupGlobalErrorHandlers();
    }

    logger.info('ErrorHandler initialized', {
      global_handler_enabled: this.config.enableGlobalHandler,
      console_logging_enabled: this.config.enableConsoleLogging,
      metrics_enabled: this.config.enableMetrics,
    });
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByCode: {} as Record<ErrorCode, number>,
      retryAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRecoveryTime: 0,
    };

    // Initialize category counters
    Object.values(ErrorCategory).forEach((category) => {
      this.metrics.errorsByCategory[category] = 0;
    });

    // Initialize severity counters
    Object.values(ErrorSeverity).forEach((severity) => {
      this.metrics.errorsBySeverity[severity] = 0;
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      const error = this.normalizeError(reason, {
        component: 'GLOBAL_HANDLER',
        operation: 'unhandled_rejection',
        timestamp: Date.now(),
      });

      this.handleError(error);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      const normalizedError = this.normalizeError(error, {
        component: 'GLOBAL_HANDLER',
        operation: 'uncaught_exception',
        timestamp: Date.now(),
      });

      this.handleError(normalizedError);

      // Exit gracefully after logging
      setTimeout(() => process.exit(1), 1000);
    });
  }

  // Main error handling method
  handleError(error: unknown, context?: Partial<ErrorContext>): BaseError {
    const normalizedError = this.normalizeError(error, {
      timestamp: Date.now(),
      ...context,
    });

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateMetrics(normalizedError);
    }

    // Log the error
    this.logError(normalizedError);

    // Handle console logging if enabled
    if (this.config.enableConsoleLogging) {
      console.error('Error occurred:', normalizedError.toString());
      if (normalizedError.stack) {
        console.error('Stack trace:', normalizedError.stack);
      }
    }

    return normalizedError;
  }

  // Normalize different error types to BaseError
  normalizeError(error: unknown, context: ErrorContext): BaseError {
    if (error instanceof BaseError) {
      // Update context with additional information
      return new (error.constructor as typeof BaseError)({
        code: error.code,
        category: error.category,
        severity: error.severity,
        message: error.message,
        context: { ...error.context, ...context },
        cause: error.cause,
        retryable: error.retryable,
        userMessage: error.userMessage,
        suggestedActions: error.suggestedActions,
        documentationUrl: error.documentationUrl,
      });
    }

    if (error instanceof Error) {
      return this.classifyStandardError(error, context);
    }

    // Handle non-Error objects
    return new SystemError(
      ErrorCode.UNKNOWN_ERROR,
      `Unknown error: ${String(error)}`,
      context,
      String(error),
      'An unexpected error occurred'
    );
  }

  // Classify standard JavaScript errors
  private classifyStandardError(error: Error, context: ErrorContext): BaseError {
    const message = error.message.toLowerCase();

    // Network-related errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('etimedout')
    ) {
      return new NetworkError(
        ErrorCode.NETWORK_CONNECTION_FAILED,
        error.message,
        context,
        error,
        'Network connection failed. Please check your internet connection.'
      );
    }

    // Timeout errors
    if (message.includes('timeout')) {
      return new NetworkError(
        ErrorCode.NETWORK_TIMEOUT,
        error.message,
        context,
        error,
        'Request timed out. Please try again.'
      );
    }

    // Authentication errors
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('401')
    ) {
      return new AuthenticationError(
        ErrorCode.AUTH_UNAUTHORIZED,
        error.message,
        context,
        error,
        'Authentication required. Please log in.'
      );
    }

    // Validation errors
    if (
      error.name === 'ValidationError' ||
      message.includes('validation') ||
      message.includes('invalid')
    ) {
      return new ValidationError(
        ErrorCode.VALIDATION_SCHEMA_ERROR,
        error.message,
        context,
        error,
        'Invalid input provided. Please check your data.'
      );
    }

    // Rate limit errors
    if (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')
    ) {
      return new RateLimitError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        error.message,
        context,
        undefined,
        error
      );
    }

    // Default to system error
    return new SystemError(
      ErrorCode.SYSTEM_INTERNAL_ERROR,
      error.message,
      context,
      error,
      'An internal error occurred. Please try again later.'
    );
  }

  // Execute operation with automatic retry and recovery
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    customStrategy?: Partial<ErrorRecoveryStrategy>
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: BaseError;
    let attempt = 0;

    for (;;) {
      try {
        const result = await operation();

        // Log successful recovery if this wasn't the first attempt
        if (attempt > 0) {
          this.metrics.successfulRetries++;
          this.updateAverageRecoveryTime(Date.now() - startTime);

          logger.info('Operation recovered successfully', {
            component: context.component,
            operation: context.operation,
            attempts: attempt + 1,
            recovery_time_ms: Date.now() - startTime,
          });
        }

        return result;
      } catch (error) {
        attempt++;
        lastError = this.handleError(error, context);

        // Get recovery strategy
        const strategy = this.getRecoveryStrategy(lastError, customStrategy);

        // Check if we should retry
        if (!strategy.shouldRetry || attempt > strategy.maxRetries) {
          this.metrics.failedRetries++;

          logger.error('Operation failed after retries', {
            component: context.component,
            operation: context.operation,
            attempts: attempt,
            error_code: lastError.code,
            error_category: lastError.category,
          });

          throw lastError;
        }

        // Execute custom recovery if available
        if (strategy.customRecovery) {
          try {
            const recovered = await strategy.customRecovery(lastError, attempt);
            if (!recovered) {
              throw lastError;
            }
          } catch (recoveryError) {
            logger.error('Custom recovery failed', {
              component: context.component,
              operation: context.operation,
              attempt,
              recovery_error:
                recoveryError instanceof Error ? recoveryError.message : 'Unknown error',
            });
            throw lastError;
          }
        }

        // Calculate backoff delay
        const backoffMs = Math.min(
          strategy.backoffMs * Math.pow(strategy.backoffMultiplier, attempt - 1),
          strategy.maxBackoffMs
        );

        this.metrics.retryAttempts++;

        logger.debug('Retrying operation after backoff', {
          component: context.component,
          operation: context.operation,
          attempt,
          backoff_ms: backoffMs,
          error_code: lastError.code,
        });

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // Get recovery strategy for an error
  private getRecoveryStrategy(
    error: BaseError,
    customStrategy?: Partial<ErrorRecoveryStrategy>
  ): ErrorRecoveryStrategy {
    // Check for error-specific strategy
    const errorStrategy = this.recoveryStrategies.get(error.code);
    if (errorStrategy) {
      return { ...errorStrategy, ...customStrategy };
    }

    // Use category-based strategy
    const categoryStrategy = this.config.categorizedStrategies[error.category];
    if (categoryStrategy) {
      return { ...categoryStrategy, ...customStrategy };
    }

    // Fall back to default strategy
    return { ...this.config.defaultRetryStrategy, ...customStrategy };
  }

  // Register custom recovery strategy
  registerRecoveryStrategy(errorCode: ErrorCode, strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(errorCode, strategy);

    logger.debug('Recovery strategy registered', {
      error_code: errorCode,
      should_retry: strategy.shouldRetry,
      max_retries: strategy.maxRetries,
    });
  }

  // Update error metrics
  private updateMetrics(error: BaseError): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByCategory[error.category]++;
    this.metrics.errorsBySeverity[error.severity]++;
    this.metrics.errorsByCode[error.code] = (this.metrics.errorsByCode[error.code] || 0) + 1;
  }

  // Update average recovery time
  private updateAverageRecoveryTime(recoveryTime: number): void {
    const totalRecoveries = this.metrics.successfulRetries;
    const currentAverage = this.metrics.averageRecoveryTime;

    this.metrics.averageRecoveryTime =
      (currentAverage * (totalRecoveries - 1) + recoveryTime) / totalRecoveries;
  }

  // Log error with appropriate level
  private logError(error: BaseError): void {
    const logData = {
      error_code: error.code,
      error_category: error.category,
      error_severity: error.severity,
      component: error.context.component,
      operation: error.context.operation,
      request_id: error.context.requestId,
      user_id: error.context.userId,
      session_id: error.context.sessionId,
      retryable: error.retryable,
      metadata: error.context.metadata,
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        logger.debug(error.message, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(error.message, logData);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        logError(error.context.component || 'UNKNOWN', error, logData);
        break;
    }
  }

  // Get current metrics
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  // Reset metrics
  resetMetrics(): void {
    this.initializeMetrics();
    logger.info('Error metrics reset');
  }

  // Get health status
  getHealthStatus(): { healthy: boolean; details: Record<string, unknown> } {
    const errorRate = this.metrics.totalErrors / Math.max(1, Date.now() - 3600000); // errors per hour
    const criticalErrors = this.metrics.errorsBySeverity[ErrorSeverity.CRITICAL] || 0;
    const retrySuccessRate =
      this.metrics.retryAttempts > 0
        ? this.metrics.successfulRetries / this.metrics.retryAttempts
        : 1;

    const healthy = errorRate < 100 && criticalErrors < 10 && retrySuccessRate > 0.5;

    return {
      healthy,
      details: {
        error_rate_per_hour: errorRate,
        critical_errors: criticalErrors,
        retry_success_rate: retrySuccessRate,
        total_errors: this.metrics.totalErrors,
        metrics: this.metrics,
      },
    };
  }

  // Cleanup
  cleanup(): void {
    // Remove global error handlers if they were set up
    if (this.config.enableGlobalHandler) {
      process.removeAllListeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
    }

    logger.info('ErrorHandler cleanup completed');
  }
}
