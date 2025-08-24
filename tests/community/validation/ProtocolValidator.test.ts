import { ProtocolValidator } from '../../../src/community/validation/ProtocolValidator.js';
import { CommunityProtocol } from '../../../src/community/types/index.js';

describe('ProtocolValidator', () => {
  let validator: ProtocolValidator;

  beforeEach(() => {
    validator = new ProtocolValidator({
      strictMode: true,
      maxEndpoints: 10,
      requiredFields: ['name', 'version', 'description', 'author', 'license']
    });
  });

  describe('Basic Validation', () => {
    const validProtocol: CommunityProtocol = {
      name: 'test-protocol',
      version: '1.0.0',
      description: 'A test protocol for validation',
      author: 'Test Author',
      license: 'MIT',
      endpoints: [
        {
          name: 'getData',
          method: 'GET',
          path: '/api/data',
          description: 'Get data from the API',
          response: {
            type: 'object',
            description: 'Data response'
          }
        }
      ]
    };

    it('should validate a valid protocol', async () => {
      const result = await validator.validate(validProtocol);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject protocol with invalid name format', async () => {
      const invalidProtocol = {
        ...validProtocol,
        name: '123invalid-name'
      };

      const result = await validator.validate(invalidProtocol);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'SCHEMA_VALIDATION',
          path: 'name'
        })
      );
    });

    it('should reject protocol with invalid version format', async () => {
      const invalidProtocol = {
        ...validProtocol,
        version: 'invalid-version'
      };

      const result = await validator.validate(invalidProtocol);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'SCHEMA_VALIDATION',
          path: 'version'
        })
      );
    });

    it('should reject protocol with short description', async () => {
      const invalidProtocol = {
        ...validProtocol,
        description: 'Short'
      };

      const result = await validator.validate(invalidProtocol);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'SCHEMA_VALIDATION',
          path: 'description'
        })
      );
    });

    it('should reject protocol with missing required fields', async () => {
      const invalidProtocol = {
        ...validProtocol,
        author: undefined
      } as any;

      const result = await validator.validate(invalidProtocol);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some((error: any) => error.path === 'author')).toBe(true);
    });
  });

  describe('Endpoint Validation', () => {
    it('should reject protocol with too many endpoints', async () => {
      const endpoints = Array.from({ length: 15 }, (_, i) => ({
        name: `endpoint${i}`,
        method: 'GET' as const,
        path: `/api/endpoint${i}`,
        description: `Endpoint ${i} description`,
        response: {
          type: 'object' as const,
          description: 'Response'
        }
      }));

      const protocolWithManyEndpoints: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol with many endpoints',
        author: 'Test Author',
        license: 'MIT',
        endpoints
      };

      const result = await validator.validate(protocolWithManyEndpoints);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'TOO_MANY_ENDPOINTS'
        })
      );
    });

    it('should reject protocol with duplicate endpoint names', async () => {
      const protocolWithDuplicates: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol with duplicate endpoints',
        author: 'Test Author',
        license: 'MIT',
        endpoints: [
          {
            name: 'getData',
            method: 'GET',
            path: '/api/data1',
            description: 'Get data endpoint 1',
            response: { type: 'object', description: 'Response' }
          },
          {
            name: 'getData',
            method: 'POST',
            path: '/api/data2',
            description: 'Get data endpoint 2',
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithDuplicates);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'DUPLICATE_ENDPOINT'
        })
      );
    });

    it('should reject protocol with duplicate path/method combinations', async () => {
      const protocolWithDuplicatePaths: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol with duplicate paths',
        author: 'Test Author',
        license: 'MIT',
        endpoints: [
          {
            name: 'getData1',
            method: 'GET',
            path: '/api/data',
            description: 'Get data endpoint 1',
            response: { type: 'object', description: 'Response' }
          },
          {
            name: 'getData2',
            method: 'GET',
            path: '/api/data',
            description: 'Get data endpoint 2',
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithDuplicatePaths);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'DUPLICATE_PATH_METHOD'
        })
      );
    });
  });

  describe('Parameter Validation', () => {
    it('should validate parameters with correct types', async () => {
      const protocolWithParams: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol with parameters',
        author: 'Test Author',
        license: 'MIT',
        endpoints: [
          {
            name: 'getData',
            method: 'GET',
            path: '/api/data',
            description: 'Get data with parameters',
            parameters: [
              {
                name: 'limit',
                type: 'number',
                description: 'Limit the number of results',
                required: false,
                minimum: 1,
                maximum: 100
              },
              {
                name: 'category',
                type: 'string',
                description: 'Filter by category',
                required: false,
                enum: ['news', 'sports', 'tech']
              }
            ],
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithParams);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject parameters with invalid enum types', async () => {
      const protocolWithInvalidEnum: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol with invalid enum',
        author: 'Test Author',
        license: 'MIT',
        endpoints: [
          {
            name: 'getData',
            method: 'GET',
            path: '/api/data',
            description: 'Get data with invalid enum',
            parameters: [
              {
                name: 'status',
                type: 'string',
                description: 'Status filter',
                required: false,
                enum: ['active', 123, true] // Mixed types in enum
              }
            ],
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithInvalidEnum);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_ENUM_TYPE'
        })
      );
    });

    it('should reject parameters with invalid number ranges', async () => {
      const protocolWithInvalidRange: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol with invalid range',
        author: 'Test Author',
        license: 'MIT',
        endpoints: [
          {
            name: 'getData',
            method: 'GET',
            path: '/api/data',
            description: 'Get data with invalid range',
            parameters: [
              {
                name: 'value',
                type: 'number',
                description: 'Numeric value',
                required: false,
                minimum: 100,
                maximum: 50 // Invalid: minimum > maximum
              }
            ],
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithInvalidRange);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_NUMBER_RANGE'
        })
      );
    });
  });

  describe('Security Validation', () => {
    it('should warn about missing authentication', async () => {
      const protocolWithoutAuth: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol without authentication',
        author: 'Test Author',
        license: 'MIT',
        endpoints: [
          {
            name: 'getData',
            method: 'GET',
            path: '/api/data',
            description: 'Get data without auth',
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithoutAuth);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'NO_AUTHENTICATION'
        })
      );
    });

    it('should warn about missing rate limiting', async () => {
      const protocolWithoutRateLimit: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol without rate limiting',
        author: 'Test Author',
        license: 'MIT',
        endpoints: [
          {
            name: 'getData',
            method: 'GET',
            path: '/api/data',
            description: 'Get data without rate limit',
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithoutRateLimit);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'NO_RATE_LIMIT'
        })
      );
    });

    it('should warn about insecure repository URLs', async () => {
      const protocolWithHttpRepo: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol with insecure repo',
        author: 'Test Author',
        license: 'MIT',
        repository: 'http://github.com/test/repo',
        endpoints: [
          {
            name: 'getData',
            method: 'GET',
            path: '/api/data',
            description: 'Get data',
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithHttpRepo);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'INSECURE_REPOSITORY_URL'
        })
      );
    });

    it('should warn about sensitive data in URL paths', async () => {
      const protocolWithSensitivePath: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol with sensitive path',
        author: 'Test Author',
        license: 'MIT',
        endpoints: [
          {
            name: 'getPassword',
            method: 'GET',
            path: '/api/password/reset',
            description: 'Password reset endpoint',
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithSensitivePath);
      
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'SENSITIVE_DATA_IN_URL'
        })
      );
    });
  });

  describe('Domain Validation', () => {
    beforeEach(() => {
      validator = new ProtocolValidator({
        strictMode: true,
        maxEndpoints: 10,
        allowedDomains: ['github.com', 'gitlab.com'],
        requiredFields: ['name', 'version', 'description', 'author', 'license']
      });
    });

    it('should allow protocols from allowed domains', async () => {
      const protocolWithAllowedDomain: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol from allowed domain',
        author: 'Test Author',
        license: 'MIT',
        repository: 'https://github.com/test/repo',
        endpoints: [
          {
            name: 'getData',
            method: 'GET',
            path: '/api/data',
            description: 'Get data',
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithAllowedDomain);
      
      expect(result.valid).toBe(true);
    });

    it('should reject protocols from disallowed domains', async () => {
      const protocolWithDisallowedDomain: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol from disallowed domain',
        author: 'Test Author',
        license: 'MIT',
        repository: 'https://bitbucket.org/test/repo',
        endpoints: [
          {
            name: 'getData',
            method: 'GET',
            path: '/api/data',
            description: 'Get data',
            response: { type: 'object', description: 'Response' }
          }
        ]
      };

      const result = await validator.validate(protocolWithDisallowedDomain);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'DOMAIN_NOT_ALLOWED'
        })
      );
    });
  });

  describe('Individual Endpoint Validation', () => {
    it('should validate individual endpoints', () => {
      const validEndpoint = {
        name: 'getData',
        method: 'GET' as const,
        path: '/api/data',
        description: 'Get data from the API',
        response: {
          type: 'object' as const,
          description: 'Data response'
        }
      };

      const result = validator.validateEndpoint(validEndpoint);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid endpoints', () => {
      const invalidEndpoint = {
        name: '',
        method: 'INVALID' as any,
        path: '/api/data',
        description: 'Get data from the API',
        response: {
          type: 'object' as const,
          description: 'Data response'
        }
      };

      const result = validator.validateEndpoint(invalidEndpoint);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidProtocol = null as any;

      const result = await validator.validate(invalidProtocol);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      );
    });

    it('should provide detailed error messages', async () => {
      const protocolWithMultipleErrors: CommunityProtocol = {
        name: '123invalid',
        version: 'invalid',
        description: 'Short',
        author: '',
        license: '',
        endpoints: []
      };

      const result = await validator.validate(protocolWithMultipleErrors);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
      
      // Each error should have required properties
      result.errors.forEach((error: any) => {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('path');
        expect(error).toHaveProperty('severity');
        expect(error.severity).toBe('error');
      });
    });
  });
});