# gluex_get_tokens

Description
Get supported tokens, optionally filtered by chain or search term.

Category
gluex

Input schema

```
{
  "chainId?": number,
  "search?": "string",
  "limit?": number (1-100, default 20),
  "offset?": number (>=0, default 0)
}
```

Example request

```
{
  "tool": "gluex_get_tokens",
  "arguments": { "chainId": 42161, "search": "USDC", "limit": 10 }
}
```

Response shape

- tokens[] array with pagination and filters echoed back.
