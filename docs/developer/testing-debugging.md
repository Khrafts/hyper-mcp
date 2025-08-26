# Testing and Debugging Community Protocols

This guide covers how to test and debug community protocols during development, helping you identify and resolve issues before deployment.

## Testing Workflow Overview

1. **Protocol Definition Validation** - Validate JSON structure and schema
2. **API Endpoint Testing** - Test actual API connectivity and responses
3. **Tool Generation Testing** - Verify MCP tools are generated correctly
4. **Integration Testing** - Test tools work in Claude Code or other MCP clients

## 1. Protocol Definition Validation

### Validate JSON Structure

Use the built-in validation command to check your protocol definition:

```bash
# Validate a single protocol
node dist/bin/hyperliquid-mcp.js --validate-protocol path/to/your-protocol.json

# Validate all protocols in community directory
node dist/bin/hyperliquid-mcp.js --validate-all-protocols
```

### Common Validation Errors

**Missing Required Fields**

```json
{
  "error": "Protocol validation failed",
  "details": {
    "name": "Required",
    "version": "Required"
  }
}
```

Solution: Ensure all required fields are present in your protocol definition.

**Invalid Endpoint Configuration**

```json
{
  "error": "Invalid endpoint configuration",
  "endpoint": "/api/data",
  "issue": "Missing parameters definition"
}
```

Solution: Add proper parameters configuration for endpoints that require them.

**Schema Validation Issues**

```json
{
  "error": "Response schema validation failed",
  "endpoint": "/api/data",
  "issue": "Invalid schema type"
}
```

Solution: Verify your response schema follows JSON Schema specification.

## 2. API Endpoint Testing

### Test API Connectivity

Before creating protocol definitions, test API endpoints manually:

```bash
# Test GET endpoint
curl -H "Content-Type: application/json" \
     "https://api.example.com/v1/data"

# Test POST endpoint with parameters
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"param1": "value1", "param2": "value2"}' \
     "https://api.example.com/v1/action"

# Test GraphQL endpoint
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"query": "{ user(id: 1) { name email } }"}' \
     "https://api.example.com/graphql"
```

### Test with Authentication

If your API requires authentication, test with appropriate headers:

```bash
# API Key authentication
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     "https://api.example.com/v1/protected"

# Custom header authentication
curl -H "X-API-Key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     "https://api.example.com/v1/protected"
```

### Response Analysis

Analyze API responses to design proper schemas:

```bash
# Pretty print JSON response
curl -s "https://api.example.com/v1/data" | jq '.'

# Extract specific fields
curl -s "https://api.example.com/v1/data" | jq '.data[] | {id, name, status}'
```

## 3. Tool Generation Testing

### Test Tool Generation

Use the MCP server's tool generation testing features:

```bash
# Generate tools from specific protocol
PROTOCOL_PATH=/path/to/protocol.json LOG_LEVEL=debug node dist/bin/hyperliquid-mcp.js --test-tools

# Test all community protocols
ENABLE_COMMUNITY_SYSTEM=true LOG_LEVEL=debug node dist/bin/hyperliquid-mcp.js --test-tools
```

### Debug Tool Generation

Enable debug logging to see tool generation process:

```bash
LOG_LEVEL=debug node dist/bin/hyperliquid-mcp.js
```

Look for log messages like:

```
[DEBUG] Loading community protocol: example-api
[DEBUG] Generated tool: example_api_get_data
[DEBUG] Tool parameters: {"param1": {"type": "string", "required": true}}
[DEBUG] Community system loaded 5 protocols, generated 12 tools
```

### Verify Generated Tools

Check that tools are generated with correct names and parameters:

```typescript
// In your protocol definition
{
  "name": "example-api",
  "endpoints": [
    {
      "path": "/data/{id}",
      "method": "GET",
      "name": "get_data",
      "parameters": {
        "id": {
          "type": "string",
          "required": true,
          "description": "Data item ID"
        }
      }
    }
  ]
}

// Expected generated tool name: example_api_get_data
// Expected parameter: id (string, required)
```

## 4. Integration Testing

### Test with Claude Code

1. **Configure MCP Client**
   Add your development server to Claude Code's MCP configuration:

   ```json
   {
     "mcpServers": {
       "hyperliquid-dev": {
         "command": "node",
         "args": ["/path/to/hyper-mcp/dist/bin/hyperliquid-mcp.js"],
         "env": {
           "ENABLE_COMMUNITY_SYSTEM": "true",
           "LOG_LEVEL": "debug"
         }
       }
     }
   }
   ```

2. **Test Tool Availability**
   In Claude Code, verify tools are available:

   ```
   What community protocol tools are available?
   ```

3. **Test Tool Execution**
   Execute generated tools:
   ```
   Use the example_api_get_data tool to fetch data for ID "123"
   ```

### Test Error Handling

Test various error scenarios:

```bash
# Test with invalid API key
INVALID_API_KEY=test123 node dist/bin/hyperliquid-mcp.js --test-tools

# Test with network timeout
NETWORK_TIMEOUT=100 node dist/bin/hyperliquid-mcp.js --test-tools

# Test with malformed responses
MOCK_MALFORMED_RESPONSES=true node dist/bin/hyperliquid-mcp.js --test-tools
```

## 5. Common Debugging Scenarios

### Tools Not Generating

**Issue**: Protocol loads but no tools are generated.

**Debug Steps**:

