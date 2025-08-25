# execution_cancel_order

Description
Cancel an execution order.

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
  "tool": "execution_cancel_order",
  "arguments": { "orderId": "exec_123" }
}
```

Response shape

- { success: boolean } with timestamp and orderId.
