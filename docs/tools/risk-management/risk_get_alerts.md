# risk_get_alerts

Description
Get active risk management alerts (optionally include resolved).

Category
risk_management

Input schema

```
{
  "includeResolved?": boolean // default false
}
```

Example request

```
{
  "tool": "risk_get_alerts",
  "arguments": { "includeResolved": true }
}
```

Response shape

- alerts[] with id, type, severity, message, symbol, currentValue, limit, timestamp, resolved; plus statistics.
