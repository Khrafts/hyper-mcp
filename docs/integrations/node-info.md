# Node Info Integration (Optional)

Overview

- Base URL: NODE_INFO_API_BASE_URL (default https://api.nodeinfo.hyperliquid.xyz)
- Authentication: none (public API)
- Behavior: On startup, the server health-checks this endpoint and only registers Node Info tools if healthy.

Common tools

- node_get_status { nodeId? }
- node_get_network_stats
- node_get_validators { page?, limit? }
- node_get_chain_metrics
- node_get_network_health
- node_monitor_performance { nodeId?, includeAlerts? }

Notes

- If the endpoint is unreachable, these tools are automatically disabled with a warning in logs.
- Useful for operational awareness and tying network health to execution decisions.
