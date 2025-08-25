# gluex_health_check

Description
Check GlueX router adapter health and connectivity. Tests connection to the GlueX router endpoint and validates API access.

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
