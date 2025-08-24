import { z } from 'zod';

// Base error classification
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  PROTOCOL = 'protocol',
  CONFIGURATION = 'configuration',
  RESOURCE = 'resource',
  BUSINESS_LOGIC = 'business_logic',
  UNKNOWN = 'unknown',
}

export enum ErrorCode {
  // Network errors (1000-1099)
  NETWORK_CONNECTION_FAILED = 1000,
  NETWORK_TIMEOUT = 1001,
  NETWORK_UNREACHABLE = 1002,
  NETWORK_DNS_RESOLUTION = 1003,
  NETWORK_SSL_ERROR = 1004,
  NETWORK_REQUEST_FAILED = 1005,

  // Authentication errors (1100-1199)
  AUTH_INVALID_CREDENTIALS = 1100,
  AUTH_TOKEN_EXPIRED = 1101,
  AUTH_TOKEN_INVALID = 1102,
  AUTH_TOKEN_MISSING = 1103,
  AUTH_MISSING_CREDENTIALS = 1104,
  AUTH_UNAUTHORIZED = 1105,
  AUTH_FORBIDDEN = 1106,

  // Validation errors (1200-1299)
  VALIDATION_SCHEMA_ERROR = 1200,
  VALIDATION_REQUIRED_FIELD = 1201,
  VALIDATION_INVALID_FORMAT = 1202,
  VALIDATION_INVALID_VALUE = 1203,
  VALIDATION_RANGE_ERROR = 1204,

  // Rate limiting errors (1300-1399)
  RATE_LIMIT_EXCEEDED = 1300,
  RATE_LIMIT_QUOTA_EXCEEDED = 1301,
  RATE_LIMIT_BURST_EXCEEDED = 1302,

  // Protocol errors (1400-1499)
  PROTOCOL_VERSION_MISMATCH = 1400,
  PROTOCOL_INVALID_MESSAGE = 1401,
  PROTOCOL_UNSUPPORTED_METHOD = 1402,
  PROTOCOL_SEQUENCE_ERROR = 1403,

  // API errors (1500-1599)
  API_ENDPOINT_NOT_FOUND = 1500,
  API_METHOD_NOT_ALLOWED = 1501,
  API_PAYLOAD_TOO_LARGE = 1502,
  API_UNSUPPORTED_MEDIA_TYPE = 1503,
  API_CONFLICT = 1504,

  // Configuration errors (1600-1699)
  CONFIG_MISSING_REQUIRED = 1600,
  CONFIG_INVALID_VALUE = 1601,
  CONFIG_FILE_NOT_FOUND = 1602,
  CONFIG_PARSE_ERROR = 1603,

  // Resource errors (1700-1799)
  RESOURCE_NOT_FOUND = 1700,
  RESOURCE_ALREADY_EXISTS = 1701,
  RESOURCE_LOCKED = 1702,
  RESOURCE_EXHAUSTED = 1703,

  // Business logic errors (1800-1899)
  BUSINESS_RULE_VIOLATION = 1800,
  BUSINESS_INSUFFICIENT_BALANCE = 1801,
  BUSINESS_ORDER_INVALID = 1802,
  BUSINESS_MARKET_CLOSED = 1803,

  // System errors (1900-1999)
  SYSTEM_INTERNAL_ERROR = 1900,
  SYSTEM_SERVICE_UNAVAILABLE = 1901,
  SYSTEM_MAINTENANCE_MODE = 1902,
  SYSTEM_OVERLOADED = 1903,

  // Unknown errors (9999)
  UNKNOWN_ERROR = 9999,
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  operation?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ErrorDetails {
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  context: ErrorContext;
  cause?: Error | string;
  stack?: string;
  retryable: boolean;
  userMessage?: string;
  suggestedActions?: string[];
  documentationUrl?: string;
}

// Zod schema for error validation
export const ErrorDetailsSchema = z.object({
  code: z.nativeEnum(ErrorCode),
  category: z.nativeEnum(ErrorCategory),
  severity: z.nativeEnum(ErrorSeverity),
  message: z.string().min(1),
  context: z.object({
    requestId: z.string().optional(),
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    component: z.string().optional(),
    operation: z.string().optional(),
    timestamp: z.number().positive(),
    metadata: z.record(z.unknown()).optional(),
  }),
  cause: z.union([z.instanceof(Error), z.string()]).optional(),
  stack: z.string().optional(),
  retryable: z.boolean(),
  userMessage: z.string().optional(),
  suggestedActions: z.array(z.string()).optional(),
  documentationUrl: z.string().url().optional(),
});

// Base class for all application errors
export class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly retryable: boolean;
  public readonly userMessage?: string;
  public readonly suggestedActions?: string[];
  public readonly documentationUrl?: string;
  public readonly cause?: Error | string;

