# risk_resolve_alert

Description
Mark a risk alert as resolved.

Category
risk_management

Input schema

```
{
  "alertId": "string"
}
```

Example request

```
{
  "tool": "risk_resolve_alert",
  "arguments": { "alertId": "1756086219152_u296a4r5s" }
}
```

Response shape

- { resolved: boolean, message } with timestamp.
