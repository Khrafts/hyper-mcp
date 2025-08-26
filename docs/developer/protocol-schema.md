# Protocol JSON Schema Reference

This document provides a complete reference for the community protocol JSON schema used by the HyperLiquid MCP Server.

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Root Schema](#root-schema)
3. [Authentication Schema](#authentication-schema)
4. [Rate Limiting Schema](#rate-limiting-schema)
5. [Endpoint Schema](#endpoint-schema)
6. [Parameter Schema](#parameter-schema)
7. [Response Schema](#response-schema)
8. [Metadata Schema](#metadata-schema)
9. [Validation Rules](#validation-rules)
10. [JSON Schema Definition](#json-schema-definition)

## Schema Overview

A protocol definition is a JSON object that describes how to interact with an external API. The system uses this definition to automatically generate MCP tools that AI agents can discover and use.

### Key Principles

- **Declarative**: Describe what the API does, not how to implement it
- **Self-contained**: All information needed to use the API is in the protocol
- **Validated**: Strict validation ensures reliability and security
- **Extensible**: Support for complex APIs with advanced features

## Root Schema

The top-level protocol object contains metadata about the API and its endpoints.

### Required Fields

| Field         | Type   | Description                             | Example                            |
| ------------- | ------ | --------------------------------------- | ---------------------------------- |
| `name`        | string | Unique protocol identifier (kebab-case) | `"weather-api"`                    |
| `version`     | string | Semantic version                        | `"1.0.0"`                          |
| `description` | string | Clear description of the protocol       | `"Weather data API for AI agents"` |
| `author`      | string | Author name or organization             | `"Weather Corp"`                   |
| `license`     | string | License identifier                      | `"MIT"`                            |

#### Field Details

**`name`**

- Must be unique across all protocols
- Use kebab-case (lowercase with hyphens)
- 3-50 characters
- Pattern: `^[a-z][a-z0-9-]*[a-z0-9]$`

**`version`**

- Must follow semantic versioning (semver)
- Pattern: `^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9-.]+)?$`
- Examples: `"1.0.0"`, `"2.1.3-beta.1"`

**`description`**

- 10-500 characters
- Should explain what the API does and its purpose
- Will be included in generated tool documentation

**`author`**

- 1-100 characters
- Can be individual name or organization
- Used for attribution in generated tools

**`license`**

- Valid SPDX license identifier
- Common values: `"MIT"`, `"Apache-2.0"`, `"GPL-3.0"`, `"BSD-2-Clause"`

### Optional Fields

| Field            | Type   | Description                  | Default |
| ---------------- | ------ | ---------------------------- | ------- |
| `repository`     | string | Git repository URL           | `null`  |
| `homepage`       | string | Documentation homepage URL   | `null`  |
| `authentication` | object | Authentication configuration | `null`  |
| `rateLimit`      | object | Rate limiting configuration  | `null`  |
| `endpoints`      | array  | Array of API endpoints       | `[]`    |
| `metadata`       | object | Additional metadata          | `{}`    |

#### Field Details

**`repository`**

- Must be a valid Git repository URL
- Examples: `"https://github.com/user/repo"`, `"https://gitlab.com/user/repo.git"`

**`homepage`**

- Must be a valid HTTPS URL
- Should point to documentation or project homepage

### Example Root Schema

```json
{
  "name": "weather-api",
  "version": "1.2.3",
  "description": "Comprehensive weather information API providing current conditions, forecasts, and historical data",
  "author": "Weather Systems Inc",
  "license": "MIT",
  "repository": "https://github.com/weather-systems/api-protocol",
  "homepage": "https://docs.weather-api.com",
  "authentication": {
    "type": "api_key",
    "location": "header",
    "name": "x-api-key"
  },
  "rateLimit": {
    "requests": 1000,
    "window": "1h"
  },
  "endpoints": [...],
  "metadata": {
    "category": "weather",
    "tags": ["weather", "forecast", "climate"]
  }
}
```

## Authentication Schema

Authentication configuration defines how the protocol authenticates with the target API.

### Supported Authentication Types

1. **API Key** (`api_key`)
2. **Bearer Token** (`bearer_token`)
3. **Basic Authentication** (`basic`)
4. **OAuth2** (`oauth2`)

### API Key Authentication

```json
{
  "authentication": {
    "type": "api_key",
    "location": "header", // "header", "query", or "cookie"
    "name": "x-api-key" // Parameter/header name
  }
}
```

#### Fields

| Field      | Type   | Required | Description           | Example       |
| ---------- | ------ | -------- | --------------------- | ------------- |
| `type`     | string | ✅       | Must be `"api_key"`   | `"api_key"`   |
| `location` | string | ✅       | Where to send the key | `"header"`    |
| `name`     | string | ✅       | Parameter/header name | `"x-api-key"` |

#### Location Values

- `"header"`: Send as HTTP header
- `"query"`: Send as query parameter
- `"cookie"`: Send as cookie

#### Examples

```json
// Header-based API key
{
  "type": "api_key",
  "location": "header",
  "name": "Authorization"
}

// Query parameter API key
{
  "type": "api_key",
  "location": "query",
  "name": "api_key"
}

// Cookie-based API key
{
  "type": "api_key",
  "location": "cookie",
  "name": "auth_token"
}
```

### Bearer Token Authentication

```json
{
  "authentication": {
    "type": "bearer_token",
    "location": "header" // Always "header" for bearer tokens
  }
}
```

#### Fields

| Field      | Type   | Required | Description              | Example          |
| ---------- | ------ | -------- | ------------------------ | ---------------- |
| `type`     | string | ✅       | Must be `"bearer_token"` | `"bearer_token"` |
| `location` | string | ✅       | Must be `"header"`       | `"header"`       |

### Basic Authentication

```json
{
  "authentication": {
    "type": "basic",
    "location": "header" // Always "header" for basic auth
  }
}
```

#### Fields

| Field      | Type   | Required | Description        | Example    |
| ---------- | ------ | -------- | ------------------ | ---------- |
| `type`     | string | ✅       | Must be `"basic"`  | `"basic"`  |
| `location` | string | ✅       | Must be `"header"` | `"header"` |

### OAuth2 Authentication

```json
{
  "authentication": {
    "type": "oauth2",
    "location": "header",
    "tokenUrl": "https://api.example.com/oauth/token",
    "scopes": ["read", "write"]
  }
}
```

#### Fields

| Field      | Type   | Required | Description        | Example                                 |
| ---------- | ------ | -------- | ------------------ | --------------------------------------- |
| `type`     | string | ✅       | Must be `"oauth2"` | `"oauth2"`                              |
| `location` | string | ✅       | Must be `"header"` | `"header"`                              |
| `tokenUrl` | string | ✅       | Token endpoint URL | `"https://api.example.com/oauth/token"` |
| `scopes`   | array  | ❌       | Required scopes    | `["read", "write"]`                     |

## Rate Limiting Schema

Rate limiting configuration helps respect API limits and prevent abuse.

### Basic Rate Limiting

```json
{
  "rateLimit": {
    "requests": 100, // Number of requests
    "window": "1m" // Time window
  }
}
```

#### Fields

| Field      | Type   | Required | Description                | Example |
| ---------- | ------ | -------- | -------------------------- | ------- |
| `requests` | number | ✅       | Number of requests allowed | `100`   |
| `window`   | string | ✅       | Time window                | `"1m"`  |

#### Window Values

| Value  | Description | Duration     |
| ------ | ----------- | ------------ |
| `"1s"` | 1 second    | 1000ms       |
| `"1m"` | 1 minute    | 60,000ms     |
| `"1h"` | 1 hour      | 3,600,000ms  |
| `"1d"` | 1 day       | 86,400,000ms |

#### Examples

```json
// High-frequency API
{
  "requests": 1000,
  "window": "1m"
}

// Conservative API
{
  "requests": 100,
  "window": "1h"
}

// Daily quota
{
  "requests": 10000,
  "window": "1d"
}
```

## Endpoint Schema

Endpoints define the API operations that will become MCP tools.

### Required Fields

| Field         | Type   | Description                      | Example                             |
| ------------- | ------ | -------------------------------- | ----------------------------------- |
| `name`        | string | Unique endpoint name (camelCase) | `"getCurrentWeather"`               |
| `method`      | string | HTTP method                      | `"GET"`                             |
| `path`        | string | Full URL or path                 | `"https://api.example.com/weather"` |
| `description` | string | Endpoint description             | `"Get current weather conditions"`  |

### Optional Fields

| Field            | Type    | Description                | Default |
| ---------------- | ------- | -------------------------- | ------- |
| `parameters`     | array   | Request parameters         | `[]`    |
| `response`       | object  | Response schema            | `null`  |
| `authentication` | boolean | Override global auth       | `null`  |
| `rateLimit`      | object  | Override global rate limit | `null`  |

#### Field Details

**`name`**

- Must be unique within the protocol
- Use camelCase
- 1-50 characters
- Pattern: `^[a-z][a-zA-Z0-9]*$`
- Will be used to generate tool name: `{protocolName}_{endpointName}`

**`method`**

- HTTP method for the endpoint
- Allowed values: `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, `"PATCH"`

**`path`**

- Complete URL to the endpoint
- Must be a valid HTTPS URL
- Can include path parameters: `/users/{userId}`

**`description`**

- 5-200 characters
- Should describe what the endpoint does
- Used in generated tool documentation

### Example Endpoint

```json
{
  "name": "searchUsers",
  "method": "GET",
  "path": "https://api.example.com/v1/users",
  "description": "Search for users matching the given criteria",
  "authentication": true,
  "parameters": [
    {
      "name": "query",
      "type": "string",
      "description": "Search query",
      "required": true,
      "minLength": 1,
      "maxLength": 100
    },
    {
      "name": "limit",
      "type": "number",
      "description": "Maximum results to return",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    }
  ],
  "response": {
    "type": "object",
    "description": "Search results",
    "properties": {
      "users": {
        "type": "array",
        "description": "Array of matching users"
      },
      "total": {
        "type": "number",
        "description": "Total number of results"
      }
    }
  }
}
```

## Parameter Schema

Parameters define the inputs for API endpoints.

### Parameter Types

The system supports the following parameter types:

1. **String** (`string`)
2. **Number** (`number`)
3. **Boolean** (`boolean`)
4. **Object** (`object`)
5. **Array** (`array`)

### Base Parameter Fields

| Field         | Type    | Required | Description                   | Example             |
| ------------- | ------- | -------- | ----------------------------- | ------------------- |
| `name`        | string  | ✅       | Parameter name (camelCase)    | `"userId"`          |
| `type`        | string  | ✅       | Parameter type                | `"string"`          |
| `description` | string  | ✅       | Parameter description         | `"User identifier"` |
| `required`    | boolean | ❌       | Whether parameter is required | `true`              |
| `default`     | any     | ❌       | Default value                 | `null`              |

### String Parameters

```json
{
  "name": "username",
  "type": "string",
  "description": "User's username",
  "required": true,
  "minLength": 3,
  "maxLength": 50,
  "pattern": "^[a-zA-Z0-9_-]+$",
  "enum": ["admin", "user", "guest"],
  "default": "user"
}
```

#### String-Specific Fields

| Field       | Type   | Description                | Example                    |
| ----------- | ------ | -------------------------- | -------------------------- |
| `minLength` | number | Minimum string length      | `1`                        |
| `maxLength` | number | Maximum string length      | `100`                      |
| `pattern`   | string | Regular expression pattern | `"^[a-zA-Z0-9]+$"`         |
| `enum`      | array  | Allowed values             | `["red", "green", "blue"]` |

#### Examples

```json
// Email validation
{
  "name": "email",
  "type": "string",
  "description": "Email address",
  "required": true,
  "pattern": "^[^@]+@[^@]+\\.[^@]+$",
  "maxLength": 254
}

// Enumerated values
{
  "name": "status",
  "type": "string",
  "description": "User status",
  "enum": ["active", "inactive", "pending"],
  "default": "active"
}

// URL validation
{
  "name": "website",
  "type": "string",
  "description": "Website URL",
  "pattern": "^https://.*",
  "maxLength": 2048
}
```

### Number Parameters

```json
{
  "name": "price",
  "type": "number",
  "description": "Product price in USD",
  "required": true,
  "minimum": 0,
  "maximum": 10000,
  "multipleOf": 0.01,
  "default": 0
}
```

#### Number-Specific Fields

| Field              | Type   | Description                    | Example |
| ------------------ | ------ | ------------------------------ | ------- |
| `minimum`          | number | Minimum value (inclusive)      | `0`     |
| `maximum`          | number | Maximum value (inclusive)      | `100`   |
| `exclusiveMinimum` | number | Minimum value (exclusive)      | `0`     |
| `exclusiveMaximum` | number | Maximum value (exclusive)      | `100`   |
| `multipleOf`       | number | Value must be multiple of this | `0.01`  |

#### Examples

```json
// Age validation
{
  "name": "age",
  "type": "number",
  "description": "User's age in years",
  "minimum": 0,
  "maximum": 150
}

// Price with precision
{
  "name": "amount",
  "type": "number",
  "description": "Transaction amount",
  "minimum": 0.01,
  "multipleOf": 0.01,
  "maximum": 1000000
}

// Percentage
{
  "name": "discountPercent",
  "type": "number",
  "description": "Discount percentage",
  "minimum": 0,
  "maximum": 100,
  "default": 0
}
```

### Boolean Parameters

```json
{
  "name": "includeInactive",
  "type": "boolean",
  "description": "Whether to include inactive users",
  "default": false
}
```

#### Examples

```json
// Feature flag
{
  "name": "enableFeature",
  "type": "boolean",
  "description": "Enable experimental feature",
  "default": false
}

// Filter option
{
  "name": "onlyVerified",
  "type": "boolean",
  "description": "Show only verified accounts",
  "default": true
}
```

### Object Parameters

```json
{
  "name": "user",
  "type": "object",
  "description": "User data object",
  "required": true,
  "properties": {
    "name": {
      "type": "string",
      "description": "Full name",
      "required": true,
      "minLength": 1,
      "maxLength": 100
    },
    "email": {
      "type": "string",
      "description": "Email address",
      "required": true,
      "pattern": "^[^@]+@[^@]+\\.[^@]+$"
    },
    "age": {
      "type": "number",
      "description": "Age in years",
      "minimum": 0,
      "maximum": 150
    }
  },
  "additionalProperties": false
}
```

#### Object-Specific Fields

| Field                  | Type    | Description                  | Example           |
| ---------------------- | ------- | ---------------------------- | ----------------- |
| `properties`           | object  | Object property definitions  | `{"name": {...}}` |
| `additionalProperties` | boolean | Allow additional properties  | `false`           |
| `minProperties`        | number  | Minimum number of properties | `1`               |
| `maxProperties`        | number  | Maximum number of properties | `10`              |

#### Examples

```json
// Address object
{
  "name": "address",
  "type": "object",
  "description": "Mailing address",
  "properties": {
    "street": {
      "type": "string",
      "description": "Street address",
      "required": true
    },
    "city": {
      "type": "string",
      "description": "City name",
      "required": true
    },
    "zipCode": {
      "type": "string",
      "description": "ZIP/Postal code",
      "pattern": "^[0-9]{5}(-[0-9]{4})?$"
    },
    "country": {
      "type": "string",
      "description": "Country code",
      "pattern": "^[A-Z]{2}$",
      "default": "US"
    }
  },
  "additionalProperties": false
}

// Filter criteria
{
  "name": "filters",
  "type": "object",
  "description": "Search filters",
  "properties": {
    "dateRange": {
      "type": "object",
      "description": "Date range filter",
      "properties": {
        "start": {
          "type": "string",
          "description": "Start date (ISO 8601)",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
        },
        "end": {
          "type": "string",
          "description": "End date (ISO 8601)",
          "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
        }
      }
    },
    "categories": {
      "type": "array",
      "description": "Category filters",
      "items": {
        "type": "string",
        "enum": ["electronics", "clothing", "books", "home"]
      }
    }
  }
}
```

### Array Parameters

```json
{
  "name": "tags",
  "type": "array",
  "description": "List of tags",
  "required": true,
  "items": {
    "type": "string",
    "minLength": 1,
    "maxLength": 50
  },
  "minItems": 1,
  "maxItems": 10,
  "uniqueItems": true
}
```

#### Array-Specific Fields

| Field         | Type    | Description            | Example              |
| ------------- | ------- | ---------------------- | -------------------- |
| `items`       | object  | Schema for array items | `{"type": "string"}` |
| `minItems`    | number  | Minimum array length   | `1`                  |
| `maxItems`    | number  | Maximum array length   | `10`                 |
| `uniqueItems` | boolean | Items must be unique   | `true`               |

#### Examples

```json
// String array with constraints
{
  "name": "keywords",
  "type": "array",
  "description": "Search keywords",
  "items": {
    "type": "string",
    "minLength": 1,
    "maxLength": 50
  },
  "minItems": 1,
  "maxItems": 5,
  "uniqueItems": true
}

// Number array
{
  "name": "scores",
  "type": "array",
  "description": "Test scores",
  "items": {
    "type": "number",
    "minimum": 0,
    "maximum": 100
  },
  "minItems": 1,
  "maxItems": 20
}

// Object array
{
  "name": "contacts",
  "type": "array",
  "description": "Contact list",
  "items": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Contact name",
        "required": true
      },
      "phone": {
        "type": "string",
        "description": "Phone number",
        "pattern": "^\\+?[1-9]\\d{1,14}$"
      }
    }
  },
  "maxItems": 50
}
```

## Response Schema

Response schemas describe the expected API response format.

### Basic Response Schema

```json
{
  "response": {
    "type": "object",
    "description": "API response",
    "properties": {
      "data": {
        "type": "array",
        "description": "Response data"
      },
      "success": {
        "type": "boolean",
        "description": "Operation success flag"
      }
    }
  }
}
```

### Response Types

#### Simple Response

```json
{
  "response": {
    "type": "string",
    "description": "Simple text response"
  }
}
```

#### Object Response

```json
{
  "response": {
    "type": "object",
    "description": "Structured response",
    "properties": {
      "id": {
        "type": "string",
        "description": "Resource ID"
      },
      "status": {
        "type": "string",
        "description": "Operation status"
      },
      "data": {
        "type": "object",
        "description": "Response payload"
      }
    }
  }
}
```

#### Array Response

```json
{
  "response": {
    "type": "array",
    "description": "List of items",
    "items": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Item ID"
        },
        "name": {
          "type": "string",
          "description": "Item name"
        }
      }
    }
  }
}
```

## Metadata Schema

Metadata provides additional information about the protocol.

### Required Metadata Fields

None - all metadata fields are optional.

### Optional Metadata Fields

| Field           | Type   | Description           | Example                       |
| --------------- | ------ | --------------------- | ----------------------------- |
| `category`      | string | Protocol category     | `"weather"`                   |
| `tags`          | array  | Descriptive tags      | `["api", "data"]`             |
| `documentation` | string | Documentation URL     | `"https://docs.api.com"`      |
| `supportEmail`  | string | Support contact email | `"support@api.com"`           |
| `features`      | array  | List of features      | `["real-time", "historical"]` |

### Example Metadata

```json
{
  "metadata": {
    "category": "financial",
    "tags": ["trading", "crypto", "defi", "blockchain"],
    "documentation": "https://docs.hyperliquid.xyz",
    "supportEmail": "support@hyperliquid.xyz",
    "features": ["Real-time trading", "Portfolio management", "Risk analysis", "Market data"],
    "regions": ["global"],
    "pricing": "free-tier",
    "sla": "99.9%"
  }
}
```

## Validation Rules

### Global Validation Rules

1. **Protocol names** must be unique across all protocols
2. **Endpoint names** must be unique within a protocol
3. **Parameter names** must be unique within an endpoint
4. **URLs** must be valid HTTPS URLs
5. **Semantic versioning** must be followed for versions

### Security Validation Rules

1. **No hardcoded credentials** in protocol definitions
2. **HTTPS required** for all API endpoints
3. **Rate limiting recommended** for all protocols
4. **Authentication required** for write operations
5. **Input validation** required for all parameters

### Business Logic Validation Rules

1. **GraphQL endpoints** can share the same path/method combination
2. **REST endpoints** must have unique path/method combinations
3. **Required parameters** must be specified for all endpoints
4. **Response schemas** should be provided when possible
5. **Description quality** is enforced (minimum length, clarity)

### Performance Validation Rules

1. **Rate limits** should not exceed reasonable thresholds
2. **Parameter constraints** should prevent abuse
3. **Response schemas** should be reasonably sized
4. **Endpoint count** is limited to prevent bloat

## JSON Schema Definition

Here's the complete JSON Schema for protocol validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://hyperliquid-mcp.com/schemas/protocol.json",
  "title": "HyperLiquid MCP Protocol Schema",
  "description": "Schema for community protocol definitions",
  "type": "object",
  "required": ["name", "version", "description", "author", "license"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*[a-z0-9]$",
      "minLength": 3,
      "maxLength": 50,
      "description": "Protocol identifier (kebab-case)"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9-.]+)?$",
      "description": "Semantic version"
    },
    "description": {
      "type": "string",
      "minLength": 10,
      "maxLength": 500,
      "description": "Protocol description"
    },
    "author": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Author name or organization"
    },
    "license": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50,
      "description": "SPDX license identifier"
    },
    "repository": {
      "type": "string",
      "format": "uri",
      "pattern": "^https://",
      "description": "Git repository URL"
    },
    "homepage": {
      "type": "string",
      "format": "uri",
      "pattern": "^https://",
      "description": "Homepage URL"
    },
    "authentication": {
      "type": "object",
      "oneOf": [
        {
          "properties": {
            "type": { "const": "api_key" },
            "location": { "enum": ["header", "query", "cookie"] },
            "name": { "type": "string", "minLength": 1 }
          },
          "required": ["type", "location", "name"],
          "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "bearer_token" },
            "location": { "const": "header" }
          },
          "required": ["type", "location"],
          "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "basic" },
            "location": { "const": "header" }
          },
          "required": ["type", "location"],
          "additionalProperties": false
        },
        {
          "properties": {
            "type": { "const": "oauth2" },
            "location": { "const": "header" },
            "tokenUrl": { "type": "string", "format": "uri" },
            "scopes": {
              "type": "array",
              "items": { "type": "string" }
            }
          },
          "required": ["type", "location", "tokenUrl"],
          "additionalProperties": false
        }
      ]
    },
    "rateLimit": {
      "type": "object",
      "properties": {
        "requests": {
          "type": "number",
          "minimum": 1,
          "maximum": 10000
        },
        "window": {
          "enum": ["1s", "1m", "1h", "1d"]
        }
      },
      "required": ["requests", "window"],
      "additionalProperties": false
    },
    "endpoints": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "method", "path", "description"],
        "properties": {
          "name": {
            "type": "string",
            "pattern": "^[a-z][a-zA-Z0-9]*$",
            "minLength": 1,
            "maxLength": 50
          },
          "method": {
            "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"]
          },
          "path": {
            "type": "string",
            "format": "uri",
            "pattern": "^https://"
          },
          "description": {
            "type": "string",
            "minLength": 5,
            "maxLength": 200
          },
          "authentication": {
            "type": "boolean"
          },
          "parameters": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/parameter"
            }
          },
          "response": {
            "$ref": "#/definitions/responseSchema"
          },
          "rateLimit": {
            "$ref": "#/properties/rateLimit"
          }
        },
        "additionalProperties": false
      },
      "maxItems": 50
    },
    "metadata": {
      "type": "object",
      "properties": {
        "category": { "type": "string" },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "maxItems": 20
        },
        "documentation": {
          "type": "string",
          "format": "uri",
          "pattern": "^https://"
        },
        "supportEmail": {
          "type": "string",
          "format": "email"
        },
        "features": {
          "type": "array",
          "items": { "type": "string" },
          "maxItems": 10
        }
      },
      "additionalProperties": true
    }
  },
  "definitions": {
    "parameter": {
      "type": "object",
      "required": ["name", "type", "description"],
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-z][a-zA-Z0-9]*$"
        },
        "type": {
          "enum": ["string", "number", "boolean", "object", "array"]
        },
        "description": {
          "type": "string",
          "minLength": 5,
          "maxLength": 200
        },
        "required": { "type": "boolean" },
        "default": true
      },
      "allOf": [
        {
          "if": { "properties": { "type": { "const": "string" } } },
          "then": {
            "properties": {
              "minLength": { "type": "number", "minimum": 0 },
              "maxLength": { "type": "number", "minimum": 1 },
              "pattern": { "type": "string" },
              "enum": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        },
        {
          "if": { "properties": { "type": { "const": "number" } } },
          "then": {
            "properties": {
              "minimum": { "type": "number" },
              "maximum": { "type": "number" },
              "exclusiveMinimum": { "type": "number" },
              "exclusiveMaximum": { "type": "number" },
              "multipleOf": { "type": "number", "minimum": 0 }
            }
          }
        },
        {
          "if": { "properties": { "type": { "const": "array" } } },
          "then": {
            "properties": {
              "items": { "$ref": "#/definitions/parameter" },
              "minItems": { "type": "number", "minimum": 0 },
              "maxItems": { "type": "number", "minimum": 1 },
              "uniqueItems": { "type": "boolean" }
            }
          }
        },
        {
          "if": { "properties": { "type": { "const": "object" } } },
          "then": {
            "properties": {
              "properties": {
                "type": "object",
                "patternProperties": {
                  ".*": { "$ref": "#/definitions/parameter" }
                }
              },
              "additionalProperties": { "type": "boolean" },
              "minProperties": { "type": "number", "minimum": 0 },
              "maxProperties": { "type": "number", "minimum": 1 }
            }
          }
        }
      ]
    },
    "responseSchema": {
      "type": "object",
      "required": ["type", "description"],
      "properties": {
        "type": {
          "enum": ["string", "number", "boolean", "object", "array"]
        },
        "description": {
          "type": "string",
          "minLength": 5,
          "maxLength": 200
        },
        "properties": {
          "type": "object",
          "additionalProperties": true
        },
        "items": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "additionalProperties": false
    }
  }
}
```

This schema can be used to validate protocol definitions programmatically and ensures consistency across all community protocols.

## Usage Examples

### Using the Schema for Validation

```bash
# Validate with ajv-cli
ajv validate -s protocol-schema.json -d my-protocol.json

# Validate with jsonschema (Python)
jsonschema -i my-protocol.json protocol-schema.json

# Validate with our built-in validator
hl-eco-mcp validate-protocol protocols/my-protocol.json
```

### Schema-Driven Development

1. **Start with the schema**: Use it as a template for new protocols
2. **Validate early**: Check your protocol against the schema frequently
3. **Use IDE support**: Many editors provide JSON Schema validation
4. **Auto-generate**: Use the schema to generate protocol templates

This comprehensive schema ensures that all community protocols are well-formed, secure, and consistent, enabling reliable auto-generation of MCP tools.
