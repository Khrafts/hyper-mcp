# SDK API Reference

Complete API reference for the HyperLiquid MCP SDK.

## Core Classes

### ProtocolBuilder

Main class for building protocol definitions programmatically.

```typescript
import { ProtocolBuilder } from 'hl-eco-mcp/sdk';
```

#### Constructor

```typescript
constructor(existing?: Partial<Protocol>)
```

Create a new ProtocolBuilder instance, optionally based on an existing protocol.

**Parameters:**

- `existing` (optional): Existing protocol to extend or modify

**Example:**

```typescript
const builder = new ProtocolBuilder();

// Or extend existing protocol
const existingProtocol = await Protocol.fromFile('./my-protocol.json');
const builder = new ProtocolBuilder(existingProtocol);
```

#### Basic Information Methods

##### `.name(name: string): ProtocolBuilder`

Set the protocol name. Must be in kebab-case format.

**Parameters:**

- `name`: Protocol name (3-50 characters, kebab-case)

**Returns:** ProtocolBuilder instance for chaining

**Throws:**

- `ValidationError`: If name format is invalid

**Example:**

```typescript
builder.name('my-awesome-api'); // ✅ Valid
builder.name('MyAPI'); // ❌ Invalid (not kebab-case)
builder.name('my_api'); // ❌ Invalid (underscore not allowed)
```

##### `.version(version: string): ProtocolBuilder`

Set the protocol version using semantic versioning.

**Parameters:**

- `version`: Semantic version string (e.g., "1.0.0", "2.1.3-beta.1")

**Returns:** ProtocolBuilder instance for chaining

**Throws:**

- `ValidationError`: If version format is invalid

**Example:**

```typescript
builder.version('1.0.0'); // ✅ Valid
builder.version('2.1.3-beta.1'); // ✅ Valid
builder.version('v1.0.0'); // ❌ Invalid (no 'v' prefix)
builder.version('1.0'); // ❌ Invalid (missing patch version)
```

##### `.description(description: string): ProtocolBuilder`

Set the protocol description.

**Parameters:**

- `description`: Description text (10-500 characters)

**Returns:** ProtocolBuilder instance for chaining

**Example:**

```typescript
builder.description('Weather API integration providing current conditions and forecasts');
```

##### `.author(author: string): ProtocolBuilder`

Set the protocol author.

**Parameters:**

- `author`: Author name or organization (1-100 characters)

**Returns:** ProtocolBuilder instance for chaining

**Example:**

```typescript
builder.author('Weather Corp');
builder.author('John Doe <john@example.com>');
```

##### `.license(license: string): ProtocolBuilder`

Set the protocol license.

**Parameters:**

- `license`: SPDX license identifier

**Returns:** ProtocolBuilder instance for chaining

**Example:**

```typescript
builder.license('MIT');
builder.license('Apache-2.0');
builder.license('GPL-3.0');
```

##### `.repository(url: string): ProtocolBuilder`

Set the repository URL.

**Parameters:**

- `url`: Git repository URL (must be HTTPS)

**Returns:** ProtocolBuilder instance for chaining

**Throws:**

- `ValidationError`: If URL is not a valid HTTPS Git repository URL

**Example:**

```typescript
builder.repository('https://github.com/user/repo');
builder.repository('https://gitlab.com/user/repo.git');
```

##### `.homepage(url: string): ProtocolBuilder`

Set the homepage URL.

**Parameters:**

- `url`: Homepage URL (must be HTTPS)

**Returns:** ProtocolBuilder instance for chaining

**Example:**

```typescript
builder.homepage('https://docs.myapi.com');
```

#### Authentication Methods

##### `.authentication(config: AuthenticationConfig): ProtocolBuilder`

Set authentication configuration.

**Parameters:**

- `config`: Authentication configuration object

**Returns:** ProtocolBuilder instance for chaining

**AuthenticationConfig Types:**

```typescript
type AuthenticationConfig = ApiKeyConfig | BearerTokenConfig | BasicAuthConfig | OAuth2Config;

interface ApiKeyConfig {
  type: 'api_key';
  location: 'header' | 'query' | 'cookie';
  name: string;
}

interface BearerTokenConfig {
  type: 'bearer_token';
  location: 'header';
}

interface BasicAuthConfig {
  type: 'basic';
  location: 'header';
}

interface OAuth2Config {
  type: 'oauth2';
  location: 'header';
  tokenUrl: string;
  scopes?: string[];
}
```