  constructor(details: ErrorDetails) {
    // Validate error details
    const validatedDetails = ErrorDetailsSchema.parse(details);

    super(validatedDetails.message);

    // Set error name to class name
    this.name = this.constructor.name;

    // Set properties
    this.code = validatedDetails.code;
    this.category = validatedDetails.category;
    this.severity = validatedDetails.severity;
    this.context = validatedDetails.context;
    this.retryable = validatedDetails.retryable;
    this.userMessage = validatedDetails.userMessage;
    this.suggestedActions = validatedDetails.suggestedActions;
    this.documentationUrl = validatedDetails.documentationUrl;
    this.cause = validatedDetails.cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Include cause stack if available
    if (details.cause instanceof Error && details.cause.stack) {
      this.stack += `\nCaused by: ${details.cause.stack}`;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      retryable: this.retryable,
      userMessage: this.userMessage,
      suggestedActions: this.suggestedActions,
      documentationUrl: this.documentationUrl,
      stack: this.stack,
      timestamp: Date.now(),
    };
  }

  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

// Network-related errors
export class NetworkError extends BaseError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext,
    cause?: Error | string,
    userMessage?: string
  ) {
    super({
      code,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      message,
      context,
      cause,
      retryable: true,
      userMessage,
      suggestedActions: [
        'Check network connectivity',
        'Verify service endpoint availability',
        'Retry the operation after a brief delay',
      ],
    });
  }
}

// Authentication-related errors
export class AuthenticationError extends BaseError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext,
    cause?: Error | string,
    userMessage?: string
  ) {
    super({
      code,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message,
      context,
      cause,
      retryable: code === ErrorCode.AUTH_TOKEN_EXPIRED,
      userMessage,
      suggestedActions: [
        'Verify authentication credentials',
        'Check token expiration',
        'Re-authenticate if necessary',
      ],
    });
  }
}

// Validation-related errors
export class ValidationError extends BaseError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext,
    cause?: Error | string,
    userMessage?: string,
    suggestedActions?: string[]
  ) {
    super({
      code,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      message,
      context,
      cause,
      retryable: false,
      userMessage,
      suggestedActions: suggestedActions || [
        'Verify input parameters',
        'Check data format requirements',
        'Review API documentation',
      ],
    });
  }
}

// Rate limiting errors
export class RateLimitError extends BaseError {
  public readonly retryAfter?: number;

  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext,
    retryAfter?: number,
    cause?: Error | string
  ) {
    super({
      code,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      message,
      context,
      cause,
      retryable: true,
      userMessage: `Rate limit exceeded. Please wait ${retryAfter ? `${Math.ceil(retryAfter / 1000)} seconds` : 'before retrying'}.`,
      suggestedActions: [
        'Reduce request frequency',
        'Implement exponential backoff',
        'Consider request batching',
      ],
    });

    this.retryAfter = retryAfter;
  }
}

// Protocol-related errors
export class ProtocolError extends BaseError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext,
    cause?: Error | string,
    userMessage?: string
  ) {
    super({
      code,
      category: ErrorCategory.PROTOCOL,
      severity: ErrorSeverity.HIGH,
      message,
      context,
      cause,
      retryable: false,
      userMessage,
      suggestedActions: [
        'Check protocol version compatibility',
        'Verify message format',
        'Review protocol documentation',
      ],
    });
  }
}

// Configuration-related errors
export class ConfigurationError extends BaseError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext,
    cause?: Error | string,
    userMessage?: string
  ) {
    super({
      code,
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      message,
      context,
      cause,
      retryable: false,
      userMessage,
      suggestedActions: [
        'Check configuration file',
        'Verify required settings',
        'Review environment variables',
      ],
    });
  }
}

// Business logic errors
export class BusinessLogicError extends BaseError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext,
    cause?: Error | string,
    userMessage?: string,
    suggestedActions?: string[]
  ) {
    super({
      code,
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      message,
      context,
      cause,
      retryable: false,
      userMessage,
      suggestedActions: suggestedActions || [
        'Review business rule requirements',
        'Check account status',
        'Verify operation permissions',
      ],
    });
  }
}

// System-related errors
export class SystemError extends BaseError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext,
    cause?: Error | string,
    userMessage?: string
  ) {
    super({
      code,
      category: ErrorCategory.SERVER_ERROR,
      severity: ErrorSeverity.CRITICAL,
      message,
      context,
      cause,
      retryable: true,
      userMessage,
      suggestedActions: [
        'Retry the operation',
        'Check system status',
        'Contact support if problem persists',
      ],
    });
  }
}
