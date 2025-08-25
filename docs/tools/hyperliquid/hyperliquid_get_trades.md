# hyperliquid_get_trades

Description
Get recent trades for a specific asset.

Category
hyperliquid

Input schema

```
{
  "symbol": "string" // e.g. "ETH"
}
```

Example request

```
{
  "tool": "hyperliquid_get_trades",
  "arguments": { "symbol": "ETH" }
}
```

Response shape

- trades[] array with price, size, side, timestamp and metadata.

Errors

- Missing or invalid symbol -> validation error.
