import { logger } from '../../utils/logger.js';
import {
  CommunityProtocol,
  ProtocolEndpoint,
  ParameterDefinition,
  PropertySchema
} from '../types/index.js';

export interface MCPToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface GeneratedSchema {
  tools: MCPToolSchema[];
  metadata: {
    protocol: string;
    version: string;
    generatedAt: Date;
    endpoints: number;
  };
}

export class SchemaGenerator {
  constructor() {
    logger.debug('SchemaGenerator initialized');
  }

  generateSchema(protocol: CommunityProtocol): GeneratedSchema {
    try {
      const tools = protocol.endpoints.map(endpoint => this.generateToolSchema(endpoint, protocol));
      
      const schema: GeneratedSchema = {
        tools,
        metadata: {
          protocol: protocol.name,
          version: protocol.version,
          generatedAt: new Date(),
          endpoints: protocol.endpoints.length
        }
      };

      logger.debug(`Generated schema for ${protocol.name}`, {
        toolCount: tools.length,
        protocol: protocol.name
      });

      return schema;
    } catch (error) {
      logger.error(`Failed to generate schema for protocol ${protocol.name}:`, error);
      throw error;
    }
  }

  private generateToolSchema(endpoint: ProtocolEndpoint, protocol: CommunityProtocol): MCPToolSchema {
    const toolName = this.generateToolName(endpoint, protocol);
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Process endpoint parameters
    if (endpoint.parameters) {
      endpoint.parameters.forEach((param: ParameterDefinition) => {
        properties[param.name] = this.convertParameterToJsonSchema(param);
        if (param.required) {
          required.push(param.name);
        }
      });
    }

    // Add common parameters for all endpoints
    this.addCommonParameters(properties, required, endpoint, protocol);

    return {
      name: toolName,
      description: this.generateToolDescription(endpoint, protocol),
      parameters: {
        type: 'object',
        properties,
        ...(required.length > 0 && { required })
      }
    };
  }

  private generateToolName(endpoint: ProtocolEndpoint, protocol: CommunityProtocol): string {
    if (!endpoint || !endpoint.name) {
      throw new Error('Endpoint name is required');
    }
    if (!protocol || !protocol.name) {
      throw new Error('Protocol name is required');
    }
    
    // Convert protocol name and endpoint name to camelCase
    const protocolName = this.toCamelCase(protocol.name);
    const endpointName = this.toCamelCase(endpoint.name);
    
    // Combine them with an underscore for MCP tool naming
    return `${protocolName}_${endpointName}`;
  }

  private generateToolDescription(endpoint: ProtocolEndpoint, protocol: CommunityProtocol): string {
    let description = `${endpoint.description}`;
    
    if (endpoint.authentication && protocol.authentication) {
      description += ` (Requires authentication: ${protocol.authentication.type})`;
    }
    
    if (endpoint.rateLimit) {
      description += ` (Rate limited: ${endpoint.rateLimit.requests} requests per ${endpoint.rateLimit.window})`;
    }

    description += ` [${protocol.name} v${protocol.version}]`;
    
    return description;
  }

  private convertParameterToJsonSchema(param: ParameterDefinition | PropertySchema): any {
    const schema: any = {
      type: param.type,
      description: param.description
    };

    // Add default value if present
    if (param.default !== undefined) {
      schema.default = param.default;
    }

    // Handle type-specific properties
    switch (param.type) {
      case 'string':
        if (param.enum) {
          schema.enum = param.enum;
        }
        if (param.pattern) {
          schema.pattern = param.pattern;
        }
        break;

      case 'number':
        if (param.minimum !== undefined) {
          schema.minimum = param.minimum;
        }
        if (param.maximum !== undefined) {
          schema.maximum = param.maximum;
        }
        if (param.enum) {
          schema.enum = param.enum;
        }
        break;

      case 'boolean':
        if (param.enum) {
          schema.enum = param.enum;
        }
        break;

      case 'array':
        if (param.items) {
          schema.items = this.convertParameterToJsonSchema(param.items);
        }
        break;

      case 'object':
        if (param.properties) {
          schema.properties = {};
          const requiredProps: string[] = [];
          
          Object.entries(param.properties).forEach(([propName, propDef]: [string, PropertySchema]) => {
            schema.properties[propName] = this.convertParameterToJsonSchema(propDef);
            if (propDef.required) {
              requiredProps.push(propName);
            }
          });

          if (requiredProps.length > 0) {
            schema.required = requiredProps;
          }
        }
        break;
    }

    return schema;
  }