1. Check protocol validation:

   ```bash
   node dist/bin/hyperliquid-mcp.js --validate-protocol your-protocol.json
   ```

2. Enable debug logging:

   ```bash
   LOG_LEVEL=debug ENABLE_COMMUNITY_SYSTEM=true node dist/bin/hyperliquid-mcp.js
   ```

3. Check endpoint definitions have required fields:
   - `path` (string)
   - `method` (string)
   - `name` (string)

### API Calls Failing

**Issue**: Tools generate but API calls fail.

**Debug Steps**:

1. Test API endpoints manually with curl
2. Check authentication configuration
3. Verify parameter mapping:

   ```bash
   LOG_LEVEL=debug node dist/bin/hyperliquid-mcp.js --test-endpoint your-protocol.json get_data
   ```

4. Check network connectivity and timeouts

### Parameter Mapping Issues

**Issue**: Parameters not passed correctly to API.

**Debug Steps**:

1. Enable request/response logging:

   ```bash
   DEBUG_API_CALLS=true LOG_LEVEL=debug node dist/bin/hyperliquid-mcp.js
   ```

2. Check parameter definitions in protocol:

   ```json
   {
     "parameters": {
       "user_id": {
         "type": "string",
         "required": true,
         "location": "path" // or "query", "body"
       }
     }
   }
   ```

3. Verify parameter naming matches API expectations

### Authentication Issues

**Issue**: API returns 401/403 errors.

**Debug Steps**:

1. Test authentication manually:

   ```bash
   curl -H "Authorization: Bearer $API_KEY" https://api.example.com/test
   ```

2. Check authentication configuration:

   ```json
   {
     "authentication": {
       "type": "bearer",
       "token": "${API_KEY}"
     }
   }
   ```

3. Verify environment variables are set correctly

## 6. Performance Testing

### Load Testing

Test protocol performance under load:

```bash
# Test multiple concurrent requests
seq 1 10 | xargs -I {} -P 10 bash -c 'node dist/bin/hyperliquid-mcp.js --test-endpoint protocol.json get_data --params "{\"id\":\"{}\"}"'
```

### Memory Usage

Monitor memory usage during tool generation:

```bash
# Monitor memory while loading protocols
NODE_OPTIONS="--max-old-space-size=4096" node --inspect dist/bin/hyperliquid-mcp.js
```

### Response Time Analysis

Measure API response times:

```bash
# Time individual API calls
time node dist/bin/hyperliquid-mcp.js --test-endpoint protocol.json get_data --params '{"id":"123"}'
```

## 7. Best Practices for Testing

### 1. Use Test Data

Create test data fixtures for consistent testing:

```json
// tests/fixtures/api-responses.json
{
  "get_data_success": {
    "id": "123",
    "name": "Test Item",
    "status": "active"
  },
  "get_data_error": {
    "error": "Not found",
    "code": 404
  }
}
```

### 2. Environment Separation

Use different environments for testing:

```bash
# Development environment
NODE_ENV=development ENABLE_COMMUNITY_SYSTEM=true node dist/bin/hyperliquid-mcp.js

# Testing environment with mocks
NODE_ENV=test MOCK_EXTERNAL_APIS=true node dist/bin/hyperliquid-mcp.js

# Production environment
NODE_ENV=production ENABLE_COMMUNITY_SYSTEM=true node dist/bin/hyperliquid-mcp.js
```

### 3. Automated Testing

Create automated tests for your protocols:

```typescript
// tests/protocols/example-api.test.ts
import { ProtocolValidator } from '../../src/community/validation/ProtocolValidator';
import { CommunityProtocolSystem } from '../../src/community/CommunityProtocolSystem';

describe('Example API Protocol', () => {
  it('should validate protocol definition', async () => {
    const protocol = require('../fixtures/example-api-protocol.json');
    const validator = new ProtocolValidator();

    const result = await validator.validate(protocol);
    expect(result.isValid).toBe(true);
  });

  it('should generate correct tools', async () => {
    const system = new CommunityProtocolSystem();
    const tools = await system.generateTools('example-api');

    expect(tools).toHaveLength(3);
    expect(tools[0].name).toBe('example_api_get_data');
  });
});
```

### 4. Documentation Testing

Test that your protocol documentation is complete:

```bash
# Generate documentation and verify completeness
node scripts/generate-protocol-docs.js your-protocol.json
```

## 8. Troubleshooting Checklist

When debugging protocol issues, work through this checklist:

- [ ] Protocol JSON is valid and follows schema
- [ ] All required fields are present
- [ ] API endpoints are accessible and return expected responses
- [ ] Authentication is configured correctly
- [ ] Parameter mapping matches API requirements
- [ ] Response schemas match actual API responses
- [ ] Environment variables are set correctly
- [ ] Network connectivity is working
- [ ] MCP server is running and accessible
- [ ] Tools are generated with correct names and parameters
- [ ] Integration with MCP client works correctly

## Next Steps

After testing and debugging your protocol:

1. **Deploy to Production**: Move validated protocol to production environment
2. **Monitor Performance**: Set up monitoring for API calls and tool usage
3. **Gather Feedback**: Collect user feedback on tool functionality
4. **Iterate**: Improve protocol based on real-world usage

For more information, see:

- [Protocol Development Guide](protocol-development.md)
- [Protocol Schema Reference](protocol-schema.md)
- [Tool Generation Process](tool-generation.md)
