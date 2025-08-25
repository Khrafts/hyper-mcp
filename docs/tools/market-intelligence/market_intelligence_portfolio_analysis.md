# market_intelligence_portfolio_analysis

Description
Analyze portfolio performance, risk metrics, and generate recommendations.

Category
market_intelligence

Input schema

```
{
  "address?": "string"
}
```

Example request

```
{
  "tool": "market_intelligence_portfolio_analysis",
  "arguments": {}
}
```

Response shape

- portfolio metrics (totalValue, pnl, risk_summary) and recommendations.
