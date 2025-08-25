# GlueX Integration

Overview

- Base URL: GLUEX_API_BASE_URL (default https://router.gluex.xyz)
- Authentication: x-api-key header (GLUEX_API_KEY)

Capabilities

- Quotes and routes for cross-chain swaps and bridging
- Create transaction payloads for a selected route
- Track transaction status across chains
- Token metadata, prices, liquidity pools

Common tools

- gluex_get_supported_chains
- gluex_get_tokens { chainId?, search?, limit?, offset? }
- gluex_get_token_info { chainId, tokenAddress }
- gluex_get_quote { fromChainId, toChainId, fromTokenAddress, toTokenAddress, amount, slippage?, userAddress? }
- gluex_get_best_route { fromChainId, ... , userAddress }
- gluex_create_transaction { routeId, userAddress, slippage, deadline? }
- gluex_track_transaction { txHash, chainId }
- gluex_get_liquidity_pools { chainId?, tokenAddress? }
- gluex_get_token_price { chainId, tokenAddress }
- gluex_get_token_metrics { chainId, tokenAddress }
- gluex_get_multiple_prices { tokens: [{ chainId, tokenAddress }] }
- gluex_health_check

Notes

- Slippage is percentage; use conservative defaults.
- Some endpoints are rate limited (100 rpm by default).
- Errors are returned with structured messages; implement retries per backoff policy.
