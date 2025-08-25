# hyperliquid_get_user_fills

Description
Get recent fills/trades for the account.

Category
hyperliquid

Input schema

```
{
  "address?": "string" // optional wallet address
}
```

Example request

```
{
  "tool": "hyperliquid_get_user_fills",
  "arguments": {}
}
```

Response shape

- fills[] array for the account with trade details and metadata.
