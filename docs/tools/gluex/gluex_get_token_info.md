# gluex_get_token_info

Description
Get detailed information about a specific token.

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
  "tool": "gluex_get_token_info",
  "arguments": { "chainId": 42161, "tokenAddress": "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" }
}
```

Response shape

- tokenInfo object or found=false metadata if not found.
