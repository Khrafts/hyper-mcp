# hyperliquid_cancel_order

Description
Cancel an existing order (requires private key).

Category
hyperliquid

Input schema

```
{
  "assetId": number,
  "orderId": number
}
```

Example request

```
{
  "tool": "hyperliquid_cancel_order",
  "arguments": { "assetId": 1, "orderId": 123456 }
}
```

Response shape

- Cancellation result with orderId and status, or error.
