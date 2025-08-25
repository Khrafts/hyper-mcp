# Execution Tools

Strategies

- TWAP: time-sliced execution for large orders
- VWAP: participation-based schedule by historical volume profile
- Iceberg: segmented visible sizes to minimize market footprint

Common tool(s)

- smart_order_execution { asset, side, total_size, algorithm, time_window_minutes?, slice_size?, max_participation_rate?, price_limit?, start_immediately? }

Operational notes

- Execution engine is initialized when HyperLiquid adapter is enabled
- Risk checks are performed before placing child orders
- Child orders and status are returned with an execution_id
