# node_get_chain_metrics

Description
Get blockchain metrics including height, transactions, and volume.

Category
node_info

Input schema

```
{}
```

Example request

```
{
  "tool": "node_get_chain_metrics",
  "arguments": {}
}
```

Response shape

- chainMetrics with blockchain, transactions, accounts, and volume metrics.
