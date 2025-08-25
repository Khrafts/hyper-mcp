# Using HyperLiquid MCP with Claude Desktop

This example shows how to use the HyperLiquid MCP Server with Claude Desktop for AI-powered trading.

## Setup Complete ✅

After following the [INSTALL.md](../INSTALL.md) guide, your `claude_desktop_config.json` should look like:

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hyperliquid-mcp-server",
      "env": {
        "HYPERLIQUID_PRIVATE_KEY": "0x1234...",
        "HYPERLIQUID_USER_ADDRESS": "0xYour...",
        "HYPERLIQUID_TESTNET": "true"
      }
    }
  }
}
```

## Example Conversations

### 1. Account Management

**You**: "Check my HyperLiquid account balance and positions"

**Claude** (using MCP tools):

```
I'll check your HyperLiquid account information.

Using tool: hyperliquid_get_account_info

Your HyperLiquid Account Status:
• Account Value: $2,450.00
• Available Balance: $1,890.00
• Margin Used: $560.00
• Open Positions: 2

Current Positions:
1. BTC-USD: +0.05 BTC ($5,600 value)
2. ETH-USD: -2.0 ETH ($6,800 value)

Your account is healthy with 77% available balance.
```

### 2. Market Analysis

**You**: "What's the current BTC price and recent price action?"

**Claude**:

```
Let me get the current BTC market data for you.

Using tools: hyperliquid_get_all_prices, hyperliquid_get_candles

Current BTC Market Data:
• Price: $67,450.00 (+2.3% today)
• 24h High: $68,200.00
• 24h Low: $65,800.00
• Volume: $1.2B

Recent Price Action (1H candles):
• Strong upward momentum over last 4 hours
• Broke resistance at $67,000
• RSI: 68 (approaching overbought)
• Support level: $66,500

The price action suggests continued bullish momentum with potential resistance around $68,200.
```

### 3. Trading Operations

**You**: "I want to buy 0.1 BTC at $66,500 if the price dips. Set up a limit order."

**Claude**:

```
I'll place a limit buy order for 0.1 BTC at $66,500.

Using tool: hyperliquid_place_limit_order

Order Details:
• Side: BUY
• Amount: 0.1 BTC
• Price: $66,500.00
• Type: Limit (Good Till Canceled)
• Estimated Value: $6,650.00

Checking your account... ✅ Sufficient balance available

Placing order... ✅ Order placed successfully!

Order ID: #789123
Status: Open (waiting for price to reach $66,500)

I'll monitor this order. The current price is $67,450, so you're looking for a $950 dip to fill.
```

### 4. Risk Management

**You**: "Check if my portfolio has any risk issues and set up some alerts"

**Claude**:

```
Let me analyze your portfolio risk profile.

Using tools: risk_get_portfolio_analysis, risk_check_order

Portfolio Risk Analysis:
• Overall Risk Score: Medium (6/10)
• Concentration Risk: ⚠️ High BTC exposure (65% of portfolio)
• Leverage: Low (1.2x) ✅
• Diversification: Poor (only 2 assets) ⚠️

Recommendations:
1. Consider reducing BTC concentration below 50%
2. Add exposure to other assets (ETH, SOL, etc.)
3. Your leverage is conservative - good for risk management

Setting up alerts:
✅ Portfolio value drops below $2,200 (-10%)
✅ BTC position exceeds 70% of portfolio
✅ Any single position loses more than 5% in 1 hour

Alerts configured and active. You'll be notified if any triggers occur.
```

### 5. Advanced Market Intelligence

**You**: "Give me a comprehensive market report before I make my next trade"

**Claude**:

```
I'll generate a comprehensive market intelligence report for you.

Using tools: market_intelligence_report, market_intelligence_sentiment

📊 HyperLiquid Market Intelligence Report

Market Overview:
• Total Volume (24h): $2.4B (+15% vs yesterday)
• Active Traders: 12,500 (+8%)
• Top Movers: HYPE (+18%), SOL (+12%), ETH (+8%)

Sentiment Analysis:
• Overall Market Sentiment: Bullish (78/100)
• Social Media Buzz: High activity around DeFi tokens
• Fear & Greed Index: 72 (Greed territory)

Technical Indicators:
• BTC: Strong uptrend, RSI approaching overbought
• ETH: Consolidating, potential breakout above $3,800
• HYPE: Parabolic move, consider taking profits

Trading Opportunities:
1. ETH breakout play above $3,800 (70% probability)
2. SOL pullback entry around $210 (good risk/reward)
3. BTC profit-taking near $68,500 resistance

Risk Factors:
• High sentiment could indicate local top
• Weekend trading typically sees lower volume
• Fed meeting next week may increase volatility

Recommendation: Consider partial profit-taking on BTC and look for ETH breakout setup.
```

## Available Tools

Your Claude Desktop now has access to 32+ HyperLiquid tools:

**Trading Tools:**

- `hyperliquid_place_limit_order` - Place limit orders
- `hyperliquid_place_market_order` - Place market orders
- `hyperliquid_cancel_order` - Cancel existing orders
- `hyperliquid_get_open_orders` - View open orders
- `hyperliquid_get_user_fills` - View trade history

**Market Data Tools:**

- `hyperliquid_get_all_prices` - Current market prices
- `hyperliquid_get_order_book` - Order book depth
- `hyperliquid_get_trades` - Recent trade data
- `hyperliquid_get_candles` - Historical price data
- `hyperliquid_get_assets` - Available trading pairs

**Account Tools:**

- `hyperliquid_get_account_info` - Account balance and positions
- `hyperliquid_health_check` - Connection status
- `hyperliquid_websocket_status` - Real-time data status

**Analysis Tools:**

- `market_intelligence_report` - Comprehensive market analysis
- `market_intelligence_sentiment` - Sentiment analysis
- `risk_get_portfolio_analysis` - Portfolio risk assessment
- `risk_get_alerts` - Active risk alerts

## Tips for Best Results

1. **Be Specific**: "Buy 0.1 BTC at $66,500" is better than "buy some BTC"
2. **Ask for Analysis**: Claude can provide detailed market insights before trades
3. **Set Guardrails**: Ask Claude to check risk before placing large orders
4. **Use Testnet First**: Always test new strategies on testnet
5. **Monitor Regularly**: Ask for account updates and position reviews

## Safety Features

- **Risk Checks**: Claude will warn about risky trades
- **Balance Verification**: Orders check available balance first
- **Position Limits**: Configurable maximum position sizes
- **Stop Losses**: Can set up automated risk management
- **Testnet Mode**: Safe environment for testing strategies

---

**Your AI trading assistant is ready!** Ask Claude anything about HyperLiquid trading, market analysis, or portfolio management. 🚀
