# hyperliquid_health_check

Description
Check HyperLiquid adapter health and connectivity.

Category
hyperliquid

Input schema

```
{}
```

Example request

```
{
  "tool": "hyperliquid_health_check",
  "arguments": {}
}
```

Response shape

- { healthy: boolean, latencyMs: number, details, errors, timestamp }

Notes

- Useful for readiness checks and diagnostics.
