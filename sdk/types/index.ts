// Re-export community types for SDK users
export type {
  CommunityProtocol,
  ProtocolEndpoint,
  ParameterDefinition,
  ResponseDefinition,
  AuthenticationConfig,
  RateLimitConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  GeneratedTool,
  LoadedProtocol,
  GitHubSubmission,
  CommunitySystemConfig,
} from '../../src/community/types';

// Additional SDK-specific types
export interface SDKConfig {
  apiEndpoint?: string;
  version?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

export interface ProtocolBuilder {
  setName(name: string): ProtocolBuilder;
  setVersion(version: string): ProtocolBuilder;
  setDescription(description: string): ProtocolBuilder;
  setAuthor(author: string): ProtocolBuilder;
  setLicense(license: string): ProtocolBuilder;
  setRepository(repository: string): ProtocolBuilder;
  addEndpoint(endpoint: ProtocolEndpoint): ProtocolBuilder;
  setAuthentication(auth: AuthenticationConfig): ProtocolBuilder;
  setRateLimit(rateLimit: RateLimitConfig): ProtocolBuilder;
  setMetadata(metadata: Record<string, any>): ProtocolBuilder;
  build(): CommunityProtocol;
  validate(): Promise<ValidationResult>;
  export(format: 'json' | 'yaml'): string;
}

export interface EndpointBuilder {
  setName(name: string): EndpointBuilder;
  setMethod(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'): EndpointBuilder;
  setPath(path: string): EndpointBuilder;
  setDescription(description: string): EndpointBuilder;
  addParameter(parameter: ParameterDefinition): EndpointBuilder;
  setResponse(response: ResponseDefinition): EndpointBuilder;
  requireAuthentication(required?: boolean): EndpointBuilder;
  setRateLimit(rateLimit: { requests: number; window: string }): EndpointBuilder;
  build(): ProtocolEndpoint;
}

export interface ParameterBuilder {
  setName(name: string): ParameterBuilder;
  setType(type: 'string' | 'number' | 'boolean' | 'object' | 'array'): ParameterBuilder;
  setDescription(description: string): ParameterBuilder;
  setRequired(required: boolean): ParameterBuilder;
  setDefault(defaultValue: any): ParameterBuilder;
  setEnum(enumValues: any[]): ParameterBuilder;
  setPattern(pattern: string): ParameterBuilder;
  setMinimum(min: number): ParameterBuilder;
  setMaximum(max: number): ParameterBuilder;
  setItems(items: ParameterDefinition): ParameterBuilder;
  setProperties(properties: Record<string, ParameterDefinition>): ParameterBuilder;
  build(): ParameterDefinition;
}

export interface TestSuite {
  name: string;
  description: string;
  tests: TestCase[];
}

export interface TestCase {
  name: string;
  description: string;
  endpoint: string;
  method: string;
  parameters: Record<string, any>;
  expectedStatus?: number;
  expectedResponse?: any;
  timeout?: number;
}

export interface ProtocolTemplate {
  name: string;
  description: string;
  category: string;
  template: Partial<CommunityProtocol>;
  placeholders: Record<string, string>;
  instructions: string[];
}

export interface ValidationOptions {
  strictMode?: boolean;
  checkSecurity?: boolean;
  checkPerformance?: boolean;
  allowedDomains?: string[];
  maxEndpoints?: number;
}

export interface DeploymentTarget {
  name: string;
  type: 'local' | 'remote' | 'github';
  configuration: Record<string, any>;
}

export interface SDKError extends Error {
  code: string;
  details?: Record<string, any>;
}

export interface ProtocolStats {
  endpoints: number;
  parameters: number;
  requiredAuth: boolean;
  hasRateLimit: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface GenerationOptions {
  includeExamples?: boolean;
  includeTests?: boolean;
  outputFormat?: 'typescript' | 'javascript' | 'json';
  targetFramework?: 'node' | 'browser' | 'both';
}

export interface DocumentationOptions {
  format?: 'markdown' | 'html' | 'pdf';
  includeExamples?: boolean;
  includeSchemas?: boolean;
  theme?: 'default' | 'minimal' | 'detailed';
}
