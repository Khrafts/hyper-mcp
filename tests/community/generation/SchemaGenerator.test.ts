import { SchemaGenerator } from '../../../src/community/generation/SchemaGenerator.js';
import { CommunityProtocol } from '../../../src/community/types/index.js';

describe('SchemaGenerator', () => {
  let generator: SchemaGenerator;

  beforeEach(() => {
    generator = new SchemaGenerator();
  });

  const sampleProtocol: CommunityProtocol = {
    name: 'test-api',
    version: '1.0.0',
    description: 'A test API protocol',
    author: 'Test Author',
    license: 'MIT',
    authentication: {
      type: 'api_key',
      location: 'header',
      name: 'X-API-Key'
    },
    rateLimit: {
      requests: 1000,
      window: '1h'
    },
    endpoints: [
      {
        name: 'getData',
        method: 'GET',
        path: '/api/v1/data',
        description: 'Retrieve data from the API',
        parameters: [
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum number of items to return',
            required: false,
            default: 100,
            minimum: 1,
            maximum: 1000
          },
          {
            name: 'category',
            type: 'string',
            description: 'Filter by category',
            required: true,
            enum: ['news', 'sports', 'tech']
          }
        ],
        response: {
          type: 'object',
          description: 'API response containing data'
        },
        authentication: true,
        rateLimit: {
          requests: 100,
          window: '1m'
        }
      },
      {
        name: 'createItem',
        method: 'POST',
        path: '/api/v1/items',
        description: 'Create a new item',
        parameters: [
          {
            name: 'title',
            type: 'string',
            description: 'Item title',
            required: true,
            pattern: '^[a-zA-Z0-9\\s]+$'
          },
          {
            name: 'metadata',
            type: 'object',
            description: 'Additional item metadata',
            required: false,
            properties: {
              tags: {
                type: 'array',
                description: 'Array of tags',
                required: false,
                items: {
                  type: 'string',
                  description: 'Individual tag',
                  required: true
                }
              }
            }
          }
        ],
        response: {
          type: 'object',
          description: 'Created item response'
        },
        authentication: true
      }
    ]
  };

  describe('Schema Generation', () => {
    it('should generate schema for a protocol', () => {
      const schema = generator.generateSchema(sampleProtocol);

      expect(schema).toHaveProperty('tools');
      expect(schema).toHaveProperty('metadata');
      expect(schema.tools).toHaveLength(2);
      expect(schema.metadata).toEqual({
        protocol: 'test-api',
        version: '1.0.0',
        generatedAt: expect.any(Date),
        endpoints: 2
      });
    });

    it('should generate proper tool names', () => {
      const schema = generator.generateSchema(sampleProtocol);

      expect(schema.tools[0]?.name).toBe('testApi_getData');
      expect(schema.tools[1]?.name).toBe('testApi_createItem');
    });

    it('should generate proper tool descriptions', () => {
      const schema = generator.generateSchema(sampleProtocol);

      expect(schema.tools[0]?.description).toContain('Retrieve data from the API');
      expect(schema.tools[0]?.description).toContain('(Requires authentication: api_key)');
      expect(schema.tools[0]?.description).toContain('(Rate limited: 100 requests per 1m)');
      expect(schema.tools[0]?.description).toContain('[test-api v1.0.0]');
    });

    it('should convert parameters to JSON schema format', () => {
      const schema = generator.generateSchema(sampleProtocol);
      const getDataTool = schema.tools.find(tool => tool.name === 'testApi_getData');

      expect(getDataTool?.parameters.properties).toHaveProperty('limit');
      expect(getDataTool?.parameters.properties.limit).toEqual({
        type: 'number',
        description: 'Maximum number of items to return',
        default: 100,
        minimum: 1,
        maximum: 1000
      });

      expect(getDataTool?.parameters.properties).toHaveProperty('category');
      expect(getDataTool?.parameters.properties.category).toEqual({
        type: 'string',
        description: 'Filter by category',
        enum: ['news', 'sports', 'tech']
      });

      expect(getDataTool?.parameters.required).toContain('category');
      expect(getDataTool?.parameters.required).not.toContain('limit');
    });

    it('should handle complex object parameters', () => {
      const schema = generator.generateSchema(sampleProtocol);
      const createItemTool = schema.tools.find(tool => tool.name === 'testApi_createItem');

      expect(createItemTool?.parameters.properties).toHaveProperty('metadata');
      expect(createItemTool?.parameters.properties.metadata).toEqual({
        type: 'object',
        description: 'Additional item metadata',
        properties: {
          tags: {
            type: 'array',
            description: 'Array of tags',
            items: {
              type: 'string',
              description: 'Individual tag'
            }
          }
        }
      });
    });

    it('should add authentication parameters when required', () => {
      const schema = generator.generateSchema(sampleProtocol);
      const getDataTool = schema.tools.find(tool => tool.name === 'testApi_getData');

      expect(getDataTool?.parameters.properties).toHaveProperty('apiKey');
      expect(getDataTool?.parameters.properties.apiKey).toEqual({
        type: 'string',
        description: 'API key for authentication',
        minLength: 1
      });

      expect(getDataTool?.parameters.required).toContain('apiKey');
    });

    it('should add common parameters to all tools', () => {
      const schema = generator.generateSchema(sampleProtocol);

      schema.tools.forEach((tool: any) => {
        expect(tool.parameters.properties).toHaveProperty('timeout');
        expect(tool.parameters.properties.timeout).toEqual({
          type: 'number',
          description: 'Request timeout in milliseconds',
          minimum: 1000,
          maximum: 60000,
          default: 10000
        });

        expect(tool.parameters.properties).toHaveProperty('retries');
        expect(tool.parameters.properties.retries).toEqual({
          type: 'number',
          description: 'Number of retry attempts on failure',
          minimum: 0,
          maximum: 5,
          default: 2
        });
      });
    });
  });

  describe('Authentication Parameter Generation', () => {
    it('should generate bearer token parameters', () => {
      const protocolWithBearer: CommunityProtocol = {
        ...sampleProtocol,
        authentication: {
          type: 'bearer_token'
        }
      };

      const schema = generator.generateSchema(protocolWithBearer);
      const tool = schema.tools[0];

      expect(tool?.parameters.properties).toHaveProperty('bearerToken');
      expect(tool?.parameters.properties?.bearerToken).toEqual({
        type: 'string',
        description: 'Bearer token for authentication',
        minLength: 1
      });
    });

    it('should generate basic auth parameters', () => {
      const protocolWithBasic: CommunityProtocol = {
        ...sampleProtocol,
        authentication: {
          type: 'basic'
        }
      };

      const schema = generator.generateSchema(protocolWithBasic);
      const tool = schema.tools[0];

      expect(tool?.parameters.properties).toHaveProperty('basicAuth');
      expect(tool?.parameters.properties?.basicAuth).toEqual({
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
      });
    });

    it('should generate OAuth2 parameters', () => {
      const protocolWithOAuth: CommunityProtocol = {
        ...sampleProtocol,
        authentication: {
          type: 'oauth2'
        }
      };

      const schema = generator.generateSchema(protocolWithOAuth);
      const tool = schema.tools[0];

      expect(tool?.parameters.properties).toHaveProperty('accessToken');
      expect(tool?.parameters.properties?.accessToken).toEqual({
        type: 'string',
        description: 'OAuth2 access token',
        minLength: 1
      });
    });
  });

  describe('Documentation Generation', () => {
    it('should generate schema documentation', () => {
      const schema = generator.generateSchema(sampleProtocol);
      const documentation = generator.generateSchemaDocumentation(schema);

      expect(documentation).toContain('# test-api v1.0.0 - MCP Tools');
      expect(documentation).toContain('Total tools: 2');
      expect(documentation).toContain('## testApi_getData');
      expect(documentation).toContain('## testApi_createItem');
      expect(documentation).toContain('### Parameters');
      expect(documentation).toContain('| Parameter | Type | Required | Description |');
    });

    it('should handle tools with no parameters in documentation', () => {
      const protocolWithNoParams: CommunityProtocol = {
        ...sampleProtocol,
        endpoints: [
          {
            name: 'ping',
            method: 'GET',
            path: '/ping',
            description: 'Health check endpoint',
            response: {
              type: 'object',
              description: 'Health status'
            }
          }
        ]
      };

      const schema = generator.generateSchema(protocolWithNoParams);
      const documentation = generator.generateSchemaDocumentation(schema);

      expect(documentation).toContain('timeout');
    });
  });

  describe('Schema Validation', () => {
    it('should validate generated schemas', () => {
      const schema = generator.generateSchema(sampleProtocol);
      const validation = generator.validateGeneratedSchema(schema);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect duplicate tool names', () => {
      const schema = generator.generateSchema(sampleProtocol);
      // Manually create duplicate
      if (schema.tools[0]) {
        schema.tools.push({ ...schema.tools[0] });
      }

      const validation = generator.validateGeneratedSchema(schema);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining('Duplicate tool name')
      );
    });

    it('should detect invalid tool name formats', () => {
      const schema = generator.generateSchema(sampleProtocol);
      if (schema.tools[0]) {
        schema.tools[0].name = '123invalid-name';
      }

      const validation = generator.validateGeneratedSchema(schema);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining('Invalid tool name format')
      );
    });

    it('should warn about long tool names', () => {
      const schema = generator.generateSchema(sampleProtocol);
      if (schema.tools[0]) {
        schema.tools[0].name = 'a'.repeat(70);
      }

      const validation = generator.validateGeneratedSchema(schema);

      expect(validation.warnings).toContainEqual(
        expect.stringContaining('Tool name is very long')
      );
    });

    it('should warn about short descriptions', () => {
      const schema = generator.generateSchema(sampleProtocol);
      if (schema.tools[0]) {
        schema.tools[0].description = 'Short';
      }

      const validation = generator.validateGeneratedSchema(schema);

      expect(validation.warnings).toContainEqual(
        expect.stringContaining('Tool description is very short')
      );
    });

    it('should validate parameter consistency', () => {
      const schema = generator.generateSchema(sampleProtocol);
      // Add required parameter that doesn't exist in properties
      if (schema.tools[0]?.parameters.required) {
        schema.tools[0].parameters.required.push('nonExistentParam');
      }

      const validation = generator.validateGeneratedSchema(schema);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining('Required parameter \'nonExistentParam\' not found')
      );
    });

    it('should detect missing parameter types', () => {
      const schema = generator.generateSchema(sampleProtocol);
      if (schema.tools[0]?.parameters.properties?.limit) {
        delete (schema.tools[0].parameters.properties.limit as any).type;
      }

      const validation = generator.validateGeneratedSchema(schema);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining('Parameter \'limit\' missing type')
      );
    });

    it('should warn about missing parameter descriptions', () => {
      const schema = generator.generateSchema(sampleProtocol);
      if (schema.tools[0]?.parameters.properties?.limit) {
        delete (schema.tools[0].parameters.properties.limit as any).description;
      }

      const validation = generator.validateGeneratedSchema(schema);

      expect(validation.warnings).toContainEqual(
        expect.stringContaining('Parameter \'limit\' missing description')
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty protocols gracefully', () => {
      const emptyProtocol: CommunityProtocol = {
        name: 'empty-protocol',
        version: '1.0.0',
        description: 'An empty protocol',
        author: 'Test Author',
        license: 'MIT',
        endpoints: []
      };

      expect(() => generator.generateSchema(emptyProtocol)).not.toThrow();
    });

    it('should handle protocols without authentication', () => {
      const protocolWithoutAuth: CommunityProtocol = {
        ...sampleProtocol,
        authentication: undefined,
        endpoints: sampleProtocol.endpoints.map((endpoint: any) => ({
          ...endpoint,
          authentication: false
        }))
      };

      const schema = generator.generateSchema(protocolWithoutAuth);

      schema.tools.forEach((tool: any) => {
        expect(tool.parameters.properties).not.toHaveProperty('apiKey');
        expect(tool.parameters.properties).not.toHaveProperty('bearerToken');
        expect(tool.parameters.properties).not.toHaveProperty('basicAuth');
        expect(tool.parameters.properties).not.toHaveProperty('accessToken');
      });
    });

    it('should handle protocols with special characters in names', () => {
      const protocolWithSpecialChars: CommunityProtocol = {
        ...sampleProtocol,
        name: 'test-api_v2'
      };

      const schema = generator.generateSchema(protocolWithSpecialChars);

      expect(schema.tools[0]?.name).toBe('testApiV2_getData');
      expect(schema.tools[1]?.name).toBe('testApiV2_createItem');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid protocol gracefully', () => {
      const invalidProtocol = null as any;

      expect(() => generator.generateSchema(invalidProtocol)).toThrow();
    });

    it('should provide meaningful error messages', () => {
      const protocolWithInvalidEndpoint: CommunityProtocol = {
        ...sampleProtocol,
        endpoints: [null as any]
      };

      expect(() => generator.generateSchema(protocolWithInvalidEndpoint)).toThrow();
    });
  });
});