# hyperliquid_get_open_orders

Description
Get open orders for the account.

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
  "tool": "hyperliquid_get_open_orders",
  "arguments": {}
}
```

Response shape

- orders[] array for the account and metadata.
