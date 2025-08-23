import { z } from 'zod';
import { 
  ValidationError, 
  ErrorCode
} from '../errors/ErrorTypes.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('VALIDATION_UTILS');

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: ValidationError;
  errors?: string[];
}

export interface ValidationContext {
  component: string;
  operation: string;
  fieldPath?: string;
  metadata?: Record<string, unknown>;
}

// Common validation schemas
export const CommonSchemas = {
  // String validations
  nonEmptyString: z.string().min(1, 'String cannot be empty'),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Number validations
  positiveNumber: z.number().positive('Number must be positive'),
  nonNegativeNumber: z.number().min(0, 'Number cannot be negative'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  
  // Date validations
  futureDate: z.date().refine(date => date > new Date(), 'Date must be in the future'),
  pastDate: z.date().refine(date => date < new Date(), 'Date must be in the past'),
  
  // Trading-specific validations
  price: z.number().positive('Price must be positive').multipleOf(0.01, 'Price must have at most 2 decimal places'),
  quantity: z.number().positive('Quantity must be positive'),
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9-]+$/, 'Symbol must contain only uppercase letters, numbers, and hyphens'),
  
  // Pagination
  pagination: z.object({
    page: z.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.number().int().min(1).max(1000, 'Limit must be between 1 and 1000').default(50),
  }),
  
  // Common query filters
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).refine(
    data => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
    'Start date must be before or equal to end date'
  ),
};

// HyperLiquid-specific schemas
export const HyperLiquidSchemas = {
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  orderType: z.enum(['market', 'limit', 'stop', 'stop_limit'], {
    errorMap: () => ({ message: 'Order type must be one of: market, limit, stop, stop_limit' })
  }),
  side: z.enum(['buy', 'sell'], {
    errorMap: () => ({ message: 'Side must be either buy or sell' })
  }),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK'], {
    errorMap: () => ({ message: 'Time in force must be one of: GTC, IOC, FOK' })
  }),
  leverage: z.number().min(1).max(50, 'Leverage must be between 1 and 50'),
};

// GlueX-specific schemas
export const GlueXSchemas = {
  chainId: z.number().int().positive('Chain ID must be a positive integer'),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address format'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid decimal string'),
  slippage: z.number().min(0).max(50, 'Slippage must be between 0 and 50 percent'),
  deadline: z.number().int().positive('Deadline must be a positive integer'),
};

export class ValidationUtils {
  private static instance: ValidationUtils;
  private customValidators = new Map<string, z.ZodSchema>();

  private constructor() {
    logger.debug('ValidationUtils initialized');
  }

  static getInstance(): ValidationUtils {
    if (!ValidationUtils.instance) {
      ValidationUtils.instance = new ValidationUtils();
    }
    return ValidationUtils.instance;
  }

