# Developer Guide

> **Build the future of AI-DeFi integration** - comprehensive guide for contributors and developers 🚀

Welcome to the **hl-eco-mcp** developer documentation. Whether you're contributing community protocols, extending core functionality, or building on our platform, this guide has everything you need.

## 🏗️ System Architecture

### Core Components

```
hl-eco-mcp/
├── src/
│   ├── server/           # MCP Server Core
│   │   ├── MCPServer.ts        # Main server implementation
│   │   ├── ToolRegistry.ts     # Tool management and routing
│   │   └── SessionManager.ts   # Client session handling
│   ├── adapters/         # Protocol Integrations
│   │   └── hyperliquid/       # HyperLiquid DEX integration
│   ├── tools/            # MCP Tool Implementations
│   │   ├── HyperLiquidTools.ts    # Trading and market data
│   │   ├── ExecutionTools.ts      # Smart execution algorithms
│   │   ├── RiskManagementTools.ts # Portfolio risk analysis
│   │   └── MarketIntelligence.ts  # Analytics and insights
│   ├── community/        # Community Protocol System
│   │   ├── validation/        # Protocol validation logic
│   │   ├── generation/        # MCP tool generation
│   │   ├── loading/           # Protocol loading and caching
│   │   └── github/            # GitHub PR workflow integration
│   ├── utils/            # Shared Utilities
│   │   ├── ApiClient.ts       # HTTP client with retries
│   │   ├── RateLimiter.ts     # Rate limiting and throttling
│   │   └── logger.ts          # Structured logging
│   └── websocket/        # Real-time Data Feeds
│       └── HyperLiquidWS.ts   # WebSocket connections
├── protocols/        # Community Protocol Definitions
│   └── gluex-protocol.json  # Example protocol
└── tests/            # Comprehensive Test Suite
    ├── tools/             # Tool testing
    ├── adapters/          # Integration testing
    └── community/         # Community system testing
```

### Key Design Principles

- **🔌 Modular Architecture**: Each component has clear boundaries and responsibilities
- **⚡ Performance First**: Optimized for high-throughput AI agent interactions
- **🛡️ Security Built-in**: Authentication, validation, and rate limiting at every layer
- **🔄 Community-Driven**: Easy extension points for community contributions
- **📊 Observable**: Comprehensive logging, metrics, and monitoring

## 📝 Development Standards

### Code Quality Requirements

- **TypeScript Strict Mode**: All code must pass `tsc --strict`
- **Linting**: ESLint + Prettier must pass (`pnpm run lint`)
- **Testing**: >85% code coverage target
- **Documentation**: All public APIs must be documented

### Architecture Patterns

- **📋 Zod Schemas**: All input validation uses Zod for type safety
- **📊 Structured Logging**: Use `createComponentLogger` for consistent logging
- **⚡ Async/Await**: Modern Promise-based asynchronous patterns
- **🛡️ Error Handling**: Comprehensive error boundaries and graceful degradation

## ⚙️ Development Scripts

```bash
# Development
pnpm run dev          # Hot reload development server
pnpm run build        # Production build
pnpm start           # Run production build

# Quality Assurance
pnpm run typecheck    # TypeScript type checking
pnpm run lint         # ESLint + Prettier checking
pnpm run lint:fix     # Auto-fix linting issues
pnpm run test         # Run Jest test suite
pnpm run test:watch   # Watch mode testing
pnpm run test:coverage # Coverage report

# Protocol Management
hl-eco-mcp --validate-protocol protocols/my-protocol.json  # Validate protocol
hl-eco-mcp --validate-all-protocols  # Validate all protocols
```

## 🚀 Local Development Setup

### Quick Start

```bash
# Clone and setup
git clone https://github.com/khrafts/hyper-mcp.git
cd hyper-mcp
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
pnpm run dev
```

### Development Environment

The development server provides:

- **🔄 Hot Reload**: Automatic restart on code changes
- **📊 Debug Logging**: Verbose logging for development
- **⚡ Fast Builds**: Optimized TypeScript compilation
- **🧪 Mock Mode**: Test without external API dependencies

```bash
# Development with mocked APIs (no external calls)
MOCK_EXTERNAL_APIS=true pnpm run dev

# Development with debug logging
LOG_LEVEL=debug pnpm run dev
```

## 🤝 Contributing

### Types of Contributions

#### 1. Community Protocol Contributions (Most Common)

**No coding required!** Add your protocol via JSON definition:

