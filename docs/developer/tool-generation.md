# Tool Generation Process

This document explains how the HyperLiquid MCP Server transforms community protocol definitions into functional MCP tools that AI agents can discover and use.

## Table of Contents

1. [Overview](#overview)
2. [Generation Pipeline](#generation-pipeline)
3. [Tool Naming Conventions](#tool-naming-conventions)
4. [Parameter Mapping](#parameter-mapping)
5. [Authentication Integration](#authentication-integration)
6. [Error Handling](#error-handling)
7. [Schema Generation](#schema-generation)
8. [Runtime Execution](#runtime-execution)
9. [Caching and Performance](#caching-and-performance)
10. [Debugging Tool Generation](#debugging-tool-generation)

## Overview

The tool generation process is the core of the community protocol system. It takes declarative JSON protocol definitions and automatically creates fully functional MCP tools that handle:

- **Parameter validation** based on protocol schemas
- **Authentication** using configured methods
- **API requests** to the target service
- **Response processing** and error handling
- **Rate limiting** and request management
- **Tool documentation** for AI agents

### Architecture Components

```
Protocol JSON → Validator → Schema Generator → Tool Generator → MCP Tools
     ↓              ↓             ↓              ↓             ↓
  Definition    Validation    JSON Schema    Tool Handler   Runtime
     File       Rules        Generation     Creation       Execution
```

## Generation Pipeline

### Step 1: Protocol Loading

The system loads protocol definitions from the `/protocols/` directory during server startup.

```typescript
// Example: Loading protocols
const protocolFiles = await readdir('protocols/');
const jsonFiles = protocolFiles.filter((file) => file.endsWith('.json'));

for (const file of jsonFiles) {
  const protocolPath = join('protocols/', file);
  const protocol = await loadProtocol(protocolPath);
  // Continue with validation and generation...
}
```

#### Loading Process

1. **File Discovery**: Scan `/protocols/` directory for `.json` files
2. **JSON Parsing**: Parse each file as JSON
3. **Initial Validation**: Check basic JSON structure
4. **Protocol Registration**: Add to the protocol registry

### Step 2: Protocol Validation

Each protocol undergoes comprehensive validation before tool generation.

```typescript
// Example: Validation process
const validationResult = await validator.validate(protocol);
if (!validationResult.valid) {
  throw new Error(`Protocol validation failed: ${validationResult.errors.join(', ')}`);
}
```

#### Validation Stages

1. **Schema Validation**: Verify against JSON schema
2. **Business Logic Validation**: Check naming, endpoints, etc.
3. **Security Validation**: Ensure no hardcoded credentials
4. **Domain Validation**: Check against allowed domains (if configured)

### Step 3: Schema Generation

The schema generator converts protocol definitions into JSON Schema format for MCP tool input validation.

```typescript
// Example: Schema generation
const toolSchemas = schemaGenerator.generateSchema(protocol);
// Result: Array of {name, description, parameters} objects
```

#### Schema Transformation

**Protocol Parameter** → **JSON Schema Property**

```json
// Protocol parameter
{
  "name": "query",
  "type": "string",
  "description": "Search query",
  "required": true,
  "minLength": 1,
  "maxLength": 100
}

// Generated JSON Schema
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query",
      "minLength": 1,
      "maxLength": 100
    }
  },
  "required": ["query"]
}
```

### Step 4: Tool Generation

The tool generator creates MCP tool handlers for each protocol endpoint.

```typescript
// Example: Tool generation
const tools = await toolGenerator.generateTools(protocol);
for (const tool of tools) {
  toolRegistry.register('community', {
    name: tool.name,
    description: tool.description,
    category: 'community',
    version: protocol.version,
    enabled: true,
    inputSchema: tool.parameters,
    handler: tool.handler,
  });
}
```

#### Generated Tool Structure

Each generated tool includes:

```typescript
interface GeneratedTool {
  name: string; // Tool name (e.g., "weatherApi_getCurrentWeather")
  description: string; // Tool description with auth info
  parameters: JSONSchema; // Input validation schema
  handler: ToolHandler; // Async function that executes the tool
}
```

### Step 5: Tool Registration

Generated tools are registered with the MCP server's tool registry.

```typescript
// Example: Tool registration
toolRegistry.register('community', {
  name: 'gluexDefi_getLiquidity',
  description: 'Get available liquidity across all supported chains and liquidity modules (Requires authentication: api_key) [gluex-defi v1.0.0]',
  category: 'community',
  version: '1.0.0',
  enabled: true,
  inputSchema: {...},
  handler: async (args) => { /* tool implementation */ }
});
```

## Tool Naming Conventions

### Naming Pattern

All generated tools follow the pattern:

```
{protocolName}_{endpointName}
```

### Name Transformation

**Protocol Name Transformation**: `kebab-case` → `camelCase`

- `weather-api` → `weatherApi`
- `gluex-defi` → `gluexDefi`
- `social-media-platform` → `socialMediaPlatform`

**Endpoint Name**: Already in `camelCase`

- `getCurrentWeather` → `getCurrentWeather`
- `searchUsers` → `searchUsers`

### Examples

| Protocol Name     | Endpoint Name       | Generated Tool Name            |
| ----------------- | ------------------- | ------------------------------ |
| `weather-api`     | `getCurrentWeather` | `weatherApi_getCurrentWeather` |
| `gluex-defi`      | `getOptimalRoute`   | `gluexDefi_getOptimalRoute`    |
| `social-platform` | `createPost`        | `socialPlatform_createPost`    |

### Name Collision Handling

If tool names collide across protocols:

1. **First Protocol Wins**: The first loaded protocol keeps the name
2. **Subsequent Protocols**: Get a suffix `_v{version}` or `_alt`
3. **Warning Logged**: System logs name collision warnings

## Parameter Mapping

### Basic Type Mapping

| Protocol Type | JSON Schema Type | Validation                             |
| ------------- | ---------------- | -------------------------------------- |
| `string`      | `string`         | minLength, maxLength, pattern, enum    |
| `number`      | `number`         | minimum, maximum, multipleOf           |
| `boolean`     | `boolean`        | No additional validation               |
| `object`      | `object`         | properties, additionalProperties       |
| `array`       | `array`          | items, minItems, maxItems, uniqueItems |

### Complex Parameter Handling

#### Object Parameters

**Protocol Definition:**

```json
{
  "name": "user",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "required": true,
      "minLength": 1
    },
    "email": {
      "type": "string",
      "pattern": "^[^@]+@[^@]+\\.[^@]+$"
    }
  }
}
```

**Generated Schema:**

```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "email": {
          "type": "string",
          "pattern": "^[^@]+@[^@]+\\.[^@]+$"
        }
      },
      "required": ["name"]
    }
  },
  "required": ["user"]
}
```

#### Array Parameters

**Protocol Definition:**

```json
{
  "name": "tags",
  "type": "array",
  "items": {
    "type": "string",
    "minLength": 1
  },
  "minItems": 1,
  "maxItems": 10
}
```

**Generated Schema:**

```json
{
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      },
      "minItems": 1,
      "maxItems": 10
    }
  },
  "required": ["tags"]
}
```

### Default Value Handling

Parameters with default values are not included in the `required` array:

```json
// Protocol parameter with default
{
  "name": "limit",
  "type": "number",
  "default": 20,
  "minimum": 1,
  "maximum": 100
}

// Generated schema (not required)
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "number",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    }
  }
}
```

### Parameter Preprocessing

Before sending requests to APIs, parameters undergo preprocessing:

1. **Default Application**: Apply default values for missing parameters
2. **Type Coercion**: Convert strings to numbers where appropriate
3. **Validation**: Validate against the generated schema
4. **Formatting**: Format dates, URLs, etc., as needed

## Authentication Integration

### Authentication Parameter Injection

The system automatically adds authentication parameters based on the protocol's authentication configuration.

#### API Key Authentication

**Protocol Configuration:**

```json
{
  "authentication": {
    "type": "api_key",
    "location": "header",
    "name": "x-api-key"
  }
}
```

**Generated Parameter:**

```json
{
  "apiKey": {
    "type": "string",
    "description": "API key for authentication",
    "minLength": 1
  }
}
```

**Request Headers:**

```javascript
headers['x-api-key'] = args.apiKey;
```

#### Bearer Token Authentication

**Protocol Configuration:**

```json
{
  "authentication": {
    "type": "bearer_token",
    "location": "header"
  }
}
```

**Generated Parameter:**

```json
{
  "bearerToken": {
    "type": "string",
    "description": "Bearer token for authentication",
    "minLength": 1
  }
}
```

**Request Headers:**

```javascript
headers['Authorization'] = `Bearer ${args.bearerToken}`;
```

#### Basic Authentication

**Generated Parameters:**

```json
{
  "username": {
    "type": "string",
    "description": "Username for basic authentication",
    "minLength": 1
  },
  "password": {
    "type": "string",
    "description": "Password for basic authentication",
    "minLength": 1
  }
}
```

**Request Headers:**

```javascript
const credentials = Buffer.from(`${args.username}:${args.password}`).toString('base64');
headers['Authorization'] = `Basic ${credentials}`;
```

### Environment Variable Integration

Authentication parameters can be automatically populated from environment variables:

```typescript
// Auto-populate from environment
const envKeyName = `${protocolName.toUpperCase()}_API_KEY`.replace(/-/g, '_');
const apiKey = process.env[envKeyName] || args.apiKey;
```

**Examples:**

- `weather-api` → `WEATHER_API_API_KEY`
- `gluex-defi` → `GLUEX_DEFI_API_KEY`

## Error Handling

### Error Categories

1. **Validation Errors**: Parameter validation failures
2. **Authentication Errors**: Missing or invalid credentials
3. **Network Errors**: Connection timeouts, DNS failures
4. **API Errors**: HTTP error responses (4xx, 5xx)
5. **Rate Limit Errors**: Too many requests
6. **Parsing Errors**: Invalid response format

### Error Response Format

All generated tools return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Parameter validation failed",
    "details": {
      "field": "query",
      "issue": "Required field missing"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "protocol": "weather-api",
    "endpoint": "getCurrentWeather"
  }
}
```

### Error Handling Implementation

```typescript
async function executeEndpoint(protocol: Protocol, endpoint: Endpoint, args: any) {
  try {
    // 1. Parameter validation
    const validationResult = validateParameters(endpoint.parameters, args);
    if (!validationResult.valid) {
      throw new ValidationError('Parameter validation failed', validationResult.errors);
    }

    // 2. Authentication setup
    const authHeaders = buildAuthHeaders(protocol.authentication, args);

    // 3. Rate limiting check
    await rateLimiter.checkLimit(protocol.name);

    // 4. API request
    const response = await makeApiRequest(endpoint, args, authHeaders);

    // 5. Response processing
    return processResponse(response);
  } catch (error) {
    // 6. Error handling
    return handleError(error, protocol, endpoint);
  }
}
```

### Retry Logic

Generated tools include automatic retry logic for transient errors:

```typescript
const retryConfig = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 1000,
  retryableErrors: ['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND'],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};
```

## Schema Generation

### JSON Schema Generation Process

The schema generator transforms protocol parameters into valid JSON Schema:

```typescript
class SchemaGenerator {
  generateSchema(protocol: Protocol): ToolSchema[] {
    return protocol.endpoints.map((endpoint) => ({
      name: this.generateToolName(protocol.name, endpoint.name),
      description: this.generateDescription(protocol, endpoint),
      parameters: this.generateParameterSchema(endpoint.parameters, protocol.authentication),
    }));
  }

  private generateParameterSchema(parameters: Parameter[], auth?: Authentication): JSONSchema {
    const schema: JSONSchema = {
      type: 'object',
      properties: {},
      required: [],
    };

    // Add endpoint parameters
    parameters.forEach((param) => {
      schema.properties[param.name] = this.convertParameter(param);
      if (param.required) {
        schema.required.push(param.name);
      }
    });

    // Add authentication parameters
    if (auth) {
      const authParams = this.generateAuthParameters(auth);
      Object.assign(schema.properties, authParams.properties);
      schema.required.push(...authParams.required);
    }

    return schema;
  }
}
```

### Parameter Conversion Examples

#### String Parameter Conversion

**Input:**

```json
{
  "name": "query",
  "type": "string",
  "description": "Search query",
  "required": true,
  "minLength": 1,
  "maxLength": 100,
  "pattern": "^[a-zA-Z0-9 ]+$"
}
```

**Output:**

```json
{
  "query": {
    "type": "string",
    "description": "Search query",
    "minLength": 1,
    "maxLength": 100,
    "pattern": "^[a-zA-Z0-9 ]+$"
  }
}
```

#### Enum Parameter Conversion

**Input:**

```json
{
  "name": "status",
  "type": "string",
  "description": "User status",
  "enum": ["active", "inactive", "pending"],
  "default": "active"
}
```

**Output:**

```json
{
  "status": {
    "type": "string",
    "description": "User status",
    "enum": ["active", "inactive", "pending"],
    "default": "active"
  }
}
```

### Schema Optimization

The generator applies several optimizations:

1. **Minimal Schema**: Only include necessary validation rules
2. **Common Patterns**: Reuse common parameter patterns
3. **Schema Caching**: Cache generated schemas for performance
4. **Validation Reuse**: Reuse validation logic across tools

## Runtime Execution

### Tool Handler Implementation

Each generated tool gets a handler function that executes the API call:

```typescript
interface ToolHandler {
  (args: Record<string, any>): Promise<any>;
}

function createToolHandler(protocol: Protocol, endpoint: Endpoint): ToolHandler {
  return async (args: Record<string, any>) => {
    // 1. Input validation
    const validation = validateInput(endpoint, args);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    // 2. Authentication
    const authData = extractAuthData(protocol.authentication, args);

    // 3. Rate limiting
    await rateLimiter.checkLimit(`${protocol.name}:${endpoint.name}`);

    // 4. Build request
    const request = buildRequest(endpoint, args, authData);

    // 5. Execute request
    const response = await executeRequest(request);

    // 6. Process response
    return processResponse(response, endpoint.response);
  };
}
```

### Request Building

The system builds HTTP requests based on the endpoint configuration:

```typescript
function buildRequest(endpoint: Endpoint, args: any, auth: AuthData): RequestConfig {
  const config: RequestConfig = {
    method: endpoint.method,
    url: endpoint.path,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'HyperLiquid-MCP-Server/1.0',
    },
  };

  // Add authentication
  applyAuthentication(config, auth);

  // Add parameters based on method
  if (endpoint.method === 'GET') {
    config.params = extractQueryParams(endpoint.parameters, args);
  } else {
    config.data = extractBodyParams(endpoint.parameters, args);
  }

  return config;
}
```

### Response Processing

Response processing handles different response types and formats:

```typescript
function processResponse(response: AxiosResponse, responseSchema?: ResponseSchema): any {
  // Handle different content types
  const contentType = response.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    return response.data;
  } else if (contentType.includes('text/')) {
    return { content: response.data, type: 'text' };
  } else {
    return {
      content: response.data,
      type: 'binary',
      contentType: contentType,
    };
  }
}
```

## Caching and Performance

### Schema Caching

Generated schemas are cached to improve performance:

```typescript
class SchemaCache {
  private cache = new Map<string, ToolSchema>();

  get(protocolName: string, version: string): ToolSchema | null {
    const key = `${protocolName}@${version}`;
    return this.cache.get(key) || null;
  }

  set(protocolName: string, version: string, schema: ToolSchema): void {
    const key = `${protocolName}@${version}`;
    this.cache.set(key, schema);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### Tool Registry Optimization

The tool registry is optimized for fast lookups:

```typescript
class ToolRegistry {
  private tools = new Map<string, Tool>();
  private categorizedTools = new Map<string, Tool[]>();

  register(category: string, tool: Tool): void {
    // Store by name for fast lookup
    this.tools.set(tool.name, tool);

    // Store by category for filtering
    if (!this.categorizedTools.has(category)) {
      this.categorizedTools.set(category, []);
    }
    this.categorizedTools.get(category)!.push(tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getToolsByCategory(category: string): Tool[] {
    return this.categorizedTools.get(category) || [];
  }
}
```

### Request Deduplication

Identical requests are deduplicated to reduce API calls:

```typescript
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async execute(key: string, operation: () => Promise<any>): Promise<any> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = operation().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}
```

## Debugging Tool Generation

### Debug Logging

Enable debug logging to trace the generation process:

```bash
# Enable debug logging
LOG_LEVEL=debug ENABLE_COMMUNITY_SYSTEM=true hl-eco-mcp
```

**Debug Output:**

```
[DEBUG] Loading protocol: gluex-defi
[DEBUG] Validating protocol: gluex-defi@1.0.0
[DEBUG] Generating schema for endpoint: getLiquidity
[DEBUG] Generated tool: gluexDefi_getLiquidity
[DEBUG] Registering tool with category: community
```

### Validation Debug Information

```bash
# Validate with verbose output
hl-eco-mcp validate-protocol protocols/my-api.json --verbose
```

**Verbose Output:**

```
✅ Protocol validation passed
📋 Protocol: my-api@1.0.0
📊 Statistics:
   - Endpoints: 5
   - Parameters: 12 total
   - Authentication: api_key (header)
   - Rate limit: 100 requests/minute

🛠️ Generated tools:
   - myApi_getData
   - myApi_createUser
   - myApi_updateUser
   - myApi_deleteUser
   - myApi_searchUsers
```

### Runtime Debugging

Debug individual tool execution:

```bash
# Test tool execution with debug
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "gluexDefi_getLiquidity",
    "arguments": {}
  }
}' | LOG_LEVEL=debug hl-eco-mcp
```

### Common Issues and Solutions

#### Issue: Tool Not Generated

**Symptoms:** Tool missing from tools/list response
**Debug Steps:**

1. Check protocol validation errors
2. Verify endpoint name uniqueness
3. Check for schema generation errors

**Solution:**

```bash
# Check validation
hl-eco-mcp validate-protocol protocols/my-protocol.json

# Check server logs
LOG_LEVEL=debug hl-eco-mcp 2>&1 | grep "my-protocol"
```

#### Issue: Parameter Validation Failing

**Symptoms:** Tools/call returns validation errors
**Debug Steps:**

1. Check generated schema
2. Verify parameter types match
3. Check required vs optional parameters

**Solution:**

```bash
# Inspect generated schema
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | hl-eco-mcp | jq '.result.tools[] | select(.name == "myTool")'
```

#### Issue: Authentication Not Working

**Symptoms:** API returns 401/403 errors
**Debug Steps:**

1. Verify authentication configuration
2. Check environment variables
3. Test authentication parameters

**Solution:**

```bash
# Check environment variables
env | grep MY_API

# Test with explicit auth
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "myApi_getData",
    "arguments": {
      "apiKey": "test-key-123"
    }
  }
}' | hl-eco-mcp
```

This comprehensive tool generation process ensures that community protocols are transformed into reliable, well-documented MCP tools that AI agents can easily discover and use.