  private addCommonParameters(
    properties: Record<string, any>,
    required: string[],
    endpoint: ProtocolEndpoint,
    protocol: CommunityProtocol
  ): void {
    // Add authentication parameter if required
    if (endpoint.authentication && protocol.authentication) {
      const authParam = this.generateAuthParameter(protocol.authentication.type);
      if (authParam) {
        properties[authParam.name] = authParam.schema;
        required.push(authParam.name);
      }
    }

    // Add timeout parameter (optional for all requests)
    properties.timeout = {
      type: 'number',
      description: 'Request timeout in milliseconds',
      minimum: 1000,
      maximum: 60000,
      default: 10000
    };

    // Add retry parameter (optional for all requests)
    properties.retries = {
      type: 'number',
      description: 'Number of retry attempts on failure',
      minimum: 0,
      maximum: 5,
      default: 2
    };
  }

  private generateAuthParameter(authType: string): { name: string; schema: any } | null {
    switch (authType) {
      case 'api_key':
        return {
          name: 'apiKey',
          schema: {
            type: 'string',
            description: 'API key for authentication',
            minLength: 1
          }
        };

      case 'bearer_token':
        return {
          name: 'bearerToken',
          schema: {
            type: 'string',
            description: 'Bearer token for authentication',
            minLength: 1
          }
        };

      case 'basic':
        return {
          name: 'basicAuth',
          schema: {
            type: 'object',
            description: 'Basic authentication credentials',
            properties: {
              username: {
                type: 'string',
                description: 'Username for basic authentication'
              },
              password: {
                type: 'string',
                description: 'Password for basic authentication'
              }
            },
            required: ['username', 'password']
          }
        };

      case 'oauth2':
        return {
          name: 'accessToken',
          schema: {
            type: 'string',
            description: 'OAuth2 access token',
            minLength: 1
          }
        };

      default:
        return null;
    }
  }

  private toCamelCase(str: string): string {
    return str
      // Split by word boundaries, dashes, underscores
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      // Handle version numbers like "v2" -> "V2"
      .replace(/v(\d+)/g, 'V$1')
      // First character lowercase
      .replace(/^./, char => char.toLowerCase());
  }

  generateSchemaDocumentation(schema: GeneratedSchema): string {
    const { tools, metadata } = schema;
    
    let doc = `# ${metadata.protocol} v${metadata.version} - MCP Tools\n\n`;
    doc += `Generated on: ${metadata.generatedAt.toISOString()}\n`;
    doc += `Total tools: ${tools.length}\n\n`;

    tools.forEach(tool => {
      doc += `## ${tool.name}\n\n`;
      doc += `${tool.description}\n\n`;
      doc += `### Parameters\n\n`;
      
      if (Object.keys(tool.parameters.properties).length === 0) {
        doc += `No parameters required.\n\n`;
      } else {
        doc += `| Parameter | Type | Required | Description |\n`;
        doc += `|-----------|------|----------|-------------|\n`;
        
        Object.entries(tool.parameters.properties).forEach(([name, param]: [string, any]) => {
          const required = tool.parameters.required?.includes(name) ? 'Yes' : 'No';
          doc += `| ${name} | ${param.type} | ${required} | ${param.description} |\n`;
        });
        doc += `\n`;
      }
    });

    return doc;
  }

  validateGeneratedSchema(schema: GeneratedSchema): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate tool names are unique
    const toolNames = new Set<string>();
    schema.tools.forEach(tool => {
      if (toolNames.has(tool.name)) {
        errors.push(`Duplicate tool name: ${tool.name}`);
      }
      toolNames.add(tool.name);
    });

    // Validate tool names follow MCP conventions
    schema.tools.forEach(tool => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tool.name)) {
        errors.push(`Invalid tool name format: ${tool.name}`);
      }

      if (tool.name.length > 64) {
        warnings.push(`Tool name is very long: ${tool.name}`);
      }

      if (tool.description.length < 10) {
        warnings.push(`Tool description is very short: ${tool.name}`);
      }

      if (tool.description.length > 500) {
        warnings.push(`Tool description is very long: ${tool.name}`);
      }
    });

    // Validate parameters
    schema.tools.forEach(tool => {
      const { properties, required = [] } = tool.parameters;
      
      // Check required parameters exist in properties
      required.forEach(reqParam => {
        if (!properties[reqParam]) {
          errors.push(`Required parameter '${reqParam}' not found in properties for tool: ${tool.name}`);
        }
      });

      // Validate parameter schemas
      Object.entries(properties).forEach(([paramName, paramSchema]: [string, any]) => {
        if (!paramSchema.type) {
          errors.push(`Parameter '${paramName}' missing type in tool: ${tool.name}`);
        }

        if (!paramSchema.description) {
          warnings.push(`Parameter '${paramName}' missing description in tool: ${tool.name}`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}