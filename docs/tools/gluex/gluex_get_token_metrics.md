# gluex_get_token_metrics

Description
Get comprehensive analytics and metrics for a token.

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
  "tool": "gluex_get_token_metrics",
  "arguments": { "chainId": 42161, "tokenAddress": "0xA0b8..." }
}
```

Response shape

- metrics object with volume, volatility, holders, and exchanges coverage.
