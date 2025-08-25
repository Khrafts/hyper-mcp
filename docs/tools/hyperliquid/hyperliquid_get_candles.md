# hyperliquid_get_candles

Description
Get candlestick data for a specific asset.

Category
hyperliquid

Input schema

```
{
  "symbol": "string",
  "interval": "1m|5m|15m|1h|4h|1d",
  "startTime?": number, // ms
  "endTime?": number    // ms
}
```

Example request

```
{
  "tool": "hyperliquid_get_candles",
  "arguments": { "symbol": "BTC", "interval": "1h" }
}
```

Response shape

- candles[] with OHLCV and metadata (symbol, interval, timestamp).
