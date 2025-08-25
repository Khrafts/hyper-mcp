# Operations

This section covers running, deploying, monitoring, and securing the server in production environments.

Run modes

- Development: pnpm run dev
- Production: pnpm run build && pnpm start
- Docker: Build and run the image

Health and diagnostics

- Tool: system_info — returns server, session, tool stats
- Tool: health_check — returns overall health (adapters, tools, sessions)
- Logs: Structured JSON using Winston; LOG_LEVEL controls verbosity

Observability

- Track adapter health (SimpleAdapterManager.getHealthStatus)
- Monitor WebSocket status for HyperLiquid
- Consider integrating with a log aggregator (ELK, Datadog)

Performance

- Rate limits and retries are built into adapters
- Caching via CACHE_TTL_SECONDS
- MAX_CONCURRENT_REQUESTS throttles concurrency

Security

- Manage secrets via env vars (do not commit .env)
- Restrict who can run the server and access the stdio transport
- Consider container isolation and minimal base images

Deployment

- Dockerfile included; use multi-stage build
- Example docker-compose.yml supports local orchestration
- For K8s, translate env vars to secrets and config maps

Playbooks

- API endpoint down: review adapter health, enable MOCK_EXTERNAL_APIS if appropriate
- Node Info unhealthy: tools are disabled automatically; verify endpoint and logs
- Rate limiting errors: adjust API_RATE_LIMIT_REQUESTS_PER_MINUTE and review backoff
