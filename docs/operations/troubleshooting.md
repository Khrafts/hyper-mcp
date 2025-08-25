# Troubleshooting & FAQ

Common issues

- No tools listed: ensure adapters initialized; check logs for initialization errors
- Node Info tools missing: endpoint failed health check; verify NODE_INFO_API_BASE_URL
- Invalid tool arguments: follow each tool's JSON schema; refer to the tool pages
- Rate limit errors: backoff and retry; reduce concurrency; increase CACHE_TTL_SECONDS
- WebSocket disconnects: auto-reconnect is enabled; check network and WEBSOCKET_RECONNECT_DELAY_MS

Debugging tips

- Set ENABLE_DEBUG_LOGGING=true
- Use system_info and health_check tools to gather diagnostics
- Run with MOCK_EXTERNAL_APIS=true to isolate external dependencies in dev

FAQ

- Do I need GitBook paid plan? Public spaces are typically free; private spaces/features may require payment.
- Can I run without HyperLiquid API keys? Yes, for public market data. Trading requires private key.
- Are Node Info tools mandatory? No; they are optional and auto-disabled when unhealthy.
