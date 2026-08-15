# Cost & Pricing Rules

## Principle

Benchmark cost must be reproducible and auditable.

## Cost source precedence

1. provider-reported monetary cost when available and trustworthy
2. provider token usage × stored pricing snapshot
3. user-configured flat cost/request
4. unknown

Unknown must never be rendered as zero.

## Pricing snapshot

Each benchmark records a pricing snapshot with provider, model, currency, rates, effective date, and optional source note.

Provider prices are time-sensitive. The implementation must verify current official pricing when creating/updating built-in presets and must not silently rewrite historical benchmark costs.

## Budget gate

Before starting each new request:
- compute accumulated known cost
- estimate next-run cost if possible
- if starting the next request would violate the hard cap, do not start it

If cost is unknown, clearly state that the budget cap cannot be guaranteed from token pricing alone unless the user provides a flat/request estimate.
