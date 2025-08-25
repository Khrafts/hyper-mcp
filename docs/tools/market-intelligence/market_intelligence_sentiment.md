# market_intelligence_sentiment

Description
Get overall market sentiment analysis across multiple symbols.

Category
market_intelligence

Input schema

```
{
  "symbols": ["string", ...] // 1-10 symbols
}
```

Example request

```
{
  "tool": "market_intelligence_sentiment",
  "arguments": { "symbols": ["BTC", "ETH", "SOL"] }
}
```

Response shape

- sentiment with overall, by_symbol { symbol -> sentiment, confidence }, and market_insights.
