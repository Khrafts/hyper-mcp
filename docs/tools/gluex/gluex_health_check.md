# gluex_health_check

Description
Check GlueX adapter health and connectivity.

Category
gluex

Input schema

```
{}
```

Example request

```
{
  "tool": "gluex_health_check",
  "arguments": {}
}
```

Response shape

- { healthy: boolean, latencyMs: number, details, errors, timestamp }
