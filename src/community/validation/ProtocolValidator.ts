import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import {
  CommunityProtocol,
  ProtocolEndpoint,
  ParameterDefinition,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../types/index.js';

export interface ValidationConfig {
  strictMode: boolean;
  maxEndpoints: number;
  allowedDomains?: string[];
  requiredFields: string[];
}

export class ProtocolValidator {
  private config: ValidationConfig;
  private protocolSchema!: z.ZodSchema;
  private endpointSchema!: z.ZodSchema;
  private parameterSchema!: z.ZodSchema;

  constructor(config: ValidationConfig) {
    this.config = config;
    this.setupSchemas();
    logger.debug('ProtocolValidator initialized', { config });
  }

  private setupSchemas(): void {
    // Parameter definition schema
    this.parameterSchema = z.object({
      name: z.string().min(1),
      type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
      description: z.string().min(1),
      required: z.boolean(),
      default: z.any().optional(),
      enum: z.array(z.any()).optional(),
      pattern: z.string().optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      items: z.lazy(() => this.parameterSchema).optional(),
      properties: z.record(z.lazy(() => this.parameterSchema)).optional()
    });

    // Response definition schema
    const responseSchema = z.object({
      type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
      description: z.string().min(1),
      properties: z.record(this.parameterSchema).optional(),
      items: this.parameterSchema.optional()
    });

    // Endpoint schema
    this.endpointSchema = z.object({
      name: z.string().min(1),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
      path: z.string().min(1),
      description: z.string().min(1),
      parameters: z.array(this.parameterSchema).optional(),
      response: responseSchema,
      authentication: z.boolean().optional(),
      rateLimit: z.object({
        requests: z.number().positive(),
        window: z.string().min(1)
      }).optional()
    });

    // Authentication config schema
    const authSchema = z.object({
      type: z.enum(['api_key', 'bearer_token', 'basic', 'oauth2']),
      location: z.enum(['header', 'query', 'cookie']).optional(),
      name: z.string().optional(),
      scheme: z.string().optional()
    });

    // Rate limit config schema
    const rateLimitSchema = z.object({
      requests: z.number().positive(),
      window: z.string().min(1),
      burst: z.number().positive().optional()
    });

    // Main protocol schema
    this.protocolSchema = z.object({
      name: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9-_]*$/),
      version: z.string().min(1).regex(/^\d+\.\d+\.\d+$/),
      description: z.string().min(10),
      author: z.string().min(1),
      repository: z.string().url().optional(),
      license: z.string().min(1),
      dependencies: z.record(z.string()).optional(),
      endpoints: z.array(this.endpointSchema).min(1),
      authentication: authSchema.optional(),
      rateLimit: rateLimitSchema.optional(),
      metadata: z.record(z.any()).optional()
    });
  }

  async validate(protocol: CommunityProtocol): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Schema validation
      const schemaResult = this.validateSchema(protocol);
      errors.push(...schemaResult.errors);
      warnings.push(...schemaResult.warnings);

      // Business logic validation
      const businessResult = this.validateBusinessLogic(protocol);
      errors.push(...businessResult.errors);
      warnings.push(...businessResult.warnings);

      // Security validation
      const securityResult = this.validateSecurity(protocol);
      errors.push(...securityResult.errors);
      warnings.push(...securityResult.warnings);

      // Domain validation if configured
      if (this.config.allowedDomains) {
        const domainResult = this.validateDomains(protocol);
        errors.push(...domainResult.errors);
        warnings.push(...domainResult.warnings);
      }

      logger.debug(`Validation completed for ${protocol.name}`, {
        errors: errors.length,
        warnings: warnings.length
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      const protocolName = protocol?.name || 'unknown';
      logger.error(`Validation error for protocol ${protocolName}:`, error);
      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: `Internal validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: '',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  private validateSchema(protocol: CommunityProtocol): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.protocolSchema.parse(protocol);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          errors.push({
            code: 'SCHEMA_VALIDATION',
            message: issue.message,
            path: issue.path.join('.'),
            severity: 'error'
          });
        }
      } else {
        errors.push({
          code: 'SCHEMA_ERROR',
          message: `Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: '',
          severity: 'error'
        });
      }
    }

    return { errors, warnings };
  }

  private validateBusinessLogic(protocol: CommunityProtocol): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check endpoint count
    if (protocol.endpoints.length > this.config.maxEndpoints) {
      errors.push({
        code: 'TOO_MANY_ENDPOINTS',
        message: `Protocol has ${protocol.endpoints.length} endpoints, maximum allowed is ${this.config.maxEndpoints}`,
        path: 'endpoints',
        severity: 'error'
      });
    }

    // Check for duplicate endpoint names
    const endpointNames = new Set<string>();
    protocol.endpoints.forEach((endpoint: ProtocolEndpoint, index: number) => {
      if (endpointNames.has(endpoint.name)) {
        errors.push({
          code: 'DUPLICATE_ENDPOINT',
          message: `Duplicate endpoint name: ${endpoint.name}`,
          path: `endpoints.${index}.name`,
          severity: 'error'
        });
      }
      endpointNames.add(endpoint.name);
    });

    // Check for duplicate paths with same method
    const pathMethods = new Set<string>();
    protocol.endpoints.forEach((endpoint: ProtocolEndpoint, index: number) => {
      const key = `${endpoint.method}:${endpoint.path}`;
      if (pathMethods.has(key)) {
        errors.push({
          code: 'DUPLICATE_PATH_METHOD',
          message: `Duplicate path and method combination: ${endpoint.method} ${endpoint.path}`,
          path: `endpoints.${index}`,
          severity: 'error'
        });
      }
      pathMethods.add(key);
    });

    // Check required fields
    for (const field of this.config.requiredFields) {
      if (!this.hasNestedProperty(protocol, field)) {
        if (this.config.strictMode) {
          errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: `Required field missing: ${field}`,
            path: field,
            severity: 'error'
          });
        } else {
          warnings.push({
            code: 'MISSING_RECOMMENDED_FIELD',
            message: `Recommended field missing: ${field}`,
            path: field,
            severity: 'warning'
          });
        }
      }
    }

    // Validate parameter references
    protocol.endpoints.forEach((endpoint: ProtocolEndpoint, endpointIndex: number) => {
      if (endpoint.parameters) {
        endpoint.parameters.forEach((param: ParameterDefinition, paramIndex: number) => {
          const paramResult = this.validateParameter(param, `endpoints.${endpointIndex}.parameters.${paramIndex}`);
          errors.push(...paramResult.errors);
          warnings.push(...paramResult.warnings);
        });
      }
    });

    return { errors, warnings };
  }

  private validateParameter(
    param: ParameterDefinition,
    basePath: string
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate enum values match type
    if (param.enum && param.enum.length > 0) {
      const invalidEnums = param.enum.filter((value: any) => typeof value !== param.type);
      if (invalidEnums.length > 0) {
        errors.push({
          code: 'INVALID_ENUM_TYPE',
          message: `Enum values don't match parameter type ${param.type}`,
          path: `${basePath}.enum`,
          severity: 'error'
        });
      }
    }

    // Validate number constraints
    if (param.type === 'number') {
      if (param.minimum !== undefined && param.maximum !== undefined && param.minimum >= param.maximum) {
        errors.push({
          code: 'INVALID_NUMBER_RANGE',
          message: 'Minimum value must be less than maximum value',
          path: basePath,
          severity: 'error'
        });
      }
    }

    // Validate array items
    if (param.type === 'array' && !param.items) {
      warnings.push({
        code: 'MISSING_ARRAY_ITEMS',
        message: 'Array parameter missing items definition',
        path: `${basePath}.items`,
        severity: 'warning'
      });
    }

    // Validate object properties
    if (param.type === 'object' && !param.properties) {
      warnings.push({
        code: 'MISSING_OBJECT_PROPERTIES',
        message: 'Object parameter missing properties definition',
        path: `${basePath}.properties`,
        severity: 'warning'
      });
    }

    return { errors, warnings };
  }

  private validateSecurity(protocol: CommunityProtocol): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for authentication configuration
    if (!protocol.authentication) {
      warnings.push({
        code: 'NO_AUTHENTICATION',
        message: 'Protocol does not specify authentication configuration',
        path: 'authentication',
        severity: 'warning'
      });
    }

    // Check for rate limiting
    if (!protocol.rateLimit) {
      warnings.push({
        code: 'NO_RATE_LIMIT',
        message: 'Protocol does not specify rate limiting configuration',
        path: 'rateLimit',
        severity: 'warning'
      });
    }

    // Check for HTTPS in repository URL
    if (protocol.repository && !protocol.repository.startsWith('https://')) {
      warnings.push({
        code: 'INSECURE_REPOSITORY_URL',
        message: 'Repository URL should use HTTPS',
        path: 'repository',
        severity: 'warning'
      });
    }

    // Check endpoints for sensitive data in URLs
    protocol.endpoints.forEach((endpoint: ProtocolEndpoint, index: number) => {
      if (endpoint.path.includes('password') || endpoint.path.includes('secret') || endpoint.path.includes('key')) {
        warnings.push({
          code: 'SENSITIVE_DATA_IN_URL',
          message: 'Endpoint path contains potentially sensitive terms',
          path: `endpoints.${index}.path`,
          severity: 'warning'
        });
      }
    });

    return { errors, warnings };
  }

  private validateDomains(protocol: CommunityProtocol): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!this.config.allowedDomains || this.config.allowedDomains.length === 0) {
      return { errors, warnings };
    }

    // Extract domain from repository URL if present
    if (protocol.repository) {
      try {
        const url = new URL(protocol.repository);
        const domain = url.hostname;
        
        if (!this.config.allowedDomains.includes(domain)) {
          errors.push({
            code: 'DOMAIN_NOT_ALLOWED',
            message: `Repository domain '${domain}' is not in allowed domains list`,
            path: 'repository',
            severity: 'error'
          });
        }
      } catch (error) {
        warnings.push({
          code: 'INVALID_REPOSITORY_URL',
          message: 'Repository URL format is invalid',
          path: 'repository',
          severity: 'warning'
        });
      }
    }

    return { errors, warnings };
  }

  private hasNestedProperty(obj: any, path: string): boolean {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object' || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    return current !== undefined && current !== null;
  }

  validateEndpoint(endpoint: ProtocolEndpoint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.endpointSchema.parse(endpoint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          errors.push({
            code: 'ENDPOINT_SCHEMA_VALIDATION',
            message: issue.message,
            path: issue.path.join('.'),
            severity: 'error'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}