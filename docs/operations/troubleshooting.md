# Troubleshooting & FAQ

## Common Issues

### General Issues

- **No tools listed**: Ensure adapters initialized; check logs for initialization errors
- **Node Info tools missing**: Endpoint failed health check; verify NODE_INFO_API_BASE_URL
- **Invalid tool arguments**: Follow each tool's JSON schema; refer to the tool pages
- **Rate limit errors**: Backoff and retry; reduce concurrency; increase CACHE_TTL_SECONDS
- **WebSocket disconnects**: Auto-reconnect is enabled; check network and WEBSOCKET_RECONNECT_DELAY_MS

### Community Protocol Issues

- **Community protocols not showing as tools**:
  - Verify `ENABLE_COMMUNITY_SYSTEM=true` is set
  - Check protocol files are in the `protocols/` directory (not `community-protocols/`)
  - Look for registration logs: `Registering community protocol tools`
  - Ensure protocol JSON is valid (run with `LOG_LEVEL=debug`)
  - Tool names follow pattern: `protocolName_endpointName` (e.g., `gluexDefi_getLiquidity`)

- **Protocol validation errors**:
  - Check required fields: `name`, `version`, `description`, `author`, `license`
  - Validate endpoint definitions have `path`, `method`, and `name`
  - Use the protocol template: `docs/community-protocols/template/protocol-template.json`

- **Tools generated but not accessible**:
  - Confirm `protocol:loaded` event is emitted (check debug logs)
  - Verify MCPServer is using the correct tool registry
  - Check tool count in startup logs matches expected count

Debugging tips

- Set ENABLE_DEBUG_LOGGING=true
- Use system_info and health_check tools to gather diagnostics
- Run with MOCK_EXTERNAL_APIS=true to isolate external dependencies in dev

FAQ

- Do I need GitBook paid plan? Public spaces are typically free; private spaces/features may require payment.
- Can I run without HyperLiquid API keys? Yes, for public market data. Trading requires private key.
- Are Node Info tools mandatory? No; they are optional and auto-disabled when unhealthy.
