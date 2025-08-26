# HyperLiquid MCP SDK

The HyperLiquid MCP SDK provides programmatic tools for creating, validating, and deploying community protocols. Use the SDK to build custom MCP servers, protocol templates, and integration tools.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [API Reference](#api-reference)
5. [Examples](#examples)
6. [Advanced Usage](#advanced-usage)
7. [Templates](#templates)

## Overview

The SDK consists of several key components:

- **ProtocolBuilder**: Fluent API for creating protocol definitions
- **Templates**: Pre-built protocol templates for common APIs
- **Validators**: Protocol validation utilities
- **Generators**: Code generation for custom MCP servers

### Key Features

- 🔧 **Type-safe Protocol Building**: TypeScript interfaces ensure correct protocol structure
- 📝 **Template System**: Quick start with pre-built templates
- ✅ **Built-in Validation**: Automatic validation during development
- 🚀 **Code Generation**: Generate standalone MCP servers
- 🎯 **IDE Support**: Full IntelliSense and autocompletion

## Installation

### From NPM

```bash
npm install hl-eco-mcp
# or
yarn add hl-eco-mcp
# or
pnpm add hl-eco-mcp
```

### From Source

```bash
git clone https://github.com/khrafts/hyper-mcp.git
cd hyper-mcp
pnpm install
pnpm build
```

### Usage in Your Project

```typescript
import { ProtocolBuilder, Templates } from 'hl-eco-mcp/sdk';
```

## Quick Start

### Creating a Simple Protocol

```typescript
import { ProtocolBuilder } from 'hl-eco-mcp/sdk';

const protocol = new ProtocolBuilder()
  .name('my-weather-api')
  .version('1.0.0')
  .description('Weather API integration for AI agents')
  .author('Your Name')
  .license('MIT')
  .authentication({
    type: 'api_key',
    location: 'header',
    name: 'x-api-key',
  })
  .rateLimit({
    requests: 100,
    window: '1m',
  })
  .addEndpoint('getCurrentWeather', {
    method: 'GET',
    path: 'https://api.weather.com/v1/current',
    description: 'Get current weather for a location',
    parameters: [
      {
        name: 'location',
        type: 'string',
        description: 'City name or coordinates',
        required: true,
        minLength: 1,
      },
    ],
  })
  .build();

// Save the protocol
await protocol.save('./protocols/my-weather-api.json');
```

### Using Templates

```typescript
import { Templates } from 'hl-eco-mcp/sdk';

// Create from REST API template
const protocol = Templates.restApi({
  name: 'my-api',
  baseUrl: 'https://api.example.com/v1',
  authentication: {
    type: 'bearer_token',
  },
  endpoints: [
    {
      name: 'getUsers',
      path: '/users',
      method: 'GET',
    },
  ],
});

await protocol.save('./protocols/my-api.json');
```

### Validating a Protocol

```typescript
import { ProtocolValidator } from 'hl-eco-mcp/sdk';

const validator = new ProtocolValidator();
const result = await validator.validateFile('./protocols/my-api.json');

if (result.valid) {
  console.log('✅ Protocol is valid');
} else {
  console.error('❌ Validation errors:');
  result.errors.forEach((error) => {
    console.error(`  - ${error.message} at ${error.path}`);
  });
}
```

## API Reference

### ProtocolBuilder

The main class for building protocol definitions programmatically.

#### Constructor

```typescript
new ProtocolBuilder();
```

#### Methods

##### Basic Information

```typescript
.name(name: string): ProtocolBuilder
```

Set the protocol name (kebab-case).

```typescript
.version(version: string): ProtocolBuilder
```

Set the protocol version (semantic versioning).

```typescript
.description(description: string): ProtocolBuilder
```

Set the protocol description.

```typescript
.author(author: string): ProtocolBuilder
```

Set the protocol author.

```typescript
.license(license: string): ProtocolBuilder
```

Set the protocol license (SPDX identifier).

```typescript
.repository(url: string): ProtocolBuilder
```

Set the repository URL.

```typescript
.homepage(url: string): ProtocolBuilder
```

Set the homepage URL.

##### Authentication

```typescript
.authentication(auth: AuthenticationConfig): ProtocolBuilder
```

**AuthenticationConfig:**

```typescript
type AuthenticationConfig =
  | { type: 'api_key'; location: 'header' | 'query' | 'cookie'; name: string }
  | { type: 'bearer_token'; location: 'header' }
  | { type: 'basic'; location: 'header' }
  | { type: 'oauth2'; location: 'header'; tokenUrl: string; scopes?: string[] };
```

##### Rate Limiting

```typescript
.rateLimit(config: RateLimitConfig): ProtocolBuilder
```

**RateLimitConfig:**

```typescript
interface RateLimitConfig {
  requests: number;
  window: '1s' | '1m' | '1h' | '1d';
}
```

##### Endpoints

```typescript
.addEndpoint(name: string, config: EndpointConfig): ProtocolBuilder
```

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
  // Type-specific constraints
  minLength?: number; // string
  maxLength?: number; // string
  pattern?: string; // string
  enum?: any[]; // string/number
  minimum?: number; // number
  maximum?: number; // number
  multipleOf?: number; // number
  properties?: Record<string, ParameterConfig>; // object
  items?: ParameterConfig; // array
  minItems?: number; // array
  maxItems?: number; // array
  uniqueItems?: boolean; // array
}
```

##### Metadata

```typescript
.metadata(metadata: MetadataConfig): ProtocolBuilder
```

**MetadataConfig:**

```typescript
interface MetadataConfig {
  category?: string;
  tags?: string[];
  documentation?: string;
  supportEmail?: string;
  features?: string[];
  [key: string]: any; // Additional properties allowed
}
```

##### Building

```typescript
.build(): Protocol
```

Build and return the protocol definition.

```typescript
.validate(): ValidationResult
```

Validate the current protocol without building.

### Protocol Class

Represents a complete protocol definition.

#### Methods

```typescript
async save(filePath: string): Promise<void>
```

Save the protocol to a JSON file.

```typescript
toJSON(): object
```

Convert to JSON object.

```typescript
toString(): string
```

Convert to JSON string.

```typescript
async validate(): Promise<ValidationResult>
```

Validate the protocol.

```typescript
async generateTools(): Promise<ToolDefinition[]>
```

Generate MCP tool definitions from the protocol.

### Templates

Pre-built protocol templates for common use cases.

#### REST API Template

```typescript
Templates.restApi(config: RestApiConfig): Protocol
```

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
}

interface RestEndpointConfig {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description?: string;
  parameters?: ParameterConfig[];
}
```

#### GraphQL Template

```typescript
Templates.graphQL(config: GraphQLConfig): Protocol
```

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

```typescript
Templates.openAPI(config: OpenAPIConfig): Promise<Protocol>
```

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
  endpoints?: string[]; // Filter to specific endpoints
}
```

### ProtocolValidator

Validates protocol definitions against the schema and business rules.

#### Methods

```typescript
async validate(protocol: Protocol | object): Promise<ValidationResult>
```

Validate a protocol object.

```typescript
async validateFile(filePath: string): Promise<ValidationResult>
```

Validate a protocol file.

```typescript
async validateJSON(json: string): Promise<ValidationResult>
```

Validate a protocol JSON string.

**ValidationResult:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

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
```

## Examples

### Example 1: Weather API

```typescript
import { ProtocolBuilder } from 'hl-eco-mcp/sdk';

const weatherApi = new ProtocolBuilder()
  .name('open-weather-map')
  .version('1.0.0')
  .description('OpenWeatherMap API integration')
  .author('Weather Corp')
  .license('MIT')
  .repository('https://github.com/weather-corp/owm-protocol')
  .authentication({
    type: 'api_key',
    location: 'query',
    name: 'appid',
  })
  .rateLimit({
    requests: 1000,
    window: '1d',
  })
  .addEndpoint('getCurrentWeather', {
    method: 'GET',
    path: 'https://api.openweathermap.org/data/2.5/weather',
    description: 'Get current weather data for a city',
    parameters: [
      {
        name: 'q',
        type: 'string',
        description: 'City name, state code, and country code',
        required: true,
        minLength: 1,
        maxLength: 100,
      },
      {
        name: 'units',
        type: 'string',
        description: 'Units of measurement',
        enum: ['standard', 'metric', 'imperial'],
        default: 'metric',
      },
    ],
    response: {
      type: 'object',
      description: 'Weather data response',
    },
  })
  .addEndpoint('getForecast', {
    method: 'GET',
    path: 'https://api.openweathermap.org/data/2.5/forecast',
    description: 'Get 5-day weather forecast',
    parameters: [
      {
        name: 'q',
        type: 'string',
        description: 'City name',
        required: true,
        minLength: 1,
      },
      {
        name: 'cnt',
        type: 'number',
        description: 'Number of forecasts to return',
        minimum: 1,
        maximum: 40,
        default: 5,
      },
    ],
  })
  .metadata({
    category: 'weather',
    tags: ['weather', 'forecast', 'climate'],
    documentation: 'https://openweathermap.org/api',
    features: ['Current weather', '5-day forecast', 'Multiple units'],
  })
  .build();

await weatherApi.save('./protocols/open-weather-map.json');
```

### Example 2: E-commerce API with Template

```typescript
import { Templates } from 'hl-eco-mcp/sdk';

const ecommerceApi = Templates.restApi({
  name: 'shop-api',
  version: '2.1.0',
  description: 'E-commerce platform API',
  author: 'Shop Corp',
  license: 'Apache-2.0',
  baseUrl: 'https://api.shop.com/v2',
  authentication: {
    type: 'bearer_token',
    location: 'header',
  },
  rateLimit: {
    requests: 500,
    window: '1h',
  },
  endpoints: [
    {
      name: 'searchProducts',
      path: '/products',
      method: 'GET',
      description: 'Search for products',
      parameters: [
        {
          name: 'q',
          type: 'string',
          description: 'Search query',
          required: true,
          minLength: 1,
        },
        {
          name: 'category',
          type: 'string',
          description: 'Product category',
          enum: ['electronics', 'clothing', 'books', 'home'],
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
    },
    {
      name: 'getProduct',
      path: '/products/{id}',
      method: 'GET',
      description: 'Get product by ID',
      parameters: [
        {
          name: 'id',
          type: 'string',
          description: 'Product ID',
          required: true,
          pattern: '^[0-9]+$',
        },
      ],
    },
    {
      name: 'createOrder',
      path: '/orders',
      method: 'POST',
      description: 'Create a new order',
      parameters: [
        {
          name: 'order',
          type: 'object',
          description: 'Order data',
          required: true,
          properties: {
            customerId: {
              name: 'customerId',
              type: 'string',
              description: 'Customer ID',
              required: true,
            },
            items: {
              name: 'items',
              type: 'array',
              description: 'Order items',
              required: true,
              items: {
                name: 'item',
                type: 'object',
                description: 'Order item',
                properties: {
                  productId: {
                    name: 'productId',
                    type: 'string',
                    description: 'Product ID',
                    required: true,
                  },
                  quantity: {
                    name: 'quantity',
                    type: 'number',
                    description: 'Quantity',
                    required: true,
                    minimum: 1,
                  },
                },
              },
            },
          },
        },
      ],
    },
  ],
});

// Add custom metadata
ecommerceApi.metadata({
  category: 'ecommerce',
  tags: ['shopping', 'retail', 'orders'],
  documentation: 'https://docs.shop.com/api',
  supportEmail: 'api-support@shop.com',
  features: ['Product search', 'Order management', 'Inventory tracking'],
});

await ecommerceApi.save('./protocols/shop-api.json');
```

### Example 3: GraphQL API

```typescript
import { Templates } from 'hl-eco-mcp/sdk';

const socialApi = Templates.graphQL({
  name: 'social-graph-api',
  version: '1.0.0',
  description: 'Social network GraphQL API',
  author: 'Social Corp',
  license: 'MIT',
  endpoint: 'https://api.social.com/graphql',
  authentication: {
    type: 'bearer_token',
    location: 'header',
  },
  operations: [
    {
      name: 'searchUsers',
      type: 'query',
      description: 'Search for users',
      query: `
        query SearchUsers($search: String!, $limit: Int) {
          users(search: $search, limit: $limit) {
            id
            username
            displayName
            avatar
            followersCount
          }
        }
      `,
      variables: [
        {
          name: 'search',
          type: 'string',
          description: 'Search term',
          required: true,
          minLength: 1,
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Maximum results',
          minimum: 1,
          maximum: 50,
          default: 10,
        },
      ],
    },
    {
      name: 'createPost',
      type: 'mutation',
      description: 'Create a new post',
      query: `
        mutation CreatePost($content: String!, $visibility: PostVisibility) {
          createPost(input: { content: $content, visibility: $visibility }) {
            id
            content
            createdAt
            author {
              username
              displayName
            }
          }
        }
      `,
      variables: [
        {
          name: 'content',
          type: 'string',
          description: 'Post content',
          required: true,
          minLength: 1,
          maxLength: 500,
        },
        {
          name: 'visibility',
          type: 'string',
          description: 'Post visibility',
          enum: ['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY'],
          default: 'PUBLIC',
        },
      ],
    },
  ],
});

await socialApi.save('./protocols/social-graph-api.json');
```

### Example 4: OpenAPI Integration

```typescript
import { Templates } from 'hl-eco-mcp/sdk';

// Generate protocol from OpenAPI spec
const petStoreApi = await Templates.openAPI({
  name: 'pet-store-api',
  specUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
  version: '1.0.0',
  description: 'Pet Store API generated from OpenAPI spec',
  author: 'Pet Store Inc',
  license: 'MIT',
  authentication: {
    type: 'api_key',
    location: 'header',
    name: 'api_key',
  },
  endpoints: ['/pet', '/pet/findByStatus', '/store/inventory', '/user'], // Only include these endpoints
});

await petStoreApi.save('./protocols/pet-store-api.json');
```

## Advanced Usage

### Custom Validation Rules

```typescript
import { ProtocolValidator } from 'hl-eco-mcp/sdk';

class CustomValidator extends ProtocolValidator {
  protected validateBusinessLogic(protocol: any): ValidationError[] {
    const errors = super.validateBusinessLogic(protocol);

    // Custom rule: All endpoints must have at least one parameter
    protocol.endpoints?.forEach((endpoint: any, index: number) => {
      if (!endpoint.parameters || endpoint.parameters.length === 0) {
        errors.push({
          code: 'CUSTOM_NO_PARAMETERS',
          message: 'Endpoints must have at least one parameter',
          path: `endpoints.${index}`,
          severity: 'error',
        });
      }
    });

    return errors;
  }
}

const validator = new CustomValidator();
```

### Protocol Transformation

```typescript
import { ProtocolBuilder } from 'hl-eco-mcp/sdk';

// Load and modify existing protocol
const existingProtocol = await Protocol.fromFile('./protocols/my-api.json');
const updatedProtocol = new ProtocolBuilder(existingProtocol)
  .version('2.0.0')
  .addEndpoint('newEndpoint', {
    method: 'GET',
    path: 'https://api.example.com/v2/new',
    description: 'New endpoint in v2',
  })
  .build();

await updatedProtocol.save('./protocols/my-api-v2.json');
```

### Bulk Protocol Operations

```typescript
import { glob } from 'glob';
import { ProtocolValidator } from 'hl-eco-mcp/sdk';

// Validate all protocols in a directory
const protocolFiles = await glob('./protocols/*.json');
const validator = new ProtocolValidator();

for (const file of protocolFiles) {
  const result = await validator.validateFile(file);
  if (!result.valid) {
    console.error(`❌ ${file}:`);
    result.errors.forEach((error) => {
      console.error(`  - ${error.message}`);
    });
  } else {
    console.log(`✅ ${file}`);
  }
}
```

### Code Generation

```typescript
import { CodeGenerator } from 'hl-eco-mcp/sdk';

const generator = new CodeGenerator();

// Generate standalone MCP server
await generator.generateServer({
  protocols: ['./protocols/weather-api.json', './protocols/shop-api.json'],
  output: './generated/my-mcp-server',
  serverName: 'my-custom-server',
  typescript: true,
  docker: true,
});

// Generated files:
// ./generated/my-mcp-server/
// ├── src/
// │   ├── index.ts
// │   ├── protocols/
// │   └── tools/
// ├── package.json
// ├── Dockerfile
// └── README.md
```

## Templates

The SDK includes several built-in templates to jumpstart protocol development:

### Available Templates

1. **REST API** (`Templates.restApi`)
2. **GraphQL API** (`Templates.graphQL`)
3. **OpenAPI Import** (`Templates.openAPI`)
4. **Webhook Handler** (`Templates.webhook`)
5. **Database API** (`Templates.database`)

### Creating Custom Templates

```typescript
import { ProtocolBuilder, Template } from 'hl-eco-mcp/sdk';

class CustomTemplate implements Template {
  name = 'custom-api';
  description = 'Custom API template';

  generate(config: CustomConfig): Protocol {
    return (
      new ProtocolBuilder()
        .name(config.name)
        .version(config.version || '1.0.0')
        .description(config.description)
        .author(config.author)
        .license(config.license || 'MIT')
        // Add custom logic here
        .build()
    );
  }
}

// Register custom template
Templates.register('custom', new CustomTemplate());

// Use custom template
const protocol = Templates.custom({
  name: 'my-custom-api',
  // custom config options
});
```

This SDK provides everything needed to create, validate, and deploy community protocols programmatically, making it easy to integrate the HyperLiquid MCP Server ecosystem into your development workflow.
