# hyperliquid_get_all_prices

Description
Get current market prices for all assets on HyperLiquid.

Category
hyperliquid

Input schema

```
{}
```

Example request

```
{
  "tool": "hyperliquid_get_all_prices",
  "arguments": {}
}
```

Example response

- Returns a JSON object with prices keyed by symbol and metadata (timestamp, count).

Notes

- Public endpoint; no authentication required for price query.
- Adapter applies rate limiting and retries.
