# Contributing Community Protocols

Thank you for your interest in contributing to the community protocols! This guide will help you create high-quality protocol integrations that benefit the entire community.

## Before You Start

1. **Check Existing Protocols**: Make sure your target API isn't already integrated
2. **Read the Documentation**: Familiarize yourself with [protocol development](../developer/protocol-development.md)
3. **Test API Access**: Ensure you can access the target API and understand its structure
4. **Join the Community**: Connect with other contributors on Discord or GitHub Discussions

## Contribution Process

### 1. Protocol Planning

**Research Phase**:

- [ ] Study the target API documentation thoroughly
- [ ] Identify the most valuable endpoints for MCP integration
- [ ] Test API endpoints manually with curl or Postman
- [ ] Document authentication requirements
- [ ] Check rate limits and usage restrictions

**Design Phase**:

- [ ] Plan tool naming conventions (use `api_name_action` format)
- [ ] Design parameter structures for ease of use
- [ ] Create response schemas that capture essential data
- [ ] Consider error handling scenarios
- [ ] Plan for different authentication types

### 2. Protocol Development

**Setup**:

```bash
# 1. Fork the repository
git clone https://github.com/yourusername/hyper-mcp.git
cd hyper-mcp

# 2. Create protocol file
# Copy the template to protocols directory
cp docs/community-protocols/template/protocol-template.json \
   protocols/your-protocol-name.json
```

**Development Workflow**:

1. **Define Protocol Structure**: Fill out the protocol template
2. **Add Endpoints**: Define 3-5 most important endpoints first
3. **Test Locally**: Use the testing tools to validate your protocol
4. **Iterate**: Refine based on testing results
5. **Document**: Create comprehensive documentation

### 3. Testing Requirements

All protocols must pass these tests before submission:

**Validation Tests**:

```bash
# Protocol structure validation
node dist/bin/hyperliquid-mcp.js --validate-protocol protocols/your-protocol-name.json

# Tool generation test
ENABLE_COMMUNITY_SYSTEM=true LOG_LEVEL=debug node dist/bin/hyperliquid-mcp.js --test-tools
```

**Integration Tests**:

```bash
# Test with real API (if possible)
API_KEY=your-test-key node dist/bin/hyperliquid-mcp.js --test-endpoint your-protocol.json endpoint_name

# Test with Claude Code
# Add to MCP config and test tool execution
```

**Documentation Tests**:

- [ ] All tools have clear descriptions
- [ ] Parameter descriptions explain expected formats
- [ ] Examples demonstrate real usage scenarios
- [ ] Authentication setup is documented clearly

### 4. Quality Standards

#### Protocol Definition Quality

**Required Standards**:

- **Clear Naming**: Tool names follow `protocol_action` convention
- **Complete Descriptions**: Every tool and parameter has helpful descriptions
- **Proper Types**: All parameters use correct JSON Schema types
- **Error Handling**: Appropriate error responses defined
- **Authentication**: Secure authentication handling

**Recommended Standards**:

- **Comprehensive Coverage**: Cover the most important API endpoints
- **User-Friendly**: Parameters should be intuitive for non-developers
- **Efficient**: Minimize API calls while maximizing functionality
- **Consistent**: Follow patterns established by existing protocols

#### Code Quality

**JSON Structure**:

```json
{
  "name": "your-protocol",
  "version": "1.0.0",
  "description": "Brief, clear description of what this protocol provides",
  "baseUrl": "https://api.example.com",
  "authentication": {
    "type": "bearer",
    "token": "${YOUR_API_KEY}"
  },
  "endpoints": [
    {
      "path": "/endpoint",
      "method": "GET",
      "name": "descriptive_action_name",
      "description": "Clear description of what this tool does",
      "parameters": {
        "param_name": {
          "type": "string",
          "required": true,
          "description": "Clear parameter description with examples",
          "example": "example-value"
        }
      },
      "response": {
        "type": "object",
        "description": "Description of response data"
      }
    }
  ]
}
```

#### Documentation Quality

**README.md Structure**:

```markdown
# Protocol Name

Brief description and key benefits.

## Features

- List of main capabilities
- Generated tools count
- Key use cases

## Setup

Step-by-step authentication setup

## Available Tools

Tool reference with examples

## Examples

Real usage scenarios

## Troubleshooting

Common issues and solutions
```

### 5. Submission Guidelines

#### Checklist Before Submission

**Protocol Requirements**:

- [ ] Protocol passes all validation tests
- [ ] All endpoints tested with real API responses
- [ ] Error handling works correctly
- [ ] Authentication is properly configured
- [ ] Tools generate with correct names and parameters

**Documentation Requirements**:

- [ ] README.md follows the standard template
- [ ] All tools documented with examples
- [ ] Setup instructions are clear and complete
- [ ] Troubleshooting section addresses common issues
- [ ] CHANGELOG.md exists with initial version entry

**Testing Requirements**:

- [ ] Protocol validated with `--validate-protocol`
- [ ] Tools tested in actual MCP client (Claude Code)
- [ ] All examples in documentation verified to work
- [ ] Error scenarios tested and documented

#### Pull Request Process

1. **Create Feature Branch**:

   ```bash
   git checkout -b add-protocol-name
   ```

2. **Commit Changes**:

   ```bash
   git add protocols/protocol-name.json
   git commit -m "feat: add protocol-name community protocol

   - Integrates Protocol Name API with X tools
   - Supports authentication via API key
   - Covers endpoints: list key endpoints
   - Includes comprehensive documentation and examples"
   ```

3. **Create Pull Request**:
   - Use the PR template
   - Include testing results
   - Add screenshots of tools working in Claude Code
   - Tag relevant reviewers

