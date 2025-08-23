// Error types and classes
export * from './ErrorTypes.js';
export * from './ErrorHandler.js';

// Re-export commonly used types for convenience
export type {
  ErrorContext,
  ErrorDetails
} from './ErrorTypes.js';

export type {
  ErrorRecoveryStrategy,
  ErrorHandlerConfig,
  ErrorMetrics
} from './ErrorHandler.js';

export {
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  BaseError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  ProtocolError,
  ConfigurationError,
  BusinessLogicError,
  SystemError
} from './ErrorTypes.js';