  // Validate data against a schema
  validate<T>(
    schema: z.ZodSchema<T>, 
    data: unknown, 
    context: ValidationContext
  ): ValidationResult<T> {
    try {
      const validatedData = schema.parse(data);
      
      logger.debug('Validation successful', {
        component: context.component,
        operation: context.operation,
        field_path: context.fieldPath,
      });

      return {
        success: true,
        data: validatedData,
      };

    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.handleZodError(error, context);
      }

      // Handle unexpected validation errors
      const validationError = new ValidationError(
        ErrorCode.VALIDATION_SCHEMA_ERROR,
        `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          component: context.component,
          operation: context.operation,
          timestamp: Date.now(),
          metadata: {
            fieldPath: context.fieldPath,
            ...context.metadata,
          },
        },
        error instanceof Error ? error : undefined,
        'Data validation failed due to an unexpected error'
      );

      return {
        success: false,
        error: validationError,
        errors: [validationError.message],
      };
    }
  }

  // Handle Zod validation errors
  private handleZodError(zodError: z.ZodError, context: ValidationContext): ValidationResult {
    const errors = zodError.errors.map(err => {
      const path = err.path.length > 0 ? err.path.join('.') : 'root';
      return `${path}: ${err.message}`;
    });

    const errorMessage = `Validation failed: ${errors.join(', ')}`;

    // Determine specific error code based on error type
    let errorCode = ErrorCode.VALIDATION_SCHEMA_ERROR;
    if (zodError.errors.some(err => err.code === 'invalid_type' && err.expected === 'string' && err.received === 'undefined')) {
      errorCode = ErrorCode.VALIDATION_REQUIRED_FIELD;
    } else if (zodError.errors.some(err => err.code === 'invalid_string')) {
      errorCode = ErrorCode.VALIDATION_INVALID_FORMAT;
    } else if (zodError.errors.some(err => err.code === 'too_small' || err.code === 'too_big')) {
      errorCode = ErrorCode.VALIDATION_RANGE_ERROR;
    }

    const validationError = new ValidationError(
      errorCode,
      errorMessage,
      {
        component: context.component,
        operation: context.operation,
        timestamp: Date.now(),
        metadata: {
          fieldPath: context.fieldPath,
          zodErrors: zodError.errors,
          ...context.metadata,
        },
      },
      zodError,
      'Please check the provided data and try again',
      errors.map(error => `Fix: ${error}`)
    );

    logger.warn('Validation failed', {
      component: context.component,
      operation: context.operation,
      field_path: context.fieldPath,
      errors: errors,
      error_count: zodError.errors.length,
    });

    return {
      success: false,
      error: validationError,
      errors,
    };
  }

  // Validate with custom error messages
  validateWithCustomMessages<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context: ValidationContext,
    customMessages?: Record<string, string>
  ): ValidationResult<T> {
    if (customMessages) {
      // Create schema with custom error messages
      const customSchema = schema.refine(
        () => true,
        {
          message: 'Custom validation failed',
          params: { customMessages }
        }
      );
      
      return this.validate(customSchema, data, context);
    }

    return this.validate(schema, data, context);
  }

  // Validate array of objects
  validateArray<T>(
    itemSchema: z.ZodSchema<T>,
    data: unknown[],
    context: ValidationContext
  ): ValidationResult<T[]> {
    const arraySchema = z.array(itemSchema);
    return this.validate(arraySchema, data, context);
  }

  // Validate partial object (useful for updates)
  validatePartial<T>(
    schema: z.ZodObject<any>,
    data: unknown,
    context: ValidationContext
  ): ValidationResult<Partial<T>> {
    const partialSchema = schema.partial();
    const result = this.validate(partialSchema, data, context);
    return result as ValidationResult<Partial<T>>;
  }

  // Validate with transformation
  validateAndTransform<T, U extends T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context: ValidationContext,
    transform: (data: T) => U
  ): ValidationResult<U> {
    const result = this.validate(schema, data, context);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        errors: result.errors
      };
    }

    try {
      const transformedData = transform(result.data);
      return {
        success: true,
        data: transformedData,
      };
    } catch (error) {
      const transformError = new ValidationError(
        ErrorCode.VALIDATION_SCHEMA_ERROR,
        `Data transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          component: context.component,
          operation: context.operation,
          timestamp: Date.now(),
          metadata: {
            fieldPath: context.fieldPath,
            ...context.metadata,
          },
        },
        error instanceof Error ? error : undefined,
        'Data transformation failed'
      );