**Examples:**

```typescript
// API Key in header
builder.authentication({
  type: 'api_key',
  location: 'header',
  name: 'x-api-key',
});

// Bearer token
builder.authentication({
  type: 'bearer_token',
  location: 'header',
});

// OAuth2
builder.authentication({
  type: 'oauth2',
  location: 'header',
  tokenUrl: 'https://api.example.com/oauth/token',
  scopes: ['read', 'write'],
});
```

#### Rate Limiting Methods

##### `.rateLimit(config: RateLimitConfig): ProtocolBuilder`

Set rate limiting configuration.

**Parameters:**

- `config`: Rate limit configuration

**Returns:** ProtocolBuilder instance for chaining

**RateLimitConfig:**

```typescript
interface RateLimitConfig {
  requests: number; // 1-10000
  window: '1s' | '1m' | '1h' | '1d';
}
```

**Examples:**

```typescript
builder.rateLimit({ requests: 100, window: '1m' });
builder.rateLimit({ requests: 1000, window: '1h' });
```

#### Endpoint Methods

##### `.addEndpoint(name: string, config: EndpointConfig): ProtocolBuilder`

Add an API endpoint.

**Parameters:**

- `name`: Endpoint name (camelCase, 1-50 characters)
- `config`: Endpoint configuration

**Returns:** ProtocolBuilder instance for chaining

**EndpointConfig:**

```typescript
interface EndpointConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters?: ParameterConfig[];
  response?: ResponseConfig;
  authentication?: boolean;
  rateLimit?: RateLimitConfig;
}
```

**ParameterConfig:**

```typescript
interface ParameterConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;

  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];

  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Object constraints
  properties?: Record<string, ParameterConfig>;
  additionalProperties?: boolean;
  minProperties?: number;
  maxProperties?: number;

  // Array constraints
  items?: ParameterConfig;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}
```

**Example:**

```typescript
builder.addEndpoint('searchUsers', {
  method: 'GET',
  path: 'https://api.example.com/users',
  description: 'Search for users',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Search query',
      required: true,
      minLength: 1,
      maxLength: 100,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum results',
      minimum: 1,
      maximum: 100,
      default: 20,
    },
  ],
});
```

##### `.removeEndpoint(name: string): ProtocolBuilder`

Remove an endpoint by name.

**Parameters:**

- `name`: Endpoint name to remove

**Returns:** ProtocolBuilder instance for chaining

##### `.updateEndpoint(name: string, config: Partial<EndpointConfig>): ProtocolBuilder`

Update an existing endpoint.

**Parameters:**

- `name`: Endpoint name to update
- `config`: Partial configuration to merge

**Returns:** ProtocolBuilder instance for chaining

#### Metadata Methods

##### `.metadata(metadata: MetadataConfig): ProtocolBuilder`

Set protocol metadata.

**Parameters:**

- `metadata`: Metadata configuration

**Returns:** ProtocolBuilder instance for chaining

**MetadataConfig:**

```typescript
interface MetadataConfig {
  category?: string;
  tags?: string[];
  documentation?: string;
  supportEmail?: string;
  features?: string[];
  [key: string]: any; // Additional properties
}
```

**Example:**

```typescript
builder.metadata({
  category: 'weather',
  tags: ['weather', 'forecast', 'climate'],
  documentation: 'https://docs.weather-api.com',
  supportEmail: 'support@weather-api.com',
  features: ['Current weather', '5-day forecast', 'Historical data'],
});
```

#### Building Methods

##### `.build(): Protocol`

Build the protocol and return a Protocol instance.

**Returns:** Protocol instance

**Throws:**

- `ValidationError`: If protocol is invalid

**Example:**

```typescript
const protocol = builder.build();
```

##### `.validate(): ValidationResult`

Validate the current protocol configuration without building.

**Returns:** ValidationResult object

**ValidationResult:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

**Example:**

