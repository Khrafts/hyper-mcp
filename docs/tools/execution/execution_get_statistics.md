# execution_get_statistics

Description
Get execution engine performance statistics.

Category
execution

Input schema

```
{}
```

Example request

```
{
  "tool": "execution_get_statistics",
  "arguments": {}
}
```

Response shape

- statistics: averageExecutionTime, averageSlippage, successRate, totals.
