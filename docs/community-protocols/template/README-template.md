# [Protocol Name] Community Protocol

[Brief description of what this protocol provides and its main benefits]

## Overview

The [Protocol Name] community protocol integrates with [API Name] to provide [X] MCP tools for [main use cases]. This protocol enables you to [key capabilities] directly from Claude Code and other MCP clients.

### Key Features

- **[Feature 1]**: [Brief description]
- **[Feature 2]**: [Brief description]
- **[Feature 3]**: [Brief description]
- **[Feature 4]**: [Brief description]

### Generated Tools

This protocol generates the following MCP tools:

| Tool Name              | Description               | Parameters                  | Use Case               |
| ---------------------- | ------------------------- | --------------------------- | ---------------------- |
| `protocol_list_items`  | List items with filtering | limit, status, search       | Browse available items |
| `protocol_get_item`    | Get detailed item info    | id                          | View item details      |
| `protocol_create_item` | Create new item           | name, category, description | Add new items          |
| `protocol_update_item` | Update existing item      | id, name, status            | Modify items           |
| `protocol_delete_item` | Delete item               | id                          | Remove items           |

## Quick Start

### 1. Authentication Setup

1. **Get API Key**: Visit [API provider's dashboard] and create an API key
2. **Set Environment Variable**:
   ```bash
   export PROTOCOL_API_KEY="your-api-key-here"
   ```

### 2. Install Protocol

1. **Copy protocol file**:

   ```bash
   cp docs/community-protocols/protocol-name/protocol.json community-protocols/
   ```

2. **Enable community system**:

   ```bash
   export ENABLE_COMMUNITY_SYSTEM=true
   ```

3. **Restart MCP server**:
   ```bash
   node dist/bin/hyperliquid-mcp.js
   ```

### 3. Verify Installation

Check that tools are available:

```bash
# In Claude Code or your MCP client
What protocol-name tools are available?
```

You should see [X] tools listed with names starting with `protocol_`.

## Available Tools

### List Items (`protocol_list_items`)

Retrieve a paginated list of items with optional filtering.

**Parameters**:

- `limit` (optional): Number of items to return (1-100, default: 20)
- `offset` (optional): Number of items to skip (default: 0)
- `status` (optional): Filter by status ("active", "inactive", "pending")
- `search` (optional): Search items by name or description

**Example**:

```
Use protocol_list_items to get the first 10 active items
```

**Response**: Returns paginated list with total count and hasMore indicator.

### Get Item Details (`protocol_get_item`)

Retrieve detailed information about a specific item.

**Parameters**:

- `id` (required): Unique identifier of the item

**Example**:

```
Get details for item "item-123" using protocol_get_item
```

**Response**: Returns complete item information including metadata.

### Create Item (`protocol_create_item`)

Create a new item with specified properties.

**Parameters**:

- `name` (required): Name of the new item (1-100 characters)
- `category` (required): Category ("category1", "category2", "category3")
- `description` (optional): Item description (max 500 characters)
- `tags` (optional): Array of tags

**Example**:

```
Create a new item named "Test Item" in category1 using protocol_create_item
```

**Response**: Returns created item with generated ID and initial status.

### Update Item (`protocol_update_item`)

Update an existing item with new properties.

**Parameters**:

- `id` (required): Item identifier to update
- `name` (optional): New name for the item
- `description` (optional): New description
- `status` (optional): New status ("active", "inactive", "pending")

**Example**:

```
Update item "item-123" to set status to "active" using protocol_update_item
```

**Response**: Returns updated item information.

### Delete Item (`protocol_delete_item`)

Delete an existing item permanently.

**Parameters**:

- `id` (required): Item identifier to delete

**Example**:

```
Delete item "item-123" using protocol_delete_item
```

**Response**: Returns deletion confirmation.

## Usage Examples

### Basic Workflow

1. **List available items**:

   ```
   Show me all active items using protocol_list_items with status "active"
   ```

2. **Get item details**:

   ```
   Get full details for the first item from the list
   ```

3. **Create new item**:

   ```
   Create a new item called "My Project" in category1 with description "A test project"
   ```

4. **Update item**:
   ```
   Update the item to set status to "active"
   ```

### Advanced Usage

**Search and filter**:

```
Find items containing "project" in the name using protocol_list_items with search parameter
```

**Batch operations**:

```
List all pending items, then update each one to active status
```

**Data analysis**:

```
Get statistics on item distribution by category and status
```

## Authentication

### API Key Setup

1. **Register**: Create account at [Provider Website]
2. **Generate Key**: Go to Settings → API Keys → Create New Key
3. **Set Permissions**: Ensure key has appropriate permissions for your use case
4. **Environment Variable**: Set `PROTOCOL_API_KEY` environment variable

### Security Best Practices

- **Store Securely**: Never commit API keys to version control
- **Use Environment Variables**: Always use environment variables for secrets
- **Rotate Regularly**: Rotate API keys periodically for security
- **Monitor Usage**: Keep track of API usage and rate limits

## Rate Limits

This protocol respects the following rate limits:

- **Requests per minute**: 100
- **Requests per hour**: 1,000
- **Premium accounts**: Higher limits available

The MCP server automatically handles rate limiting and will pause requests if limits are exceeded.

## Error Handling

Common errors and solutions:

### Authentication Errors

**Error**: `401 Unauthorized`
**Solution**: Check that `PROTOCOL_API_KEY` is set correctly and the key is valid.

**Error**: `403 Forbidden`
**Solution**: Your API key may not have sufficient permissions for this operation.

### Validation Errors

**Error**: `400 Bad Request - Invalid parameters`
**Solution**: Check parameter types and required fields match the tool specifications.

**Error**: `422 Validation Error`
**Solution**: Ensure data meets validation requirements (string lengths, enum values, etc.).

### Resource Errors

**Error**: `404 Not Found`
**Solution**: The requested item ID doesn't exist. Use `protocol_list_items` to find valid IDs.

**Error**: `409 Conflict`
**Solution**: The operation conflicts with current state (e.g., can't delete item with dependencies).

### Rate Limiting

**Error**: `429 Rate Limited`
**Solution**: The protocol automatically handles rate limits. If this persists, consider upgrading your API plan.

## Troubleshooting

### Tools Not Appearing

1. **Check protocol installation**:

   ```bash
   ls community-protocols/protocol-name.json
   ```

2. **Verify environment variables**:

   ```bash
   echo $PROTOCOL_API_KEY
   echo $ENABLE_COMMUNITY_SYSTEM
   ```

3. **Check server logs**:
   ```bash
   LOG_LEVEL=debug node dist/bin/hyperliquid-mcp.js
   ```

### API Connection Issues

1. **Test API access manually**:

   ```bash
   curl -H "Authorization: Bearer $PROTOCOL_API_KEY" https://api.example.com/v1/items
   ```

2. **Check network connectivity and firewall settings**

3. **Verify API endpoint URLs are correct**

### Performance Issues

1. **Use appropriate limits**: Don't request more data than needed
2. **Cache results**: Re-use data when possible instead of repeated API calls
3. **Monitor rate limits**: Stay within API usage quotas

## Advanced Configuration

### Custom Base URL

For enterprise or testing environments:

```json
{
  "baseUrl": "https://custom-api.example.com/v1"
}
```

### Additional Headers

Add custom headers for special requirements:

```json
{
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

### Timeout Configuration

Adjust timeouts for slow APIs:

```json
{
  "timeout": 30000
}
```

## Contributing

Want to improve this protocol? Here's how:

1. **Report Issues**: Create GitHub issues for bugs or feature requests
2. **Submit PRs**: Follow the [contribution guidelines](../CONTRIBUTING.md)
3. **Test Changes**: Ensure all tests pass before submitting
4. **Update Documentation**: Keep docs in sync with protocol changes

## Changelog

### Version 1.0.0 (YYYY-MM-DD)

- Initial release
- Implemented core CRUD operations
- Added comprehensive error handling
- Full documentation and examples

### Future Plans

- Add bulk operations support
- Implement advanced filtering
- Add webhook integration
- Performance optimizations

## License

This protocol is released under the MIT License. See [LICENSE](LICENSE) for details.

## Support

- **Documentation**: [Developer guides](../developer/)
- **Issues**: [GitHub Issues](https://github.com/yourorg/hyper-mcp/issues)
- **Community**: [Discord Server](https://discord.gg/your-server)
- **Email**: support@example.com

---

_This protocol was created using the HyperLiquid MCP Community Protocol System. [Learn more](../README.md) about creating your own protocols._
