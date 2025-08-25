# hyperliquid_get_account_info

Description
Get account information including balances and positions.

Category
hyperliquid

Input schema

```
{
  "address?": "string" // optional wallet address (uses default if omitted)
}
```

Example request

```
{
  "tool": "hyperliquid_get_account_info",
  "arguments": {}
}
```

Response shape

- accountInfo object returned by HyperLiquid API (positions, balances, margins) with metadata.

Errors

- Adapter/API error is surfaced with message; request still returns structured error content.
