# gluex_get_token_price

Description
Get current price data for a specific token.

Category
gluex

Input schema

```
{
  "chainId": number,
  "tokenAddress": "string"
}
```

Example request

```
{
  "tool": "gluex_get_token_price",
  "arguments": { "chainId": 42161, "tokenAddress": "0xA0b8..." }
}
```

Response shape

- priceData with price, liquidity, and source metadata.
