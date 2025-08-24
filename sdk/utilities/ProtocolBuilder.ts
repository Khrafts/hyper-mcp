import { ProtocolValidator } from '../../src/community/validation/ProtocolValidator';
import {
  CommunityProtocol,
  ProtocolEndpoint,
  ParameterDefinition,
  ResponseDefinition,
  AuthenticationConfig,
  RateLimitConfig,
  ValidationResult,
} from '../../src/community/types';
import { ProtocolBuilder, EndpointBuilder, ParameterBuilder, SDKError } from '../types';

export class CommunityProtocolBuilder implements ProtocolBuilder {
  private protocol: Partial<CommunityProtocol> = {
    endpoints: [],
    metadata: {},
  };

  setName(name: string): ProtocolBuilder {
    if (!name || typeof name !== 'string') {
      throw this.createError('INVALID_NAME', 'Protocol name must be a non-empty string');
    }

    if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
      throw this.createError(
        'INVALID_NAME_FORMAT',
        'Protocol name must start with a letter and contain only letters, numbers, hyphens, and underscores'
      );
    }

    this.protocol.name = name;
    return this;
  }

  setVersion(version: string): ProtocolBuilder {
    if (!version || typeof version !== 'string') {
      throw this.createError('INVALID_VERSION', 'Version must be a non-empty string');
    }

    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      throw this.createError(
        'INVALID_VERSION_FORMAT',
        'Version must follow semantic versioning (e.g., 1.0.0)'
      );
    }

    this.protocol.version = version;
    return this;
  }

  setDescription(description: string): ProtocolBuilder {
    if (!description || typeof description !== 'string') {
      throw this.createError('INVALID_DESCRIPTION', 'Description must be a non-empty string');
    }

    if (description.length < 10) {
      throw this.createError(
        'DESCRIPTION_TOO_SHORT',
        'Description must be at least 10 characters long'
      );
    }

    this.protocol.description = description;
    return this;
  }

  setAuthor(author: string): ProtocolBuilder {
    if (!author || typeof author !== 'string') {
      throw this.createError('INVALID_AUTHOR', 'Author must be a non-empty string');
    }

    this.protocol.author = author;
    return this;
  }

  setLicense(license: string): ProtocolBuilder {
    if (!license || typeof license !== 'string') {
      throw this.createError('INVALID_LICENSE', 'License must be a non-empty string');
    }

    this.protocol.license = license;
    return this;
  }

  setRepository(repository: string): ProtocolBuilder {
    if (repository && typeof repository === 'string') {
      try {
        new URL(repository);
        this.protocol.repository = repository;
      } catch {
        throw this.createError('INVALID_REPOSITORY_URL', 'Repository must be a valid URL');
      }
    }
    return this;
  }

  addEndpoint(endpoint: ProtocolEndpoint): ProtocolBuilder {
    if (!endpoint || typeof endpoint !== 'object') {
      throw this.createError('INVALID_ENDPOINT', 'Endpoint must be a valid endpoint object');
    }

    if (!this.protocol.endpoints) {
      this.protocol.endpoints = [];
    }

    // Check for duplicate endpoint names
    if (this.protocol.endpoints.some((e) => e.name === endpoint.name)) {
      throw this.createError(
        'DUPLICATE_ENDPOINT_NAME',
        `Endpoint name '${endpoint.name}' already exists`
      );
    }

    // Check for duplicate path/method combinations
    if (
      this.protocol.endpoints.some((e) => e.path === endpoint.path && e.method === endpoint.method)
    ) {
      throw this.createError(
        'DUPLICATE_ENDPOINT_PATH',
        `Endpoint with path '${endpoint.path}' and method '${endpoint.method}' already exists`
      );
    }

    this.protocol.endpoints.push(endpoint);
    return this;
  }

  setAuthentication(auth: AuthenticationConfig): ProtocolBuilder {
    if (auth && typeof auth === 'object') {
      this.protocol.authentication = auth;
    }
    return this;
  }

  setRateLimit(rateLimit: RateLimitConfig): ProtocolBuilder {
    if (rateLimit && typeof rateLimit === 'object') {
      this.protocol.rateLimit = rateLimit;
    }
    return this;
  }

  setMetadata(metadata: Record<string, any>): ProtocolBuilder {
    if (metadata && typeof metadata === 'object') {
      this.protocol.metadata = { ...this.protocol.metadata, ...metadata };
    }
    return this;
  }

  build(): CommunityProtocol {
    // Validate required fields
    const required = ['name', 'version', 'description', 'author', 'license'];
    for (const field of required) {
      if (!this.protocol[field as keyof CommunityProtocol]) {
        throw this.createError('MISSING_REQUIRED_FIELD', `Missing required field: ${field}`);
      }
    }

    if (!this.protocol.endpoints || this.protocol.endpoints.length === 0) {
      throw this.createError('NO_ENDPOINTS', 'Protocol must have at least one endpoint');
    }

    return this.protocol as CommunityProtocol;
  }

  async validate(): Promise<ValidationResult> {
    const protocol = this.build();
    const validator = new ProtocolValidator({
      strictMode: true,
      maxEndpoints: 50,
      requiredFields: ['name', 'version', 'description', 'author', 'license'],
    });

    return validator.validate(protocol);
  }

  export(format: 'json' | 'yaml'): string {
    const protocol = this.build();

    if (format === 'json') {
      return JSON.stringify(protocol, null, 2);
    } else if (format === 'yaml') {
      // Simple YAML export - in production, would use a proper YAML library
      return this.toYAML(protocol);
    } else {
      throw this.createError('INVALID_FORMAT', 'Export format must be "json" or "yaml"');
    }
  }

  private toYAML(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}- \n${this.toYAML(item, indent + 1)
              .split('\n')
              .map((line) => `${spaces}  ${line}`)
              .join('\n')}\n`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.toYAML(value, indent + 1);
      } else {
        yaml += `${spaces}${key}: ${typeof value === 'string' ? `"${value}"` : value}\n`;
      }
    }

    return yaml;
  }

  private createError(code: string, message: string): SDKError {
    const error = new Error(message) as SDKError;
    error.code = code;
    return error;
  }
}

export class CommunityEndpointBuilder implements EndpointBuilder {
  private endpoint: Partial<ProtocolEndpoint> = {
    parameters: [],
  };

  setName(name: string): EndpointBuilder {
    if (!name || typeof name !== 'string') {
      throw this.createError('INVALID_ENDPOINT_NAME', 'Endpoint name must be a non-empty string');
    }
    this.endpoint.name = name;
    return this;
  }

  setMethod(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'): EndpointBuilder {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(method)) {
      throw this.createError('INVALID_METHOD', `Method must be one of: ${validMethods.join(', ')}`);
    }
    this.endpoint.method = method;
    return this;
  }

  setPath(path: string): EndpointBuilder {
    if (!path || typeof path !== 'string') {
      throw this.createError('INVALID_PATH', 'Path must be a non-empty string');
    }
    if (!path.startsWith('/')) {
      throw this.createError('INVALID_PATH_FORMAT', 'Path must start with "/"');
    }
    this.endpoint.path = path;
    return this;
  }

  setDescription(description: string): EndpointBuilder {
    if (!description || typeof description !== 'string') {
      throw this.createError(
        'INVALID_ENDPOINT_DESCRIPTION',
        'Description must be a non-empty string'
      );
    }
    this.endpoint.description = description;
    return this;
  }

  addParameter(parameter: ParameterDefinition): EndpointBuilder {
    if (!parameter || typeof parameter !== 'object') {
      throw this.createError('INVALID_PARAMETER', 'Parameter must be a valid parameter object');
    }

    if (!this.endpoint.parameters) {
      this.endpoint.parameters = [];
    }

    // Check for duplicate parameter names
    if (this.endpoint.parameters.some((p) => p.name === parameter.name)) {
      throw this.createError(
        'DUPLICATE_PARAMETER_NAME',
        `Parameter name '${parameter.name}' already exists`
      );
    }

    this.endpoint.parameters.push(parameter);
    return this;
  }

  setResponse(response: ResponseDefinition): EndpointBuilder {
    if (!response || typeof response !== 'object') {
      throw this.createError('INVALID_RESPONSE', 'Response must be a valid response definition');
    }
    this.endpoint.response = response;
    return this;
  }

  requireAuthentication(required = true): EndpointBuilder {
    this.endpoint.authentication = required;
    return this;
  }

  setRateLimit(rateLimit: { requests: number; window: string }): EndpointBuilder {
    if (rateLimit && typeof rateLimit === 'object') {
      if (typeof rateLimit.requests !== 'number' || rateLimit.requests <= 0) {
        throw this.createError(
          'INVALID_RATE_LIMIT',
          'Rate limit requests must be a positive number'
        );
      }
      if (!rateLimit.window || typeof rateLimit.window !== 'string') {
        throw this.createError(
          'INVALID_RATE_LIMIT',
          'Rate limit window must be a non-empty string'
        );
      }
      this.endpoint.rateLimit = rateLimit;
    }
    return this;
  }

  build(): ProtocolEndpoint {
    const required = ['name', 'method', 'path', 'description', 'response'];
    for (const field of required) {
      if (!this.endpoint[field as keyof ProtocolEndpoint]) {
        throw this.createError(
          'MISSING_REQUIRED_ENDPOINT_FIELD',
          `Missing required endpoint field: ${field}`
        );
      }
    }

    return this.endpoint as ProtocolEndpoint;
  }

  private createError(code: string, message: string): SDKError {
    const error = new Error(message) as SDKError;
    error.code = code;
    return error;
  }
}

export class CommunityParameterBuilder implements ParameterBuilder {
  private parameter: Partial<ParameterDefinition> = {};

  setName(name: string): ParameterBuilder {
    if (!name || typeof name !== 'string') {
      throw this.createError('INVALID_PARAMETER_NAME', 'Parameter name must be a non-empty string');
    }
    this.parameter.name = name;
    return this;
  }

  setType(type: 'string' | 'number' | 'boolean' | 'object' | 'array'): ParameterBuilder {
    const validTypes = ['string', 'number', 'boolean', 'object', 'array'];
    if (!validTypes.includes(type)) {
      throw this.createError(
        'INVALID_PARAMETER_TYPE',
        `Parameter type must be one of: ${validTypes.join(', ')}`
      );
    }
    this.parameter.type = type;
    return this;
  }

  setDescription(description: string): ParameterBuilder {
    if (!description || typeof description !== 'string') {
      throw this.createError(
        'INVALID_PARAMETER_DESCRIPTION',
        'Parameter description must be a non-empty string'
      );
    }
    this.parameter.description = description;
    return this;
  }

  setRequired(required: boolean): ParameterBuilder {
    this.parameter.required = required;
    return this;
  }

  setDefault(defaultValue: any): ParameterBuilder {
    this.parameter.default = defaultValue;
    return this;
  }

  setEnum(enumValues: any[]): ParameterBuilder {
    if (Array.isArray(enumValues) && enumValues.length > 0) {
      this.parameter.enum = enumValues;
    }
    return this;
  }

  setPattern(pattern: string): ParameterBuilder {
    if (pattern && typeof pattern === 'string') {
      try {
        new RegExp(pattern);
        this.parameter.pattern = pattern;
      } catch {
        throw this.createError('INVALID_PATTERN', 'Pattern must be a valid regular expression');
      }
    }
    return this;
  }

  setMinimum(min: number): ParameterBuilder {
    if (typeof min === 'number') {
      this.parameter.minimum = min;
    }
    return this;
  }

  setMaximum(max: number): ParameterBuilder {
    if (typeof max === 'number') {
      this.parameter.maximum = max;
    }
    return this;
  }

  setItems(items: ParameterDefinition): ParameterBuilder {
    if (items && typeof items === 'object') {
      this.parameter.items = items;
    }
    return this;
  }

  setProperties(properties: Record<string, ParameterDefinition>): ParameterBuilder {
    if (properties && typeof properties === 'object') {
      this.parameter.properties = properties;
    }
    return this;
  }

  build(): ParameterDefinition {
    const required = ['name', 'type', 'description', 'required'];
    for (const field of required) {
      if (this.parameter[field as keyof ParameterDefinition] === undefined) {
        throw this.createError(
          'MISSING_REQUIRED_PARAMETER_FIELD',
          `Missing required parameter field: ${field}`
        );
      }
    }

    return this.parameter as ParameterDefinition;
  }

  private createError(code: string, message: string): SDKError {
    const error = new Error(message) as SDKError;
    error.code = code;
    return error;
  }
}

// Factory functions for easier usage
export function createProtocol(): ProtocolBuilder {
  return new CommunityProtocolBuilder();
}

export function createEndpoint(): EndpointBuilder {
  return new CommunityEndpointBuilder();
}

export function createParameter(): ParameterBuilder {
  return new CommunityParameterBuilder();
}
