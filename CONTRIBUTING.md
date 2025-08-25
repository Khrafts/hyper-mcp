# Contributing to HyperLiquid Ecosystem MCP Server

Thank you for your interest in contributing to the HyperLiquid Ecosystem MCP Server! The server now focuses exclusively on **community-driven protocol contributions** that automatically become AI-accessible tools.

## 🎯 What's New

The HyperLiquid MCP Server has pivoted to be **100% community-focused**:

- **No Code Required**: JSON protocol definitions automatically become MCP tools
- **Ecosystem Growth**: Any DeFi protocol, data provider, or service can contribute
- **AI-Native**: Built specifically for AI agents like Claude to use seamlessly
- **Automatic Generation**: Submit a protocol, get working MCP tools instantly

## 🚀 Contributing Options

1. **Protocol Contributors**: Add your API as a community protocol (most common)
2. **Core Developers**: Improve the community system, validation, or tool generation
3. **Documentation**: Help improve guides, examples, and tutorials

---

This document provides guidelines and information for creating, submitting, and maintaining community protocols.

## Table of Contents

- [Quick Start](#quick-start)
- [Protocol Structure](#protocol-structure)
- [Development Setup](#development-setup)
- [Creating a Protocol](#creating-a-protocol)
- [Validation Requirements](#validation-requirements)
- [Submission Process](#submission-process)
- [Testing Guidelines](#testing-guidelines)
- [Best Practices](#best-practices)
- [Community Guidelines](#community-guidelines)
- [Support](#support)

## Quick Start

1. **Fork the Repository**: Create a fork of this repository on GitHub
2. **Set Up Development Environment**: Follow the [Development Setup](#development-setup) instructions
3. **Create Your Protocol**: Use our SDK or templates to build your protocol
4. **Test Thoroughly**: Ensure your protocol passes all validation checks
5. **Submit Pull Request**: Follow our [Submission Process](#submission-process)

## Protocol Structure

A community protocol is a JSON file that describes how to interact with an external API or service. Here's the basic structure:

```json
{
  "name": "your-protocol-name",
  "version": "1.0.0",
  "description": "A detailed description of what your protocol does",
  "author": "Your Name or Organization",
  "license": "MIT",
  "repository": "https://github.com/your-org/your-protocol-repo",
  "authentication": {
    "type": "api_key",
    "location": "header",
    "name": "X-API-Key"
  },
  "rateLimit": {
    "requests": 1000,
    "window": "1h"
  },
  "endpoints": [
    {
      "name": "getData",
      "method": "GET",
      "path": "/api/v1/data",
      "description": "Retrieve data from the API",
      "parameters": [...],
      "response": {...},
      "authentication": true
    }
  ]
}
```

### Required Fields

- `name`: Unique identifier for your protocol (alphanumeric, hyphens, underscores only)
- `version`: Semantic version (e.g., 1.0.0)
- `description`: Clear description (minimum 10 characters)
- `author`: Your name or organization
- `license`: Open source license (e.g., MIT, Apache-2.0)
- `endpoints`: Array of at least one endpoint definition

### Optional Fields

- `repository`: URL to your protocol's source repository
- `authentication`: Authentication configuration
- `rateLimit`: Rate limiting configuration
- `dependencies`: Dependencies on other protocols or libraries
- `metadata`: Additional custom metadata

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- Git
- A text editor or IDE

### Installation

1. Clone your fork:

```bash
git clone https://github.com/your-username/hyper-mcp.git
cd hyper-mcp
```

2. Install dependencies:

```bash
pnpm install
```

3. Run tests to ensure everything is working:

```bash
pnpm test
```

### Using the SDK

We provide a TypeScript SDK to help you build protocols programmatically:

```typescript
import { createProtocol, createEndpoint, createParameter } from './sdk';

const protocol = createProtocol()
  .setName('my-api')
  .setVersion('1.0.0')
  .setDescription('My awesome API protocol')
  .setAuthor('Your Name')
  .setLicense('MIT')
  .addEndpoint(
    createEndpoint()
      .setName('getData')
      .setMethod('GET')
      .setPath('/api/data')
      .setDescription('Get data from the API')
      .addParameter(
        createParameter()
          .setName('limit')
          .setType('number')
          .setDescription('Maximum items to return')
          .setRequired(false)
          .setDefault(100)
          .build()
      )
      .setResponse({
        type: 'object',
        description: 'API response',
      })
      .build()
  )
  .build();
```

## Creating a Protocol

### 1. Choose a Template

We provide several templates to get you started:

- **REST API**: Standard HTTP REST API
- **GraphQL API**: GraphQL endpoint wrapper
- **WebSocket API**: Real-time WebSocket connections
- **Webhook Receiver**: Incoming webhook handler
- **File Upload API**: File upload and management

Access templates programmatically:

```typescript
import { getTemplate, getTemplatesByCategory } from './sdk';

const restTemplate = getTemplate('REST API');
const apiTemplates = getTemplatesByCategory('API');
```

### 2. Define Endpoints

Each endpoint must specify:

```typescript
{
  name: 'uniqueEndpointName',           // Unique within the protocol
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: '/api/endpoint',               // URL path (may include {parameters})
  description: 'What this endpoint does',
  parameters?: [...],                  // Input parameters
  response: {...},                     // Response schema
  authentication?: boolean,            // Whether auth is required
  rateLimit?: {...}                   // Endpoint-specific rate limits
}
```

### 3. Define Parameters

Parameters describe the inputs your endpoint accepts:

```typescript
{
  name: 'parameterName',
  type: 'string' | 'number' | 'boolean' | 'object' | 'array',
  description: 'Parameter description',
  required: true | false,
  default?: any,                       // Default value
  enum?: [...],                       // Allowed values
  pattern?: 'regex',                   // Validation pattern (strings)
  minimum?: number,                    // Min value (numbers)
  maximum?: number,                    // Max value (numbers)
  items?: {...},                      // Array item definition
  properties?: {...}                   // Object property definitions
}
```

### 4. Configure Authentication

Supported authentication types:

```typescript
// API Key in Header
{
  type: 'api_key',
  location: 'header',
  name: 'X-API-Key'
}

// API Key in Query
{
  type: 'api_key',
  location: 'query',
  name: 'api_key'
}

// Bearer Token
{
  type: 'bearer_token'
}

// Basic Authentication
{
  type: 'basic'
}

// OAuth2
{
  type: 'oauth2'
}
```

### 5. Set Rate Limits

Protect APIs with rate limiting:

```typescript
{
  requests: 1000,     // Number of requests
  window: '1h',       // Time window (1s, 1m, 1h, 1d)
  burst?: 100         // Optional burst allowance
}
```

## Validation Requirements

All protocols must pass our validation system before acceptance:

### Schema Validation

- ✅ Valid JSON structure
- ✅ All required fields present
- ✅ Proper data types
- ✅ Valid semantic versioning
- ✅ Unique protocol name

### Business Logic Validation

- ✅ Maximum 50 endpoints per protocol
- ✅ No duplicate endpoint names
- ✅ No duplicate path/method combinations
- ✅ Valid parameter definitions
- ✅ Consistent authentication configuration

### Security Validation

- ✅ HTTPS URLs only
- ✅ No sensitive data in URL paths
- ⚠️ Authentication configuration recommended
- ⚠️ Rate limiting configuration recommended

### Performance Validation

- ✅ Reasonable rate limits
- ✅ Appropriate timeout values
- ✅ Efficient parameter structures

### Test Your Protocol

Use our validation tools:

```bash
# Validate a protocol file
pnpm run validate protocols/my-protocol.json

# Test protocol generation
pnpm run test-protocol protocols/my-protocol.json

# Run full test suite
pnpm test
```

## Submission Process

### 1. Prepare Your Submission

1. **Create Protocol File**: Place your protocol in `protocols/your-protocol-name.json`
2. **Add Documentation**: Include a README in `protocols/your-protocol-name/README.md`
3. **Add Tests** (optional but recommended): Include test cases
4. **Validate**: Ensure your protocol passes all validation checks

### 2. File Structure

```
protocols/
├── your-protocol-name.json           # Main protocol definition
└── your-protocol-name/              # Optional additional files
    ├── README.md                    # Protocol documentation
    ├── examples/                    # Usage examples
    │   ├── basic-usage.ts
    │   └── advanced-features.ts
    └── tests/                       # Test cases
        └── protocol.test.json
```

### 3. Create Pull Request

1. **Commit Changes**:

```bash
git add protocols/your-protocol-name.json
git commit -m "Add your-protocol-name protocol"
git push origin feature/your-protocol-name
```

2. **Open Pull Request**:
   - Use our PR template
   - Provide clear description of your protocol
   - Include examples and use cases
   - Reference any related issues

3. **PR Template**:

```markdown
## Protocol Submission: Your Protocol Name

### Description

Brief description of what your protocol does and why it's useful.

### Checklist

- [ ] Protocol passes validation
- [ ] Documentation included
- [ ] Examples provided
- [ ] Tests included (if applicable)
- [ ] Follows naming conventions

### Testing

Describe how you've tested your protocol.

### Additional Notes

Any additional information reviewers should know.
```

### 4. Automated Review Process

Once you submit your PR:

1. **Automated Validation**: Our CI system will automatically validate your protocol
2. **Security Scan**: We'll check for potential security issues
3. **Manual Review**: Core maintainers will review your submission
4. **Feedback**: We'll provide feedback if changes are needed
5. **Approval**: Valid protocols will be merged automatically

## Testing Guidelines

### Unit Tests

If you're contributing code changes, ensure you have proper test coverage:

```typescript
describe('MyProtocol', () => {
  it('should validate successfully', async () => {
    const protocol = loadProtocol('my-protocol.json');
    const result = await validator.validate(protocol);
    expect(result.valid).toBe(true);
  });

  it('should generate correct MCP tools', async () => {
    const protocol = loadProtocol('my-protocol.json');
    const tools = await generator.generateTools(protocol);
    expect(tools).toHaveLength(expectedToolCount);
  });
});
```

### Integration Tests

Test your protocol with real API calls:

```typescript
describe('MyProtocol Integration', () => {
  it('should successfully call the real API', async () => {
    const protocol = loadProtocol('my-protocol.json');
    const tools = await generator.generateTools(protocol);

    const result = await tools[0].handler({
      apiKey: process.env.TEST_API_KEY,
      limit: 10,
    });

    expect(result).toBeDefined();
  });
});
```

### Manual Testing

1. **Load Protocol**: Test protocol loading in development environment
2. **Generate Tools**: Verify MCP tools are generated correctly
3. **Execute Calls**: Make actual API calls to test functionality
4. **Error Handling**: Test error scenarios and edge cases

## Best Practices

### Protocol Design

1. **Keep It Simple**: Start with core functionality, add complexity later
2. **Clear Naming**: Use descriptive names for endpoints and parameters
3. **Consistent Patterns**: Follow consistent patterns across endpoints
4. **Version Properly**: Use semantic versioning for breaking changes
5. **Document Everything**: Provide clear descriptions for all components

### Security

1. **Never Hardcode Secrets**: Use authentication parameters instead
2. **Use HTTPS**: Always require secure connections
3. **Validate Input**: Define proper parameter validation
4. **Rate Limiting**: Always include reasonable rate limits
5. **Principle of Least Privilege**: Only request necessary permissions

### Performance

1. **Efficient Endpoints**: Design endpoints that return exactly what's needed
2. **Reasonable Defaults**: Set sensible default values for parameters
3. **Pagination**: Support pagination for large datasets
4. **Caching**: Consider caching strategies for frequently accessed data
5. **Timeouts**: Set appropriate timeout values

### Maintainability

1. **Clear Documentation**: Write documentation as you code
2. **Version Management**: Plan for future versions and breaking changes
3. **Backward Compatibility**: Avoid breaking changes when possible
4. **Error Messages**: Provide helpful error messages
5. **Monitoring**: Consider how the protocol will be monitored in production

### Example Protocol

Here's a complete example of a well-structured protocol:

```json
{
  "name": "weather-api",
  "version": "1.2.0",
  "description": "Access current weather data and forecasts from OpenWeatherMap API",
  "author": "Weather Protocol Contributors",
  "license": "MIT",
  "repository": "https://github.com/weather-protocol/openweather-mcp",
  "authentication": {
    "type": "api_key",
    "location": "query",
    "name": "appid"
  },
  "rateLimit": {
    "requests": 1000,
    "window": "1h"
  },
  "endpoints": [
    {
      "name": "getCurrentWeather",
      "method": "GET",
      "path": "/weather",
      "description": "Get current weather data for a specific location",
      "parameters": [
        {
          "name": "q",
          "type": "string",
          "description": "City name, state code (US only) and country code divided by comma",
          "required": true,
          "pattern": "^[a-zA-Z\\s,]+$"
        },
        {
          "name": "units",
          "type": "string",
          "description": "Units of measurement",
          "required": false,
          "default": "metric",
          "enum": ["standard", "metric", "imperial"]
        }
      ],
      "response": {
        "type": "object",
        "description": "Current weather data",
        "properties": {
          "main": {
            "type": "object",
            "description": "Main weather parameters",
            "required": true
          },
          "weather": {
            "type": "array",
            "description": "Weather condition details",
            "required": true
          }
        }
      },
      "authentication": true,
      "rateLimit": {
        "requests": 60,
        "window": "1m"
      }
    }
  ],
  "metadata": {
    "category": "weather",
    "tags": ["weather", "forecast", "api"],
    "documentation": "https://openweathermap.org/api",
    "supportEmail": "support@weather-protocol.org"
  }
}
```

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- ✅ Be respectful and professional
- ✅ Welcome newcomers and help them learn
- ✅ Focus on constructive feedback
- ✅ Assume positive intent
- ❌ Don't engage in harassment or discrimination
- ❌ Don't post spam or off-topic content

### Communication

- **GitHub Issues**: For bug reports, feature requests, and protocol proposals
- **Pull Requests**: For code contributions and protocol submissions
- **Discussions**: For general questions and community discussion

### Recognition

Contributors are recognized in:

- Protocol author fields
- Repository contributors list
- Release notes and changelogs
- Community showcases

## Support

### Getting Help

If you need assistance:

1. **Check Documentation**: Review this guide and existing protocols
2. **Search Issues**: See if your question has been asked before
3. **Ask the Community**: Open a GitHub discussion
4. **Report Bugs**: Create a GitHub issue with detailed information

### Common Issues

**Validation Failures**:

- Check required fields are present
- Verify JSON syntax is valid
- Ensure parameter types match definitions
- Validate endpoint paths and methods

**Authentication Issues**:

- Verify authentication configuration
- Test with valid credentials
- Check parameter names match API requirements

**Rate Limiting**:

- Set reasonable rate limits
- Consider burst allowances
- Test with actual API rate limits

**Schema Errors**:

- Follow parameter definition requirements
- Use proper data types
- Include required properties for objects

### Resources

- **SDK Documentation**: Complete TypeScript SDK reference
- **Protocol Examples**: Sample protocols for common use cases
- **API Reference**: Detailed API documentation
- **Migration Guide**: Upgrading protocols between versions
- **Troubleshooting**: Common issues and solutions

---

Thank you for contributing to the HyperMCP Community Protocol ecosystem! Your contributions help make AI agents more capable and accessible to everyone.
