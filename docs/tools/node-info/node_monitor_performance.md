# node_monitor_performance

Description
Get real-time node performance metrics and alerts.

Category
node_info

Input schema

```
{
  "nodeId?": "string",
  "includeAlerts?": boolean // default true
}
```

Example request

```
{
  "tool": "node_monitor_performance",
  "arguments": { "includeAlerts": true }
}
```

Response shape

- performance object with sync, resources, connectivity, throughput; networkOverall and alerts.