```typescript
const result = builder.validate();
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

##### `.toJSON(): object`

Convert current configuration to JSON object.

**Returns:** JSON object representation

**Example:**

```typescript
const json = builder.toJSON();
console.log(JSON.stringify(json, null, 2));
```

### Protocol

Represents a complete, validated protocol definition.

```typescript
import { Protocol } from 'hl-eco-mcp/sdk';
```

#### Static Methods

##### `Protocol.fromFile(filePath: string): Promise<Protocol>`

Load a protocol from a JSON file.

**Parameters:**

- `filePath`: Path to JSON file

**Returns:** Promise<Protocol>

**Throws:**

- `FileNotFoundError`: If file doesn't exist
- `ValidationError`: If protocol is invalid

**Example:**

```typescript
const protocol = await Protocol.fromFile('./protocols/weather-api.json');
```

##### `Protocol.fromJSON(json: object | string): Protocol`

Create a protocol from JSON object or string.

**Parameters:**

- `json`: JSON object or JSON string

**Returns:** Protocol instance

**Throws:**

- `ValidationError`: If protocol is invalid

**Example:**

```typescript
const protocol = Protocol.fromJSON({
  name: 'test-api',
  version: '1.0.0',
  // ... other fields
});
```

#### Instance Methods

##### `async save(filePath: string): Promise<void>`

Save the protocol to a JSON file.

**Parameters:**

- `filePath`: Output file path

**Returns:** Promise<void>

**Example:**

```typescript
await protocol.save('./protocols/my-protocol.json');
```

##### `toJSON(): object`

Convert protocol to JSON object.

**Returns:** JSON object representation

##### `toString(indent?: number): string`

Convert protocol to JSON string.

**Parameters:**

- `indent` (optional): Indentation spaces (default: 2)

**Returns:** JSON string

##### `async validate(): Promise<ValidationResult>`

Validate the protocol.

**Returns:** Promise<ValidationResult>

##### `async generateTools(): Promise<ToolDefinition[]>`

Generate MCP tool definitions from the protocol.

**Returns:** Promise<ToolDefinition[]>

**ToolDefinition:**

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}
```

##### `clone(): Protocol`

Create a deep copy of the protocol.

**Returns:** New Protocol instance

#### Properties

##### `name: string`

Protocol name (read-only).

##### `version: string`

Protocol version (read-only).

##### `endpoints: EndpointDefinition[]`

Array of endpoint definitions (read-only).

### Templates

Pre-built protocol templates for common use cases.

```typescript
import { Templates } from 'hl-eco-mcp/sdk';
```

#### REST API Template

##### `Templates.restApi(config: RestApiConfig): Protocol`

Create a REST API protocol from configuration.

**RestApiConfig:**

```typescript
interface RestApiConfig {
  name: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  baseUrl: string;
  authentication?: AuthenticationConfig;
  rateLimit?: RateLimitConfig;
  endpoints: RestEndpointConfig[];
  metadata?: MetadataConfig;
}

interface RestEndpointConfig {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description?: string;
  parameters?: ParameterConfig[];
  response?: ResponseConfig;
}
```

**Example:**

```typescript
const protocol = Templates.restApi({
  name: 'user-api',
  baseUrl: 'https://api.example.com/v1',
  authentication: {
    type: 'api_key',
    location: 'header',
    name: 'x-api-key',
  },
  endpoints: [
    {
      name: 'getUser',
      path: '/users/{id}',
      method: 'GET',
      description: 'Get user by ID',
    },
  ],
});
```

#### GraphQL Template

##### `Templates.graphQL(config: GraphQLConfig): Protocol`

Create a GraphQL API protocol.

**GraphQLConfig:**

```typescript
interface GraphQLConfig {
  name: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  endpoint: string;
  authentication?: AuthenticationConfig;
  operations: GraphQLOperation[];
  metadata?: MetadataConfig;
}

interface GraphQLOperation {
  name: string;
  type: 'query' | 'mutation';
  query: string;
  variables?: ParameterConfig[];
  description?: string;
}
```

#### OpenAPI Template

##### `Templates.openAPI(config: OpenAPIConfig): Promise<Protocol>`

Generate a protocol from an OpenAPI specification.

**OpenAPIConfig:**

```typescript
interface OpenAPIConfig {
  name: string;
  specUrl: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  authentication?: AuthenticationConfig;
  endpoints?: string[]; // Filter specific endpoints
  metadata?: MetadataConfig;
}
```

### ProtocolValidator

Validates protocol definitions.

