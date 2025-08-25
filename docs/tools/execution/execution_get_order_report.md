# execution_get_order_report

Description
Get detailed execution report for an order (slices, fills, performance).

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
  "tool": "execution_get_order_report",
  "arguments": { "orderId": "exec_123" }
}
```

Response shape

- report with summary (progress, averagePrice, slice counts), performance metrics, and timing.
