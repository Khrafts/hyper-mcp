# System Tools

Built-in utilities for diagnostics and monitoring.

- health_check: Returns overall health, including adapters, tools, sessions, and community status if initialized.
- system_info: Returns server info, uptime, Node version, memory usage, and registry/session stats.
- list_community_protocols: Lists loaded community protocols and tools (if community system is initialized).

Usage examples

```
{
  "tool": "health_check"
}
```

```
{
  "tool": "system_info"
}
```
