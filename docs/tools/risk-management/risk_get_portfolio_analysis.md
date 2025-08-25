# risk_get_portfolio_analysis

Description
Get comprehensive portfolio risk analysis including VaR, stress tests, and correlations.

Category
risk_management

Input schema

```
{
  "userAddress?": "string"
}
```

Example request

```
{
  "tool": "risk_get_portfolio_analysis",
  "arguments": {}
}
```

Response shape

- portfolio summary (totalValue, riskMetrics, positions[...], stressTests[...]) with formatted values.
