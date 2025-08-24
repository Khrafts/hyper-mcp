export interface CommunityProtocol {
  name: string;
  version: string;
  description: string;
  author: string;
  repository?: string;
  license: string;
  dependencies?: Record<string, string>;
  endpoints: ProtocolEndpoint[];
  authentication?: AuthenticationConfig;
  rateLimit?: RateLimitConfig;
  metadata?: Record<string, any>;
}

export interface ProtocolEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters?: ParameterDefinition[];
  response: ResponseDefinition;
  authentication?: boolean;
  rateLimit?: {
    requests: number;
    window: string;
  };
}

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
}

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
}

export interface ResponseDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  properties?: Record<string, PropertySchema>;
  items?: PropertySchema;
}

export interface AuthenticationConfig {
  type: 'api_key' | 'bearer_token' | 'basic' | 'oauth2';
  location?: 'header' | 'query' | 'cookie';
  name?: string;
  scheme?: string;
}

export interface RateLimitConfig {
  requests: number;
  window: string;
  burst?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  severity: 'warning';
}

export interface GeneratedTool {
  name: string;
  description: string;
  parameters: any;
  handler: (...args: any[]) => Promise<any>;
  metadata: {
    protocol: string;
    version: string;
    endpoint: string;
  };
}

export interface LoadedProtocol {
  protocol: CommunityProtocol;
  tools: GeneratedTool[];
  status: 'loading' | 'loaded' | 'error';
  error?: string;
  loadedAt: Date;
}

export interface GitHubSubmission {
  pullRequestNumber: number;
  author: string;
  protocolPath: string;
  status: 'pending' | 'validated' | 'approved' | 'rejected';
  validationResults?: ValidationResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunitySystemConfig {
  validation: {
    strictMode: boolean;
    maxEndpoints: number;
    allowedDomains?: string[];
    requiredFields: string[];
  };
  loading: {
    timeout: number;
    retries: number;
    cacheTTL: number;
  };
  github: {
    repository: string;
    token?: string;
    webhookSecret?: string;
    autoMerge: boolean;
  };
}

// Community-specific error helper
export interface CommunityErrorContext extends Record<string, unknown> {
  protocolName?: string;
  protocolVersion?: string;
  endpoint?: string;
  toolName?: string;
  submissionId?: string;
  pullRequestNumber?: number;
  author?: string;
  validationErrors?: ValidationError[];
}
