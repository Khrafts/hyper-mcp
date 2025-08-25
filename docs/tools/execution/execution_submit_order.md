# execution_submit_order

Description
Submit an order for algorithmic execution (TWAP, VWAP, Iceberg, Immediate).

Category
execution

Input schema

```
{
  "symbol": "string",
  "side": "buy|sell",
  "quantity": number (>= 0.0001),
  "orderType": "market|limit",
  "limitPrice?": number (>= 0.0001),
  "timeInForce?": "gtc|ioc|fok" (default gtc),
  "algorithm": "twap|vwap|iceberg|immediate",
  "algorithmParams": { ... } // duration, sliceCount, participation, sliceSize, randomization
}
```

Example request

```
{
  "tool": "execution_submit_order",
  "arguments": {
    "symbol": "BTC",
    "side": "buy",
    "quantity": 0.5,
    "orderType": "limit",
    "limitPrice": 45000,
    "algorithm": "twap",
    "algorithmParams": { "duration": 30, "sliceCount": 6 }
  }
}
```

Response shape

- Submission confirmation with orderId and echoed parameters, or validation error.
