# gluex_get_liquidity_pools

Description
Get liquidity pools information, optionally filtered by chain or token.

Category
gluex

Input schema

```
{
  "chainId?": number,
  "tokenAddress?": "string"
}
```

Example request

```
{
  "tool": "gluex_get_liquidity_pools",
  "arguments": { "chainId": 42161 }
}
```

Response shape

- pools[] array, count, and filters echo.
