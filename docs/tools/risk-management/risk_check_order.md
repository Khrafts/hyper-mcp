# risk_check_order

Description
Check if an order meets risk management criteria before execution.

Category
risk_management

Input schema

```
{
  "symbol": "string",
  "side": "buy|sell",
  "quantity": number (>= 0.0001),
  "price?": number (>= 0.0001)
}
```

Example request

```
{
  "tool": "risk_check_order",
  "arguments": { "symbol": "BTC", "side": "buy", "quantity": 0.2 }
}
```

Response shape

- approved flag, warnings[], rejectionReasons[], and riskMetrics (newPortfolioVar, concentrationImpact, leverageImpact, liquidationRisk).