```typescript
import { ProtocolValidator } from 'hl-eco-mcp/sdk';
```

#### Constructor

```typescript
constructor(config?: ValidatorConfig)
```

**ValidatorConfig:**

```typescript
interface ValidatorConfig {
  strictMode?: boolean;
  maxEndpoints?: number;
  allowedDomains?: string[];
  requiredFields?: string[];
}
```

#### Methods

##### `async validate(protocol: Protocol | object): Promise<ValidationResult>`

Validate a protocol.

**Parameters:**

- `protocol`: Protocol instance or object to validate

**Returns:** Promise<ValidationResult>

##### `async validateFile(filePath: string): Promise<ValidationResult>`

Validate a protocol file.

**Parameters:**

- `filePath`: Path to JSON file

**Returns:** Promise<ValidationResult>

##### `async validateJSON(json: string): Promise<ValidationResult>`

Validate a JSON string.

**Parameters:**

- `json`: JSON string to validate

**Returns:** Promise<ValidationResult>

## Type Definitions

### Core Types

```typescript
interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error';
}

interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  severity: 'warning';
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  // ... other JSON Schema properties
}
```

### Authentication Types

```typescript
type AuthenticationConfig = ApiKeyConfig | BearerTokenConfig | BasicAuthConfig | OAuth2Config;

interface ApiKeyConfig {
  type: 'api_key';
  location: 'header' | 'query' | 'cookie';
  name: string;
}

interface BearerTokenConfig {
  type: 'bearer_token';
  location: 'header';
}

interface BasicAuthConfig {
  type: 'basic';
  location: 'header';
}

interface OAuth2Config {
  type: 'oauth2';
  location: 'header';
  tokenUrl: string;
  scopes?: string[];
}
```

### Parameter Types

```typescript
interface ParameterConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;

  // String-specific
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: any[];

  // Number-specific
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Object-specific
  properties?: Record<string, ParameterConfig>;
  additionalProperties?: boolean;
  minProperties?: number;
  maxProperties?: number;

  // Array-specific
  items?: ParameterConfig;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}
```

## Error Handling

### Error Types

The SDK throws specific error types for different scenarios:

```typescript
class ValidationError extends Error {
  constructor(message: string, errors?: ValidationErrorDetail[]);
  errors: ValidationErrorDetail[];
}

class FileNotFoundError extends Error {
  constructor(filePath: string);
  filePath: string;
}

class NetworkError extends Error {
  constructor(message: string, statusCode?: number);
  statusCode?: number;
}

class ParseError extends Error {
  constructor(message: string, parseError?: Error);
  parseError?: Error;
}
```

### Error Handling Examples

```typescript
try {
  const protocol = await Protocol.fromFile('./invalid-protocol.json');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.message} at ${err.path}`);
    });
  } else if (error instanceof FileNotFoundError) {
    console.error(`File not found: ${error.filePath}`);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Advanced Usage Examples

### Custom Validation

```typescript
import { ProtocolValidator } from 'hl-eco-mcp/sdk';

class CustomValidator extends ProtocolValidator {
  protected validateBusinessLogic(protocol: any): ValidationError[] {
    const errors = super.validateBusinessLogic(protocol);

    // Custom validation rule
    if (protocol.name.includes('test') && process.env.NODE_ENV === 'production') {
      errors.push({
        code: 'TEST_PROTOCOL_IN_PRODUCTION',
        message: 'Test protocols not allowed in production',
        path: 'name',
        severity: 'error',
      });
    }

    return errors;
  }
}
```

### Batch Operations

```typescript
import { glob } from 'glob';

async function validateAllProtocols() {
  const files = await glob('./protocols/*.json');
  const validator = new ProtocolValidator();

  const results = await Promise.all(
    files.map(async (file) => ({
      file,
      result: await validator.validateFile(file),
    }))
  );

  const invalid = results.filter((r) => !r.result.valid);
  if (invalid.length > 0) {
    console.error(`${invalid.length} invalid protocols found`);
    invalid.forEach(({ file, result }) => {
      console.error(`❌ ${file}:`);
      result.errors.forEach((error) => {
        console.error(`  - ${error.message}`);
      });
    });
  }
}
```

This comprehensive API reference covers all public methods and interfaces in the HyperLiquid MCP SDK.