#### PR Template

```markdown
## Protocol Integration: [Protocol Name]

### Summary

Brief description of the protocol and its capabilities.

### Generated Tools

List the tools that will be generated:

- `protocol_tool_1` - Description
- `protocol_tool_2` - Description
- ...

### Testing Results

- [ ] Protocol validation passed
- [ ] All tools tested in Claude Code
- [ ] Authentication tested
- [ ] Error handling verified
- [ ] Documentation examples verified

### Authentication Setup

Explain how users set up authentication for this protocol.

### Breaking Changes

None / List any breaking changes

### Screenshots

Include screenshots of tools working in Claude Code.

### Additional Notes

Any additional context or considerations.
```

## Protocol Categories

When contributing, consider which category your protocol fits:

### **DeFi & Trading**

- Trading platforms, DEXs, yield farming
- Market data, price feeds
- Portfolio management

### **Development Tools**

- Code repositories, CI/CD
- Deployment platforms
- Development services

### **AI & Machine Learning**

- AI model APIs
- ML platforms and tools
- Data processing services

### **Data & Analytics**

- Market data providers
- Analytics platforms
- Business intelligence tools

### **Communication & Collaboration**

- Chat platforms, forums
- Project management
- Team collaboration tools

### **Content & Media**

- Content management systems
- Media processing APIs
- Social media platforms

## Best Practices

### API Integration Patterns

**REST APIs**:

- Use clear, semantic endpoint names
- Map HTTP methods appropriately (GET for reads, POST for actions)
- Handle pagination in list endpoints
- Provide filtering and sorting options where available

**GraphQL APIs**:

- Break complex queries into focused tools
- Use fragments for reusable data structures
- Handle variables and operation names properly
- Consider query complexity and depth limits

**Real-time APIs**:

- Focus on request/response patterns for MCP compatibility
- Document any limitations around real-time features
- Consider webhook-style endpoints for notifications

### Error Handling

**HTTP Status Codes**:

```json
{
  "errorResponses": {
    "400": "Bad Request - Invalid parameters provided",
    "401": "Unauthorized - Invalid or missing API key",
    "403": "Forbidden - Insufficient permissions",
    "404": "Not Found - Resource does not exist",
    "429": "Rate Limited - Too many requests",
    "500": "Server Error - API service unavailable"
  }
}
```

**Descriptive Error Messages**:

- Explain what went wrong
- Suggest how to fix the issue
- Include relevant error codes or references

### Security Considerations

**API Key Handling**:

- Always use environment variables for secrets
- Never include actual keys in examples
- Document secure storage practices
- Support key rotation where possible

**Data Privacy**:

- Minimize data exposure in tool descriptions
- Respect user privacy in parameter names
- Document any data retention implications
- Consider GDPR/privacy regulation compliance

### Performance Optimization

**Efficient Endpoint Design**:

- Combine related data in single endpoints when possible
- Use appropriate caching headers
- Support batch operations for bulk actions
- Consider rate limiting in tool design

**Response Optimization**:

- Request only necessary fields
- Use pagination for large datasets
- Implement proper timeout handling
- Cache responses where appropriate

## Community Guidelines

### Code of Conduct

All contributors must follow our Code of Conduct:

- **Be Respectful**: Treat all community members with respect
- **Be Collaborative**: Work together to improve protocols
- **Be Inclusive**: Welcome contributors of all backgrounds and skill levels
- **Be Constructive**: Provide helpful feedback and suggestions

### Getting Help

**Documentation Questions**:

- Check existing developer documentation first
- Search GitHub issues for similar questions
- Ask in community Discord #protocol-development

**Technical Issues**:

- Include full error messages and steps to reproduce
- Share your protocol definition for debugging
- Test with latest version before reporting bugs

**Feature Requests**:

- Explain the use case and benefits
- Provide examples of desired functionality
- Consider backwards compatibility implications

### Recognition

Contributors will be recognized:

- **Protocol Contributors**: Listed in protocol README and main contributors
- **Major Contributors**: Featured in release notes and community highlights
- **Maintainers**: Invited to join the core maintainer team

## Maintenance and Updates

### Lifecycle Management

**Version Updates**:

- Follow semantic versioning (major.minor.patch)
- Document changes in CHANGELOG.md
- Test compatibility with existing integrations
- Provide migration guides for breaking changes

**API Changes**:

- Monitor target API for changes and deprecations
- Update protocols promptly when APIs change
- Communicate changes to users through release notes
- Maintain backwards compatibility when possible

### Long-term Maintenance

**Responsibilities**:

- Monitor API health and availability
- Respond to user issues and questions
- Keep authentication methods up to date
- Update documentation as needed

**Community Support**:

- Help other contributors understand your protocol
- Review related PRs and provide feedback
- Share knowledge in community discussions
- Mentor new contributors interested in similar APIs

## Examples and Templates

### Example Protocol Structure

See the [template directory](template/) for:

- `protocol-template.json` - Complete protocol template
- `README-template.md` - Documentation template
- `examples/` - Usage example templates

### Reference Implementations

Study these well-implemented protocols:

- **GlueX**: Good example of DeFi protocol integration
- **HyperLiquid**: Comprehensive trading API integration
- **OpenAI**: Simple but powerful AI service integration

### Common Patterns

- **List + Details**: Endpoints that list items and get item details
- **Search + Filter**: Search endpoints with multiple filter options
- **Create + Update + Delete**: Full CRUD operation coverage
- **Batch Operations**: Tools that handle multiple items efficiently

---

Ready to contribute? Start by exploring the [protocol template](template/) and following the development workflow above. We're excited to see what you build!
