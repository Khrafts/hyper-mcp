# risk_update_limits

Description
Update risk management limits.

Category
risk_management

Input schema

```
{
  "maxPositionSize?": number (>= 1000),
  "maxLeverage?": number (1-50),
  "maxDailyLoss?": number (>= 100),
  "maxDrawdown?": number (0.01-1),
  "maxConcentration?": number (0.01-1),
  "varLimit?": number (>= 100),
  "stopLossPercent?": number (0.001-0.5),
  "maxOrderValue?": number (>= 100)
}
```

Example request

```
{
  "tool": "risk_update_limits",
  "arguments": { "maxLeverage": 8, "maxPositionSize": 150000 }
}
```

Response shape

- updatedLimits with formatted fields and the changes echoed.