      return {
        success: false,
        error: transformError,
        errors: [transformError.message],
      };
    }
  }

  // Register custom validator
  registerCustomValidator(name: string, schema: z.ZodSchema): void {
    this.customValidators.set(name, schema);
    
    logger.debug('Custom validator registered', {
      validator_name: name,
      total_validators: this.customValidators.size,
    });
  }

  // Get custom validator
  getCustomValidator(name: string): z.ZodSchema | undefined {
    return this.customValidators.get(name);
  }

  // Validate using custom validator
  validateWithCustomValidator<T>(
    validatorName: string,
    data: unknown,
    context: ValidationContext
  ): ValidationResult<T> {
    const validator = this.customValidators.get(validatorName);
    
    if (!validator) {
      const error = new ValidationError(
        ErrorCode.VALIDATION_SCHEMA_ERROR,
        `Custom validator not found: ${validatorName}`,
        {
          component: context.component,
          operation: context.operation,
          timestamp: Date.now(),
          metadata: { validatorName, ...context.metadata },
        },
        undefined,
        `Validator ${validatorName} is not registered`
      );

      return {
        success: false,
        error,
        errors: [error.message],
      };
    }

    return this.validate(validator, data, context);
  }

  // Validate multiple fields with different schemas
  validateMultiple(
    validations: Array<{
      name: string;
      schema: z.ZodSchema;
      data: unknown;
    }>,
    context: ValidationContext
  ): ValidationResult<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    const errors: string[] = [];
    let hasErrors = false;

    for (const validation of validations) {
      const fieldContext: ValidationContext = {
        ...context,
        fieldPath: validation.name,
      };

      const result = this.validate(validation.schema, validation.data, fieldContext);
      
      if (result.success && result.data !== undefined) {
        results[validation.name] = result.data;
      } else if (result.errors) {
        hasErrors = true;
        errors.push(...result.errors.map(error => `${validation.name}: ${error}`));
      }
    }

    if (hasErrors) {
      const validationError = new ValidationError(
        ErrorCode.VALIDATION_SCHEMA_ERROR,
        `Multiple validation errors: ${errors.join(', ')}`,
        {
          component: context.component,
          operation: context.operation,
          timestamp: Date.now(),
          metadata: context.metadata,
        },
        undefined,
        'Multiple fields contain validation errors',
        errors
      );

      return {
        success: false,
        error: validationError,
        errors,
      };
    }

    return {
      success: true,
      data: results,
    };
  }

  // Create conditional validator
  createConditionalValidator<T>(
    condition: (data: any) => boolean,
    trueSchema: z.ZodSchema<T>,
    falseSchema: z.ZodSchema<T>
  ): z.ZodSchema<T> {
    return z.any().superRefine((data, ctx) => {
      const schema = condition(data) ? trueSchema : falseSchema;
      const result = schema.safeParse(data);
      
      if (!result.success) {
        result.error.errors.forEach(error => {
          ctx.addIssue(error);
        });
      }
    }) as z.ZodSchema<T>;
  }

  // Sanitize and validate input
  sanitizeAndValidate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context: ValidationContext,
    sanitizers: Array<(data: any) => any> = []
  ): ValidationResult<T> {
    try {
      // Apply sanitizers
      let sanitizedData = data;
      for (const sanitizer of sanitizers) {
        sanitizedData = sanitizer(sanitizedData);
      }

      return this.validate(schema, sanitizedData, context);
    } catch (error) {
      const sanitizationError = new ValidationError(
        ErrorCode.VALIDATION_SCHEMA_ERROR,
        `Data sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          component: context.component,
          operation: context.operation,
          timestamp: Date.now(),
          metadata: context.metadata,
        },
        error instanceof Error ? error : undefined,
        'Data sanitization failed'
      );

      return {
        success: false,
        error: sanitizationError,
        errors: [sanitizationError.message],
      };
    }
  }

  // Get all registered validators
  getRegisteredValidators(): string[] {
    return Array.from(this.customValidators.keys());
  }

  // Clear all custom validators
  clearCustomValidators(): void {
    const count = this.customValidators.size;
    this.customValidators.clear();
    
    logger.info('Custom validators cleared', {
      cleared_count: count,
    });
  }
}

// Export singleton instance
export const validationUtils = ValidationUtils.getInstance();

// Common sanitizers
export const Sanitizers = {
  trimStrings: (data: any): any => {
    if (typeof data === 'string') {
      return data.trim();
    }
    if (Array.isArray(data)) {
      return data.map(Sanitizers.trimStrings);
    }
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = Sanitizers.trimStrings(value);
      }
      return sanitized;
    }
    return data;
  },

  toLowerCase: (data: any): any => {
    if (typeof data === 'string') {
      return data.toLowerCase();
    }
    return data;
  },

  toUpperCase: (data: any): any => {
    if (typeof data === 'string') {
      return data.toUpperCase();
    }
    return data;
  },

  removeExtraSpaces: (data: any): any => {
    if (typeof data === 'string') {
      return data.replace(/\s+/g, ' ').trim();
    }
    return data;
  },

  removeNullUndefined: (data: any): any => {
    if (Array.isArray(data)) {
      return data.filter(item => item !== null && item !== undefined)
                .map(Sanitizers.removeNullUndefined);
    }
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          sanitized[key] = Sanitizers.removeNullUndefined(value);
        }
      }
      return sanitized;
    }
    return data;
  },
};