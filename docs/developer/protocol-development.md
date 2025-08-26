# Protocol Development Guide

Welcome to the HyperLiquid MCP Server community protocol system! This guide will take you from having an API idea to a fully functional set of MCP tools that can be used by AI agents.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Protocol Development Workflow](#protocol-development-workflow)
4. [Protocol Structure Deep Dive](#protocol-structure-deep-dive)
5. [Best Practices](#best-practices)
6. [Advanced Features](#advanced-features)
7. [Testing Your Protocol](#testing-your-protocol)
8. [Deployment](#deployment)
9. [Examples](#examples)

## Overview

The community protocol system allows you to extend the HyperLiquid MCP Server with new APIs and services by simply defining them in JSON. Each protocol definition automatically generates MCP tools that AI agents can discover and use.

### Architecture

The community protocol system follows an event-driven architecture:

```
protocols/ directory
    ↓
CommunityManager (loads & validates)
    ↓
ToolGenerator (creates MCP tools)
    ↓
Event: protocol:loaded
    ↓
MCPServer.onCommunityProtocolLoaded()
    ↓
ToolRegistry (registers tools)
    ↓
Available in Claude Code!
```

**Key Components**:

- **CommunityManager**: Manages protocol lifecycle
- **ToolGenerator**: Converts endpoints to MCP tools
- **ProtocolValidator**: Ensures protocol correctness
- **DynamicLoader**: Loads protocols from files or URLs
- **MCPServer**: Integrates tools into the MCP protocol

### What Gets Generated

From your protocol definition, the system automatically creates:

- **MCP Tools**: Each endpoint becomes a callable tool with naming pattern `protocolName_endpointName`
- **Input Schemas**: Parameter validation and documentation
- **Authentication Handling**: Automatic API key/token management
- **Error Handling**: Consistent error responses
- **Rate Limiting**: Respect API limits
- **Documentation**: Auto-generated tool descriptions

## Getting Started

### Prerequisites

- Basic understanding of REST APIs
- Familiarity with JSON
- Access to the API you want to integrate

### Quick Start

1. **Choose Your API**: Identify the REST API you want to integrate
2. **Create Protocol File**: Define your protocol in JSON format
3. **Validate**: Use our validation tools
4. **Test**: Try it locally
5. **Contribute**: Submit for community use

## Protocol Development Workflow

### Step 1: API Analysis

Before creating your protocol, analyze your target API:

```bash
# Example: Analyzing an API
curl -X GET "https://api.example.com/v1/docs" \
  -H "Accept: application/json"

# Check available endpoints
curl -X GET "https://api.example.com/v1/endpoints"

# Test authentication
curl -X GET "https://api.example.com/v1/test" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Document:

- Available endpoints
- Authentication method
- Required/optional parameters
- Response formats
- Rate limits
- Error responses

### Step 2: Create Protocol Definition

Create a new `.json` file in the `protocols/` directory:

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "description": "My awesome API integration for AI agents",
  "author": "Your Name",
  "license": "MIT",
  "repository": "https://github.com/yourusername/my-api-protocol",
  "authentication": {
    "type": "api_key",
    "location": "header",
    "name": "x-api-key"
  },
  "rateLimit": {
    "requests": 100,
    "window": "1m"
  },
  "endpoints": [
    {
      "name": "getData",
      "method": "GET",
      "path": "https://api.example.com/v1/data",
      "description": "Retrieve data from the API",
      "parameters": [
        {
          "name": "query",
          "type": "string",
          "description": "Search query",
          "required": true,
          "minLength": 1,
          "maxLength": 100
        }
      ],
      "response": {
        "type": "object",
        "description": "API response containing data"
      }
    }
  ],
  "metadata": {
    "category": "data",
    "tags": ["api", "data", "search"],
    "documentation": "https://api.example.com/docs"
  }
}
```

### Step 3: Validate Your Protocol

Use the built-in validation tools:

```bash
# Basic validation
hl-eco-mcp validate-protocol protocols/my-api.json

# Strict validation (recommended for production)
COMMUNITY_STRICT_MODE=true hl-eco-mcp validate-protocol protocols/my-api.json

# Validate against allowed domains (if configured)
COMMUNITY_ALLOWED_DOMAINS=api.example.com hl-eco-mcp validate-protocol protocols/my-api.json
```

### Step 4: Test Locally

Test your protocol in development mode:

```bash
# Enable community system and test
ENABLE_COMMUNITY_SYSTEM=true \
HYPERLIQUID_NETWORK=testnet \
LOG_LEVEL=debug \
hl-eco-mcp
```

### Step 5: Integration Testing

Test with a real MCP client:

```bash
# List generated tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | hl-eco-mcp

# Test a specific tool
echo '{
  "jsonrpc":"2.0",
  "id":1,
  "method":"tools/call",
  "params":{
    "name":"myApi_getData",
    "arguments":{"query":"test"}
  }
}' | hl-eco-mcp
```

## Protocol Structure Deep Dive

### Required Fields

```json
{
  "name": "string", // Unique identifier (kebab-case)
  "version": "string", // Semantic version (e.g., "1.0.0")
  "description": "string", // Clear description of what the protocol does
  "author": "string", // Your name or organization
  "license": "string" // License (e.g., "MIT", "Apache-2.0")
}
```

### Optional Top-Level Fields

```json
{
  "repository": "string", // Git repository URL
  "homepage": "string", // Documentation or homepage URL
  "authentication": {}, // Authentication configuration
  "rateLimit": {}, // Rate limiting configuration
  "endpoints": [], // Array of API endpoints
  "metadata": {} // Additional metadata
}
```

### Authentication Configuration

The system supports multiple authentication methods:

#### API Key Authentication

```json
{
  "authentication": {
    "type": "api_key",
    "location": "header", // "header", "query", or "cookie"
    "name": "x-api-key" // Header/query parameter name
  }
}
```

#### Bearer Token Authentication

```json
{
  "authentication": {
    "type": "bearer_token",
    "location": "header" // Always "header" for bearer tokens
  }
}
```

#### Basic Authentication

```json
{
  "authentication": {
    "type": "basic",
    "location": "header" // Always "header" for basic auth
  }
}
```

#### OAuth2 Authentication

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

### Rate Limiting Configuration

```json
{
  "rateLimit": {
    "requests": 100, // Number of requests
    "window": "1m" // Time window: "1s", "1m", "1h", "1d"
  }
}
```

### Endpoint Definition

```json
{
  "name": "endpointName", // camelCase name for the operation
  "method": "GET", // HTTP method: GET, POST, PUT, DELETE, PATCH
  "path": "https://api.example.com/v1/data", // Full URL or path
  "description": "Description of what this endpoint does",
  "authentication": true, // Override global auth (optional)
  "parameters": [], // Array of parameters
  "response": {}, // Response schema
  "rateLimit": {} // Override global rate limit (optional)
}
```

### Parameter Definition

```json
{
  "name": "parameterName",
  "type": "string", // "string", "number", "boolean", "object", "array"
  "description": "Parameter description",
  "required": true, // Whether parameter is required
  "default": "defaultValue", // Default value (optional)
  "enum": ["option1", "option2"], // Allowed values (optional)
  "pattern": "^[a-zA-Z0-9]+$", // Regex pattern (string only)
  "minLength": 1, // Minimum length (string only)
  "maxLength": 100, // Maximum length (string only)
  "minimum": 0, // Minimum value (number only)
  "maximum": 1000, // Maximum value (number only)
  "items": {}, // Item schema (array only)
  "properties": {} // Property schemas (object only)
}
```

### Response Schema

```json
{
  "response": {
    "type": "object",
    "description": "Response description",
    "properties": {
      "data": {
        "type": "array",
        "description": "Array of results"
      },
      "total": {
        "type": "number",
        "description": "Total number of results"
      }
    }
  }
}
```

## Best Practices

### Naming Conventions

- **Protocol name**: Use kebab-case (e.g., `my-awesome-api`)
- **Endpoint names**: Use camelCase (e.g., `getData`, `createUser`)
- **Parameter names**: Use camelCase (e.g., `userId`, `maxResults`)

### Tool Naming

Generated tools follow the pattern: `{protocolName}_{endpointName}`

Examples:

- Protocol: `weather-api`, Endpoint: `getCurrentWeather` → Tool: `weatherApi_getCurrentWeather`
- Protocol: `gluex-defi`, Endpoint: `getOptimalRoute` → Tool: `gluexDefi_getOptimalRoute`

### Description Guidelines

- **Protocol description**: 1-2 sentences explaining the API's purpose
- **Endpoint description**: Clear action description (e.g., "Retrieve user profile by ID")
- **Parameter description**: Explain what the parameter controls

### Error Handling

Design your endpoints to handle common error scenarios:

```json
{
  "parameters": [
    {
      "name": "userId",
      "type": "string",
      "description": "User ID to retrieve",
      "required": true,
      "pattern": "^[0-9]+$",
      "minLength": 1
    }
  ]
}
```

### Security Considerations

1. **Never hardcode credentials** in protocol definitions
2. **Use environment variables** for sensitive data
3. **Validate all parameters** to prevent injection attacks
4. **Respect rate limits** to avoid API abuse
5. **Use HTTPS URLs** for all endpoints

## Advanced Features

### GraphQL Support

The system supports GraphQL endpoints with multiple operations on the same URL:

```json
{
  "endpoints": [
    {
      "name": "searchUsers",
      "method": "POST",
      "path": "https://api.example.com/graphql",
      "description": "Search for users",
      "parameters": [
        {
          "name": "query",
          "type": "string",
          "description": "GraphQL query",
          "required": true,
          "default": "query { users(search: $search) { id name email } }"
        },
        {
          "name": "variables",
          "type": "object",
          "description": "Query variables",
          "properties": {
            "search": {
              "type": "string",
              "description": "Search term"
            }
          }
        }
      ]
    },
    {
      "name": "createUser",
      "method": "POST",
      "path": "https://api.example.com/graphql",
      "description": "Create a new user",
      "parameters": [
        {
          "name": "query",
          "type": "string",
          "description": "GraphQL mutation",
          "required": true,
          "default": "mutation { createUser(input: $input) { id name } }"
        }
      ]
    }
  ]
}
```

### Complex Parameter Types

#### Object Parameters

```json
{
  "name": "user",
  "type": "object",
  "description": "User data",
  "required": true,
  "properties": {
    "name": {
      "type": "string",
      "description": "User's full name",
      "required": true
    },
    "email": {
      "type": "string",
      "description": "User's email address",
      "pattern": "^[^@]+@[^@]+\\.[^@]+$"
    }
  }
}
```

#### Array Parameters

```json
{
  "name": "tags",
  "type": "array",
  "description": "List of tags",
  "items": {
    "type": "string",
    "minLength": 1
  },
  "minItems": 1,
  "maxItems": 10
}
```

### Conditional Parameters

Use parameter dependencies and conditions:

```json
{
  "parameters": [
    {
      "name": "format",
      "type": "string",
      "enum": ["json", "xml", "csv"],
      "default": "json"
    },
    {
      "name": "csvDelimiter",
      "type": "string",
      "description": "CSV delimiter (only used when format=csv)",
      "default": ",",
      "dependsOn": {
        "format": "csv"
      }
    }
  ]
}
```

## Testing Your Protocol

### Local Testing Workflow

1. **Syntax Validation**:

```bash
# Check JSON syntax
jq '.' protocols/my-api.json

# Validate against schema
hl-eco-mcp validate-protocol protocols/my-api.json
```

2. **Load Testing**:

```bash
# Start server with your protocol
ENABLE_COMMUNITY_SYSTEM=true hl-eco-mcp
```

3. **Tool Discovery**:

```bash
# List all tools (should include your protocol's tools)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | hl-eco-mcp
```

4. **Tool Execution**:

```bash
# Test each endpoint
echo '{
  "jsonrpc":"2.0",
  "id":1,
  "method":"tools/call",
  "params":{
    "name":"myApi_getData",
    "arguments":{"query":"test"}
  }
}' | hl-eco-mcp
```

### Common Validation Errors

#### Schema Validation Errors

```
Error: Required field missing: description
Solution: Add description to your protocol
```

```
Error: Duplicate endpoint names
Solution: Ensure all endpoint names are unique
```

```
Error: Invalid parameter type
Solution: Use supported types: string, number, boolean, object, array
```

#### Authentication Errors

```
Error: Missing API key
Solution: Set the appropriate environment variable
```

### Testing with Different Authentication Methods

#### API Key Testing

```bash
# Set your API key
export MY_API_KEY="your-api-key-here"

# Test the protocol
MY_API_KEY=$MY_API_KEY hl-eco-mcp
```

#### OAuth2 Testing

```bash
# Set OAuth credentials
export MY_API_CLIENT_ID="your-client-id"
export MY_API_CLIENT_SECRET="your-client-secret"

# Test the protocol
hl-eco-mcp
```

## Deployment

### Contributing to Community

1. **Fork the Repository**:

```bash
git clone https://github.com/khrafts/hyper-mcp.git
cd hyper-mcp
```

2. **Add Your Protocol**:

```bash
cp your-protocol.json protocols/
```

3. **Test Integration**:

```bash
ENABLE_COMMUNITY_SYSTEM=true hl-eco-mcp
```

4. **Submit Pull Request**:

- Follow the contribution guidelines
- Include tests and documentation
- Provide example usage

### Publishing Your Own MCP Server

You can also create your own MCP server using our SDK:

```typescript
import { ProtocolBuilder } from 'hl-eco-mcp/sdk';

const protocol = new ProtocolBuilder()
  .name('my-custom-server')
  .version('1.0.0')
  .description('My custom MCP server')
  .addEndpoint('getData', {
    method: 'GET',
    path: 'https://api.example.com/data',
    description: 'Get data from API',
  })
  .build();

// Use the protocol...
```

## Examples

### Example 1: Simple REST API

```json
{
  "name": "weather-api",
  "version": "1.0.0",
  "description": "Weather information API for AI agents",
  "author": "Weather Corp",
  "license": "MIT",
  "authentication": {
    "type": "api_key",
    "location": "query",
    "name": "apikey"
  },
  "rateLimit": {
    "requests": 60,
    "window": "1m"
  },
  "endpoints": [
    {
      "name": "getCurrentWeather",
      "method": "GET",
      "path": "https://api.weather.com/v1/current",
      "description": "Get current weather for a location",
      "parameters": [
        {
          "name": "location",
          "type": "string",
          "description": "City name or coordinates",
          "required": true,
          "minLength": 1
        },
        {
          "name": "units",
          "type": "string",
          "description": "Temperature units",
          "enum": ["metric", "imperial", "kelvin"],
          "default": "metric"
        }
      ],
      "response": {
        "type": "object",
        "description": "Current weather data"
      }
    }
  ],
  "metadata": {
    "category": "weather",
    "tags": ["weather", "climate", "forecast"]
  }
}
```

### Example 2: Complex API with Multiple Authentication

```json
{
  "name": "crm-system",
  "version": "2.1.0",
  "description": "Customer Relationship Management API",
  "author": "CRM Solutions Inc",
  "license": "Apache-2.0",
  "repository": "https://github.com/crm-solutions/api-protocol",
  "authentication": {
    "type": "bearer_token",
    "location": "header"
  },
  "rateLimit": {
    "requests": 1000,
    "window": "1h"
  },
  "endpoints": [
    {
      "name": "searchCustomers",
      "method": "GET",
      "path": "https://api.crm.com/v2/customers",
      "description": "Search customers with filters",
      "parameters": [
        {
          "name": "query",
          "type": "string",
          "description": "Search query"
        },
        {
          "name": "filters",
          "type": "object",
          "description": "Search filters",
          "properties": {
            "status": {
              "type": "string",
              "enum": ["active", "inactive", "pending"]
            },
            "dateRange": {
              "type": "object",
              "properties": {
                "start": {
                  "type": "string",
                  "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
                },
                "end": {
                  "type": "string",
                  "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
                }
              }
            }
          }
        },
        {
          "name": "limit",
          "type": "number",
          "description": "Maximum results",
          "minimum": 1,
          "maximum": 100,
          "default": 20
        }
      ]
    },
    {
      "name": "createCustomer",
      "method": "POST",
      "path": "https://api.crm.com/v2/customers",
      "description": "Create a new customer",
      "parameters": [
        {
          "name": "customer",
          "type": "object",
          "description": "Customer data",
          "required": true,
          "properties": {
            "name": {
              "type": "string",
              "description": "Customer name",
              "minLength": 1,
              "maxLength": 100
            },
            "email": {
              "type": "string",
              "description": "Email address",
              "pattern": "^[^@]+@[^@]+\\.[^@]+$"
            },
            "phone": {
              "type": "string",
              "description": "Phone number",
              "pattern": "^\\+?[1-9]\\d{1,14}$"
            },
            "tags": {
              "type": "array",
              "description": "Customer tags",
              "items": {
                "type": "string",
                "minLength": 1
              },
              "maxItems": 10
            }
          }
        }
      ]
    }
  ],
  "metadata": {
    "category": "business",
    "tags": ["crm", "customers", "sales"],
    "documentation": "https://docs.crm.com/api",
    "supportEmail": "api-support@crm.com"
  }
}
```

### Example 3: GraphQL API

```json
{
  "name": "social-graph",
  "version": "1.0.0",
  "description": "Social network GraphQL API",
  "author": "SocialCorp",
  "license": "MIT",
  "authentication": {
    "type": "bearer_token",
    "location": "header"
  },
  "endpoints": [
    {
      "name": "searchUsers",
      "method": "POST",
      "path": "https://api.social.com/graphql",
      "description": "Search for users in the social network",
      "parameters": [
        {
          "name": "query",
          "type": "string",
          "description": "GraphQL query",
          "required": true,
          "default": "query SearchUsers($search: String!, $limit: Int) { users(search: $search, limit: $limit) { id username displayName avatar bio followersCount followingCount } }"
        },
        {
          "name": "variables",
          "type": "object",
          "description": "GraphQL variables",
          "required": true,
          "properties": {
            "search": {
              "type": "string",
              "description": "Search term",
              "minLength": 1
            },
            "limit": {
              "type": "number",
              "description": "Maximum results",
              "minimum": 1,
              "maximum": 50,
              "default": 10
            }
          }
        }
      ]
    },
    {
      "name": "getUserPosts",
      "method": "POST",
      "path": "https://api.social.com/graphql",
      "description": "Get posts from a specific user",
      "parameters": [
        {
          "name": "query",
          "type": "string",
          "description": "GraphQL query",
          "required": true,
          "default": "query GetUserPosts($userId: ID!, $limit: Int) { user(id: $userId) { posts(limit: $limit) { id content createdAt likesCount commentsCount } } }"
        },
        {
          "name": "variables",
          "type": "object",
          "description": "GraphQL variables",
          "required": true,
          "properties": {
            "userId": {
              "type": "string",
              "description": "User ID",
              "minLength": 1
            },
            "limit": {
              "type": "number",
              "description": "Number of posts to retrieve",
              "minimum": 1,
              "maximum": 100,
              "default": 20
            }
          }
        }
      ]
    }
  ],
  "metadata": {
    "category": "social",
    "tags": ["social", "graphql", "users", "posts"]
  }
}
```

## Next Steps

1. **Start Simple**: Begin with a basic REST API with 1-2 endpoints
2. **Test Thoroughly**: Validate your protocol and test all endpoints
3. **Iterate**: Add more endpoints and features incrementally
4. **Share**: Contribute your protocol to the community
5. **Learn**: Study existing protocols in the `/protocols/` directory

## Need Help?

- **Documentation**: Check the [Protocol Schema Reference](protocol-schema.md)
- **Examples**: Look at existing protocols in `/protocols/`
- **Community**: Join our discussions on GitHub
- **Issues**: Report bugs or request features on GitHub Issues

Happy protocol building! 🚀
