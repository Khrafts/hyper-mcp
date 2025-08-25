import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import { ApiClient } from '../../utils/ApiClient.js';
import { SchemaGenerator, MCPToolSchema } from './SchemaGenerator.js';
import {
  CommunityProtocol,
  ProtocolEndpoint,
  GeneratedTool,
  AuthenticationConfig,
} from '../types/index.js';

export interface ToolGenerationOptions {
  timeout: number;
  retries: number;
  rateLimit?: {
    requests: number;
    window: number;
  };
}

export class ToolGenerator extends EventEmitter {
  private schemaGenerator: SchemaGenerator;
  private defaultOptions: ToolGenerationOptions;

  constructor(options: Partial<ToolGenerationOptions> = {}) {
    super();
    this.schemaGenerator = new SchemaGenerator();
    this.defaultOptions = {
      timeout: 10000,
      retries: 2,
      ...options,
    };
    logger.debug('ToolGenerator initialized', { options });
  }

  async generateTools(protocol: CommunityProtocol): Promise<GeneratedTool[]> {
    try {
      logger.info(`Generating tools for protocol: ${protocol.name}@${protocol.version}`);

      const tools: GeneratedTool[] = [];

      for (const endpoint of protocol.endpoints) {
        const tool = await this.generateTool(endpoint, protocol);
        tools.push(tool);
        this.emit('tool:generated', tool);
      }

      logger.info(`Generated ${tools.length} tools for protocol ${protocol.name}`);
      this.emit('tools:generated', { protocol: protocol.name, tools });

      return tools;
    } catch (error) {
      logger.error(`Failed to generate tools for protocol ${protocol.name}:`, error);
      this.emit('tools:error', protocol.name, error);
      throw error;
    }
  }

  private async generateTool(
    endpoint: ProtocolEndpoint,
    protocol: CommunityProtocol
  ): Promise<GeneratedTool> {
    const toolSchema = this.generateToolSchema(endpoint, protocol);
    const handler = this.createToolHandler(endpoint, protocol);

    return {
      name: toolSchema.name,
      description: toolSchema.description,
      parameters: toolSchema.parameters,
      handler,
      metadata: {
        protocol: protocol.name,
        version: protocol.version,
        endpoint: endpoint.name,
      },
    };
  }

  private generateToolSchema(
    endpoint: ProtocolEndpoint,
    protocol: CommunityProtocol
  ): MCPToolSchema {
    const schema = this.schemaGenerator.generateSchema(protocol);
    const toolSchema = schema.tools.find((tool: MCPToolSchema) =>
      tool.name.endsWith(this.toCamelCase(endpoint.name))
    );

    if (!toolSchema) {
      throw new Error(`Failed to generate schema for endpoint: ${endpoint.name}`);
    }

    return toolSchema;
  }

