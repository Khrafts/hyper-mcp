import { ErrorHandler } from '../../errors/ErrorHandler.js';
import {
  ErrorCode,
  ErrorCategory,
  ErrorContext,
  ValidationError,
  SystemError,
  NetworkError,
} from '../../errors/ErrorTypes.js';
import { createComponentLogger } from '../../utils/logger.js';
import { CommunityErrorContext } from '../types/index.js';

const logger = createComponentLogger('COMMUNITY_ERROR');

export class CommunityErrorHandler {
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = new ErrorHandler();
  }

  // Protocol validation errors
  createProtocolValidationError(message: string, context: CommunityErrorContext): ValidationError {
    const errorContext: ErrorContext = {
      component: 'CommunityManager',
      operation: 'validateProtocol',
      timestamp: Date.now(),
      metadata: {
        protocolName: context.protocolName,
        protocolVersion: context.protocolVersion,
        validationErrors: context.validationErrors,
      },
    };

    return new ValidationError(
      ErrorCode.COMMUNITY_PROTOCOL_VALIDATION_FAILED,
      message,
      errorContext,
      undefined,
      'Protocol validation failed. Please check the protocol definition.'
    );
  }

  // Protocol loading errors
  createProtocolLoadError(
    message: string,
    context: CommunityErrorContext,
    cause?: Error
  ): SystemError {
    const errorContext: ErrorContext = {
      component: 'CommunityManager',
      operation: 'loadProtocol',
      timestamp: Date.now(),
      metadata: {
        protocolName: context.protocolName,
        protocolVersion: context.protocolVersion,
      },
    };

    return new SystemError(
      ErrorCode.COMMUNITY_PROTOCOL_LOAD_FAILED,
      message,
      errorContext,
      cause,
      'Failed to load community protocol. Please try again later.'
    );
  }

  // Protocol not found errors
  createProtocolNotFoundError(protocolName: string): SystemError {
    const errorContext: ErrorContext = {
      component: 'CommunityManager',
      operation: 'getProtocol',
      timestamp: Date.now(),
      metadata: { protocolName },
    };

    return new SystemError(
      ErrorCode.COMMUNITY_PROTOCOL_NOT_FOUND,
      `Community protocol '${protocolName}' not found`,
      errorContext,
      undefined,
      'The requested protocol could not be found. Please check the protocol name.'
    );
  }

  // Tool registration errors
  createToolRegistrationError(
    message: string,
    context: CommunityErrorContext,
    cause?: Error
  ): SystemError {
    const errorContext: ErrorContext = {
      component: 'CommunityManager',
      operation: 'registerTool',
      timestamp: Date.now(),
      metadata: {
        toolName: context.toolName,
        protocolName: context.protocolName,
        endpoint: context.endpoint,
      },
    };

    return new SystemError(
      ErrorCode.COMMUNITY_TOOL_REGISTRATION_FAILED,
      message,
      errorContext,
      cause,
      'Failed to register community tool. Please check the tool configuration.'
    );
  }

  // GitHub integration errors
  createGitHubError(message: string, context: CommunityErrorContext, cause?: Error): NetworkError {
    const errorContext: ErrorContext = {
      component: 'GitHubIntegration',
      operation: 'processSubmission',
      timestamp: Date.now(),
      metadata: {
        pullRequestNumber: context.pullRequestNumber,
        author: context.author,
        submissionId: context.submissionId,
      },
    };

    return new NetworkError(
      ErrorCode.COMMUNITY_GITHUB_INTEGRATION_ERROR,
      message,
      errorContext,
      cause,
      'GitHub integration error. Please check your GitHub configuration.'
    );
  }

  // Submission processing errors
  createSubmissionProcessingError(
    message: string,
    context: CommunityErrorContext,
    cause?: Error
  ): SystemError {
    const errorContext: ErrorContext = {
      component: 'CommunityManager',
      operation: 'handleSubmission',
      timestamp: Date.now(),
      metadata: {
        pullRequestNumber: context.pullRequestNumber,
        author: context.author,
        protocolName: context.protocolName,
      },
    };

    return new SystemError(
      ErrorCode.COMMUNITY_SUBMISSION_PROCESSING_ERROR,
      message,
      errorContext,
      cause,
      'Failed to process protocol submission. Please try again later.'
    );
  }

  // Schema generation errors
  createSchemaGenerationError(message: string, protocolName: string, cause?: Error): SystemError {
    const errorContext: ErrorContext = {
      component: 'SchemaGenerator',
      operation: 'generateSchema',
      timestamp: Date.now(),
      metadata: { protocolName },
    };

    return new SystemError(
      ErrorCode.COMMUNITY_SCHEMA_GENERATION_FAILED,
      message,
      errorContext,
      cause,
      'Failed to generate schema. Please check the protocol definition.'
    );
  }

  // Configuration errors
  createConfigurationError(message: string, cause?: Error): SystemError {
    const errorContext: ErrorContext = {
      component: 'CommunityManager',
      operation: 'initialize',
      timestamp: Date.now(),
      metadata: {},
    };

    return new SystemError(
      ErrorCode.COMMUNITY_CONFIGURATION_ERROR,
      message,
      errorContext,
      cause,
      'Community system configuration error. Please check your configuration.'
    );
  }

  // Handle any community-related error
  handleCommunityError(error: unknown, context?: CommunityErrorContext): SystemError {
    const enrichedContext: ErrorContext = {
      component: 'CommunitySystem',
      operation: 'unknown',
      timestamp: Date.now(),
      metadata: context,
    };

    return this.errorHandler.handleError(error, enrichedContext) as SystemError;
  }

  // Execute community operation with automatic retry
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: CommunityErrorContext
  ): Promise<T> {
    const enrichedContext: ErrorContext = {
      component: 'CommunitySystem',
      operation: operationName,
      timestamp: Date.now(),
      metadata: context,
    };

    return this.errorHandler.executeWithRecovery(operation, enrichedContext);
  }

  // Get current error metrics for community system
  getCommunityErrorMetrics() {
    const allMetrics = this.errorHandler.getMetrics();
    return {
      communityErrors: allMetrics.errorsByCategory[ErrorCategory.COMMUNITY] || 0,
      totalErrors: allMetrics.totalErrors,
      retrySuccessRate:
        allMetrics.retryAttempts > 0 ? allMetrics.successfulRetries / allMetrics.retryAttempts : 1,
    };
  }

  // Log community error with structured logging
  logError(error: Error, context?: CommunityErrorContext): void {
    logger.error('Community system error', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }
}

// Export singleton instance
export const communityErrorHandler = new CommunityErrorHandler();
