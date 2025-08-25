# gluex_get_quote

Description
Get routing quote for cross-chain token swap.

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
  "slippage?": number (0-50, default 0.5),
  "userAddress?": "string"
}
```

Example request

```
{
  "tool": "gluex_get_quote",
  "arguments": {
    "fromChainId": 42161,
    "toChainId": 8453,
    "fromTokenAddress": "0xA0b8...",
    "toTokenAddress": "0xSome...",
    "amount": "1000000",
    "slippage": 0.8
  }
}
```

Response shape

- Quote payload with route options, fees, and ETA; hasQuote flag indicates availability.

Errors

- Invalid route request -> validation_errors array with details.
