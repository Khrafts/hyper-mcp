# execution_get_order_status

Description
Get status of an execution order.

Category
execution

Input schema

```
{
  "orderId": "string"
}
```

Example request

```
{
  "tool": "execution_get_order_status",
  "arguments": { "orderId": "exec_123" }
}
```

Response shape

- Order fields: id, symbol, side, quantity, orderType, limitPrice, algorithm, status, created.
