# gluex_get_multiple_prices

Description
Get price data for multiple tokens at once.

Category
gluex

Input schema

```
{
  "tokens": [ { "chainId": number, "tokenAddress": "string" }, ... ] // 1-50 items
}
```

Example request

```
{
  "tool": "gluex_get_multiple_prices",
  "arguments": {
    "tokens": [
      { "chainId": 42161, "tokenAddress": "0xA0b8..." },
      { "chainId": 10, "tokenAddress": "0x7f5c..." }
    ]
  }
}
```

Response shape

- prices[] array corresponding to requested tokens.
