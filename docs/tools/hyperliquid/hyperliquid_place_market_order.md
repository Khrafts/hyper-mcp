# hyperliquid_place_market_order

Description
Place a market order on HyperLiquid (requires private key).

Category
hyperliquid

Input schema

```
{
  "assetId": number,
  "isBuy": boolean,
  "size": "string",
  "reduceOnly?": boolean
}
```

Example request

```
{
  "tool": "hyperliquid_place_market_order",
  "arguments": {
    "assetId": 1,
    "isBuy": true,
    "size": "0.5"
  }
}
```

Response shape

- Placement result or structured error with context and timestamp.

Notes

- Requires HYPERLIQUID_SECRET_KEY and HYPERLIQUID_USER_ADDRESS.
- Respect risk rules and position limits.
