# execution_list_active_orders

Description
List all active execution orders.

Category
execution

Input schema

```
{}
```

Example request

```
{
  "tool": "execution_list_active_orders",
  "arguments": {}
}
```

Response shape

- activeOrders[] array with id, symbol, side, quantity, algorithm, status, created, and totals.
