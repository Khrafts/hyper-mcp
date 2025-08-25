# hyperliquid_get_order_book

Description
Get order book data for a specific asset.

Category
hyperliquid

Input schema

```
{
  "symbol": "string" // e.g. "BTC"
}
```

Example request

```
{
  "tool": "hyperliquid_get_order_book",
  "arguments": { "symbol": "BTC" }
}
```

Response shape

- orderBook with bids/asks and metadata (symbol, timestamp).

Errors

- Missing or invalid symbol -> validation error.
