# market_intelligence_report

Description
Generate comprehensive market analysis report for a trading symbol.

Category
market_intelligence

Input schema

```
{
  "symbol": "string"
}
```

Example request

```
{
  "tool": "market_intelligence_report",
  "arguments": { "symbol": "BTC" }
}
```

Response shape

- report with summary (current_price, 24h change, overall_trend, risk_level, recommendation) and technical_analysis.