```bash
# 1. Fork the repository
git clone https://github.com/your-username/hyper-mcp.git

# 2. Create your protocol definition
cp protocols/gluex-protocol.json protocols/my-protocol.json
# Edit with your API details...

# 3. Validate your protocol
hl-eco-mcp --validate-protocol protocols/my-protocol.json

# 4. Submit PR
git add protocols/my-protocol.json
git commit -m "feat: add my-protocol integration"
git push origin feature/my-protocol
# Open PR - automatic validation and tool generation!
```

#### 2. Core HyperLiquid Tool Development

Extend the built-in HyperLiquid integration:

```typescript
// src/tools/HyperLiquidTools.ts
export const myNewTool: ToolDefinition = {
  name: 'hyperliquid_my_new_feature',
  description: 'New HyperLiquid functionality',
  inputSchema: z.object({
    // Zod schema for inputs
  }),
  handler: async (args) => {
    // Implementation
  },
};

// Register in SimpleAdapterManager
```

#### 3. Community System Extension

Enhance the community protocol system:

- **Protocol Validation**: Extend `src/community/validation/`
- **Tool Generation**: Enhance `src/community/generation/`
- **Protocol Loading**: Modify `src/community/loading/`
- **GitHub Integration**: Update `src/community/github/`

### Validation Requirements

#### Protocol Validation

```json
{
  "name": "protocol-name",          // Required: alphanumeric + hyphens
  "version": "1.0.0",              // Required: semantic versioning
  "description": "Protocol desc",   // Required: min 10 characters
  "author": "Your Name",            // Required: attribution
  "license": "MIT",                // Required: open source license
  "endpoints": [...]               // Required: at least 1 endpoint
}
```

#### Security Validation

- ✅ HTTPS URLs only
- ✅ No hardcoded secrets
- ✅ Rate limiting configuration
- ✅ Input validation schemas
- ✅ Authentication configuration

#### Business Logic Validation

- ✅ Maximum 50 endpoints per protocol
- ✅ No duplicate endpoint names
- ✅ Valid parameter definitions
- ✅ Consistent authentication setup

## 🧪 Testing Strategy

### Test Categories

```bash
# Unit Tests - Individual components
pnpm test tests/tools/
pnpm test tests/adapters/

# Integration Tests - End-to-end workflows
pnpm test tests/integration/

# Community Protocol Tests - Protocol validation
pnpm test tests/community/

# Coverage Report
pnpm run test:coverage
```

### Testing Standards

- **🎯 Coverage Target**: >85% code coverage
- **🧪 Mock External APIs**: Use mocks for all external services
- **🔄 CI Integration**: All tests must pass before merge
- **📊 Performance Tests**: Load testing for high-throughput scenarios

### Example Test Structure

```typescript
describe('HyperLiquidTools', () => {
  describe('hyperliquid_get_account_info', () => {
    it('should return account info successfully', async () => {
      // Mock adapter response
      const mockAdapter = createMockAdapter();
      mockAdapter.getAccountInfo.mockResolvedValue(mockAccountData);

      const result = await tools.handleToolCall('hyperliquid_get_account_info', {});

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          account: expect.any(String),
          marginSummary: expect.any(Object),
        }),
      });
    });
  });
});
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - name: TypeScript Check
        run: pnpm run typecheck
      - name: Linting
        run: pnpm run lint
      - name: Test Suite
        run: pnpm run test:coverage
      - name: Build Verification
        run: pnpm run build
      - name: Docker Build
        run: docker build -t hl-eco-mcp .
```

### Pre-commit Hooks

```bash
# Automatic checks before every commit
- ESLint + Prettier formatting
- TypeScript compilation
- Test execution
- Protocol validation (if protocols/ changed)
```

### Release Process

1. **Version Bump**: Semantic versioning (major.minor.patch)
2. **Tag Release**: Git tag with release notes
3. **NPM Publish**: Automatic publication to npm registry
4. **Docker Images**: Multi-arch container builds
5. **Documentation**: GitBook sync for documentation updates

## 📊 Monitoring & Observability

### Development Metrics

- **Code Coverage**: Jest coverage reports
- **Performance**: Benchmark tests for critical paths
- **Protocol Health**: Community protocol validation results
- **Usage Analytics**: Tool usage patterns and performance

### Production Monitoring

- **📊 Server Metrics**: Request rates, response times, error rates
- **🔗 Integration Health**: HyperLiquid and community protocol status
- **🛡️ Security**: Rate limiting, authentication failures, suspicious activity
- **💻 Resource Usage**: Memory, CPU, network utilization

---

**🎆 Ready to Contribute?** Start with a community protocol submission - it's the fastest way to add value to the ecosystem! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for detailed instructions.
