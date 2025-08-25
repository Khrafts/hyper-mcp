# risk_get_statistics

Description
Get risk management system statistics and performance metrics.

Category
risk_management

Input schema

```
{}
```

Example request

```
{
  "tool": "risk_get_statistics",
  "arguments": {}
}
```

Response shape

- statistics: totalAlerts, activeAlerts, resolvedAlerts, resolutionRate, portfolioHealth, alertsByType, alertsBySeverity.
