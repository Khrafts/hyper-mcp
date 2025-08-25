# Developer Guide

This section explains the architecture and development workflow for contributors.

Architecture

- Server core: src/server (MCPServer, ToolRegistry, SessionManager)
- **HyperLiquid Integration**: `src/adapters/hyperliquid`, `src/tools` (trading, execution, risk)
- **Community System**: `src/community` (protocol loading, validation, tool generation)
- Utilities: src/utils (ApiClient, RateLimiter, logger)
- WebSocket: src/websocket
- Optional community: src/community

Coding standards

- TypeScript strict mode
- ESLint + Prettier must pass (pnpm run lint)
- Descriptive logs via createComponentLogger
- Zod schemas for input validation

Scripts

- build: tsc && node scripts/build.js
- dev: tsx watch src/index.ts
- test: jest (consider adding tests under tests/)
- typecheck: tsc --noEmit
- lint/lint:fix

Running locally

```
pnpm install
cp .env.example .env
pnpm run dev
```

## Contributing

### Adding HyperLiquid Tools

1. Implement handler and input schema in appropriate tools file
2. Register in `SimpleAdapterManager.registerXXXTools()`
3. Add validation and error handling
4. Document the tool under `docs/tools/`

### Contributing Community Protocols

1. Create JSON protocol definition (see `CONTRIBUTING.md`)
2. Submit PR to protocols repository
3. Automatic validation and tool generation
4. No code changes required!

### Extending the Community System

1. **Validation**: Extend `src/community/validation/`
2. **Loading**: Modify `src/community/loading/`
3. **Generation**: Enhance `src/community/generation/`
4. **GitHub Integration**: Update `src/community/github/`

Testing

- Jest is configured, but tests may need to be added/enabled
- Aim for >85% coverage; per docs/tasks.md
- Use mocks for external APIs

CI/CD

- GitHub Actions run typecheck, lint, tests, build, Docker build
- Ensure no linter errors before merging

Releasing

- Tag versions and publish release notes
- Keep docs in sync through Git Sync to GitBook
