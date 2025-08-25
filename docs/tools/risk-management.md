# Risk Management Tools

Capabilities

- Position-level risk: size, value, unrealized PnL, daily VaR, drawdown
- Portfolio risk: exposures, leverage, concentration, correlation, overall risk score
- Limits: position size, drawdown, VAR confidence, leverage, and more

Common tool(s)

- get_risk_metrics { include_position_risk?, include_portfolio_risk?, include_var_calculation?, var_confidence_level?, var_time_horizon_days? }
- set_risk_limits { max_position_size?, max_portfolio_value?, max_daily_loss?, max_drawdown_percent?, position_concentration_limit?, leverage_limit?, daily_trade_limit?, enable_auto_deleveraging?, stop_loss_percent? }

Notes

- Risk checks are enforced by the risk engine prior to order submission
- Metrics can inform execution decisions and alerts
