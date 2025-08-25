# Developer Guide

This section explains the architecture and development workflow for contributors.

Architecture

- Server core: src/server (MCPServer, ToolRegistry, SessionManager)
- Adapters: src/adapters (HyperLiquid, GlueX, Node Info)
- Tools: src/tools (SimpleHyperLiquidTools, SimpleGlueXTools, NodeInfoTools, Execution, Risk)
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

Adding a new tool

1. Implement handler and input schema
2. Register in the appropriate register\*Tools in SimpleAdapterManager
3. Ensure validation and error handling
4. Document the tool under docs/tools/

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
