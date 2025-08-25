# gluex_get_best_route

Description
Get the best routing option for a cross-chain swap.

Category
gluex

Input schema

```
{
  "fromChainId": number,
  "toChainId": number,
  "fromTokenAddress": "string",
  "toTokenAddress": "string",
  "amount": "string",
  "slippage": number (0-50),
  "userAddress": "string"
}
```

Example request

```
{
  "tool": "gluex_get_best_route",
  "arguments": {
    "fromChainId": 42161,
    "toChainId": 8453,
    "fromTokenAddress": "0xA0b8...",
    "toTokenAddress": "0xSome...",
    "amount": "1000000",
    "slippage": 1.0,
    "userAddress": "0xabc..."
  }
}
```

Response shape

- bestRoute with steps, time, totalFee, and confidence metrics.