  private createToolHandler(
    endpoint: ProtocolEndpoint,
    protocol: CommunityProtocol
  ): (...args: any[]) => Promise<any> {
    return async (params: Record<string, any> = {}) => {
      try {
        logger.debug(`Executing tool for ${protocol.name}.${endpoint.name}`, { params });

        // Extract authentication and common parameters
        const { timeout, retries, ...endpointParams } = params;
        const authHeaders = this.extractAuthHeaders(params, protocol.authentication);

        // Build request configuration
        const requestConfig = this.buildRequestConfig(
          endpoint,
          endpointParams,
          authHeaders,
          timeout || this.defaultOptions.timeout
        );

        // Create API client for this request
        const client = new ApiClient('community-tool-generator', {
          baseURL: '',
          timeout: requestConfig.timeout,
          retries: {
            maxRetries: retries || this.defaultOptions.retries,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: ['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT'],
            retryableStatusCodes: [408, 429, 500, 502, 503, 504],
          },
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 10,
          },
        });

        // Execute the request
        const response = await this.executeRequest(client, requestConfig);

        // Process and return response
        const result = await this.processResponse(response);

        logger.debug(`Tool execution successful for ${protocol.name}.${endpoint.name}`, {
          statusCode: response.status,
          responseSize: JSON.stringify(result).length,
        });

        return result;
      } catch (error) {
        logger.error(`Tool execution failed for ${protocol.name}.${endpoint.name}:`, error);
        throw this.createToolError(error, protocol, endpoint);
      }
    };
  }

  private extractAuthHeaders(
    params: Record<string, any>,
    authConfig?: AuthenticationConfig
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!authConfig) {
      return headers;
    }

    switch (authConfig.type) {
      case 'api_key':
        if (params.apiKey) {
          const headerName = authConfig.name || 'X-API-Key';
          const location = authConfig.location || 'header';

          if (location === 'header') {
            headers[headerName] = params.apiKey;
          }
        }
        break;

      case 'bearer_token':
        if (params.bearerToken) {
          headers['Authorization'] = `Bearer ${params.bearerToken}`;
        }
        break;

      case 'basic':
        if (params.basicAuth && params.basicAuth.username && params.basicAuth.password) {
          const credentials = Buffer.from(
            `${params.basicAuth.username}:${params.basicAuth.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'oauth2':
        if (params.accessToken) {
          headers['Authorization'] = `Bearer ${params.accessToken}`;
        }
        break;
    }

    return headers;
  }

  private buildRequestConfig(
    endpoint: ProtocolEndpoint,
    params: Record<string, any>,
    authHeaders: Record<string, string>,
    timeout: number
  ): any {
    const config: any = {
      method: endpoint.method,
      url: this.buildUrl(endpoint.path, params),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HyperMCP-Community-Client/1.0',
        ...authHeaders,
      },
      timeout,
    };

    // Handle request body for POST/PUT/PATCH methods
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      const bodyParams = this.extractBodyParameters(params, endpoint);
      if (Object.keys(bodyParams).length > 0) {
        config.data = bodyParams;
      }
    }

    // Handle query parameters for GET/DELETE methods
    if (['GET', 'DELETE'].includes(endpoint.method)) {
      const queryParams = this.extractQueryParameters(params, endpoint);
      if (Object.keys(queryParams).length > 0) {
        config.params = queryParams;
      }
    }

    return config;
  }

  private buildUrl(path: string, params: Record<string, any>): string {
    let url = path;

    // Replace path parameters (e.g., /users/{id} -> /users/123)
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      if (url.includes(placeholder)) {
        url = url.replace(placeholder, encodeURIComponent(String(value)));
      }
    });

    return url;
  }

  private extractBodyParameters(
    params: Record<string, any>,
    endpoint: ProtocolEndpoint
  ): Record<string, any> {
    const bodyParams: Record<string, any> = {};
    const pathParamNames = this.extractPathParameterNames(endpoint.path);
    const excludedParams = new Set([
      'timeout',
      'retries',
      'apiKey',
      'bearerToken',
      'basicAuth',
      'accessToken',
      ...pathParamNames,
    ]);

    Object.entries(params).forEach(([key, value]) => {
      if (!excludedParams.has(key)) {
        bodyParams[key] = value;
      }
    });

    return bodyParams;
  }

  private extractQueryParameters(
    params: Record<string, any>,
    endpoint: ProtocolEndpoint
  ): Record<string, any> {
    const queryParams: Record<string, any> = {};
    const pathParamNames = this.extractPathParameterNames(endpoint.path);
    const excludedParams = new Set([
      'timeout',
      'retries',
      'apiKey',
      'bearerToken',
      'basicAuth',
      'accessToken',
      ...pathParamNames,
    ]);

    Object.entries(params).forEach(([key, value]) => {
      if (!excludedParams.has(key)) {
        queryParams[key] = value;
      }
    });

    return queryParams;
  }

  private extractPathParameterNames(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map((match) => match.slice(1, -1)) : [];
  }

  private async executeRequest(client: ApiClient, config: any): Promise<any> {
    try {
      const response = await client.request(config);
      return response;
    } catch (error) {
      // Handle specific HTTP errors
      if (error instanceof Error && 'response' in error) {
        const httpError = error as any;
        throw new Error(
          `HTTP ${httpError.response?.status || 'Unknown'}: ${
            httpError.response?.statusText || httpError.message
          }`
        );
      }
      throw error;
    }
  }

  private async processResponse(response: any): Promise<any> {
    // Handle different response types based on endpoint configuration
    if (response.data) {
      return response.data;
    }

    // If no data, return basic response info
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };
  }

  private createToolError(
    error: unknown,
    protocol: CommunityProtocol,
    endpoint: ProtocolEndpoint
  ): Error {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const toolError = new Error(
      `Tool execution failed for ${protocol.name}.${endpoint.name}: ${errorMessage}`
    );

    // Add metadata to error
    (toolError as any).protocol = protocol.name;
    (toolError as any).version = protocol.version;
    (toolError as any).endpoint = endpoint.name;
    (toolError as any).originalError = error;

    return toolError;
  }

  private toCamelCase(str: string): string {
    return (
      str
        // Split by word boundaries, dashes, underscores
        .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
        // Handle version numbers like "v2" -> "V2"
        .replace(/v(\d+)/g, 'V$1')
        // First character lowercase
        .replace(/^./, (char) => char.toLowerCase())
    );
  }

  async validateGeneratedTools(tools: GeneratedTool[]): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate tool names
    const toolNames = new Set<string>();
    tools.forEach((tool) => {
      if (toolNames.has(tool.name)) {
        errors.push(`Duplicate tool name: ${tool.name}`);
      }
      toolNames.add(tool.name);
    });

    // Validate each tool
    tools.forEach((tool) => {
      // Check tool name format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tool.name)) {
        errors.push(`Invalid tool name format: ${tool.name}`);
      }

      // Check handler is a function
      if (typeof tool.handler !== 'function') {
        errors.push(`Tool handler is not a function: ${tool.name}`);
      }

      // Check metadata
      if (!tool.metadata.protocol) {
        errors.push(`Tool missing protocol metadata: ${tool.name}`);
      }

      if (!tool.metadata.version) {
        warnings.push(`Tool missing version metadata: ${tool.name}`);
      }

      if (!tool.metadata.endpoint) {
        errors.push(`Tool missing endpoint metadata: ${tool.name}`);
      }

      // Check parameters schema
      if (!tool.parameters || typeof tool.parameters !== 'object') {
        errors.push(`Tool missing or invalid parameters schema: ${tool.name}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getGenerationStats(): {
    toolsGenerated: number;
    protocolsProcessed: number;
    averageToolsPerProtocol: number;
  } {
    // TODO: Implement stats tracking
    return {
      toolsGenerated: 0,
      protocolsProcessed: 0,
      averageToolsPerProtocol: 0,
    };
  }
}
