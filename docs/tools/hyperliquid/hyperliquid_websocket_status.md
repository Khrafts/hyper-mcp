# hyperliquid_websocket_status

Description
Get WebSocket connection status and active subscriptions.

Category
hyperliquid

Input schema

```
{}
```

Example request

```
{
  "tool": "hyperliquid_websocket_status",
  "arguments": {}
}
```

Response shape

- Status object with connection state and subscriptions, plus timestamp.
