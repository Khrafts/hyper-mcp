# gluex_create_transaction

Description
Create transaction data for executing a cross-chain route.

Category
gluex

Input schema

```
{
  "routeId": "string",
  "userAddress": "string",
  "slippage": number (0-50),
  "deadline?": number // unix timestamp
}
```

Example request

```
{
  "tool": "gluex_create_transaction",
  "arguments": {
    "routeId": "route_123",
    "userAddress": "0xabc...",
    "slippage": 0.8
  }
}
```

Response shape

- transaction payload with calldata, approvals info, and estimatedProcessingTime.
