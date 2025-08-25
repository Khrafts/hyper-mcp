# Getting Started

This guide helps you install, configure, and run HyperLiquid Intelligence MCP locally and via Docker.

Prerequisites

- Node.js 18+ and pnpm
- Optional: Docker and Docker Compose
- Optional: API keys for HyperLiquid and GlueX

Install

1. Clone the repository
2. Install dependencies

```
pnpm install
```

3. Copy the example environment file

```
cp .env.example .env
```

4. Fill in values as needed (see configuration.md)

Run (local)

- Development: hot reload

```
pnpm run dev
```

- Build and start

```
pnpm run build
pnpm start
```

Run (Docker)

- Build the image

```
docker build -t hyper-mcp:local .
```

- Run the container

```
docker run --rm -p 3000:3000 --env-file .env hyper-mcp:local
```

Testing and linting

- Typecheck

```
pnpm run typecheck
```

- Lint

```
pnpm run lint
```

- Tests (Jest)

```
pnpm test
```

Next steps

- Configure environment variables: configuration.md
- Explore tools and integrations: tools/overview.md, integrations/README.md
- Operations and deployment: operations/README.md
