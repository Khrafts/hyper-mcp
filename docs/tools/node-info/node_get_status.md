# node_get_status

Description
Get detailed status information for a HyperLiquid network node.

Category
node_info

Input schema

```
{
  "nodeId?": "string"
}
```

Example request

```
{
  "tool": "node_get_status",
  "arguments": {}
}
```

Response shape

- nodeStatus with sync, connectivity, performance, uptime, and metadata.
