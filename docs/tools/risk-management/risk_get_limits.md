# risk_get_limits

Description
Get current risk management limits.

Category
risk_management

Input schema

```
{}
```

Example request

```
{
  "tool": "risk_get_limits",
  "arguments": {}
}
```

Response shape

- limits object with maxPositionSize, maxLeverage, maxDailyLoss, maxDrawdown, maxConcentration, varLimit, stopLossPercent, maxOrderValue.
