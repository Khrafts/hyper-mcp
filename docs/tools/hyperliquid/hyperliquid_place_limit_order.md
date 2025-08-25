# hyperliquid_place_limit_order

Description
Place a limit order on HyperLiquid (requires private key).

Category
hyperliquid

Input schema

```
{
  "assetId": number,
  "isBuy": boolean,
  "price": "string",
  "size": "string",
  "timeInForce?": "Alo|Ioc|Gtc",
  "reduceOnly?": boolean
}
```

Example request

```
{
  "tool": "hyperliquid_place_limit_order",
  "arguments": {
    "assetId": 1,
    "isBuy": false,
    "price": "42000",
    "size": "0.3",
    "timeInForce": "Gtc"
  }
}
```

Response shape

- Placement result with order ID and details, or error.

Notes

- Validate price and size formatting per exchange requirements.
