# Cost & Pricing Rules

## Principle

Benchmark cost must be reproducible and auditable.

## Current implementation gaps

The runner estimates the next cost from the most recent successful extraction outcome that returned a known cost, permits the first/unknown-cost request, and has no reservation for concurrent requests. Retries bypass the budget/Stop gate. The UI's current "Hard budget cap" label therefore overstates its protection (TASK-059/060).

Pricing is reread for each response and its applied basis is not retained with the suite (TASK-064). Pricing records and `ProviderConfig.pricingSnapshotId` exist, but the Settings UI does not provide a reliable pricing-management path and saving a provider can discard an existing association. Failed parsing can discard usage before pricing is calculated (TASK-063). These are open defects, not accepted alternatives to the rules below. See the [review](reviews/2026-09-08-production-readiness.md).

## Cost source precedence

1. provider-reported monetary cost when available and trustworthy
2. provider token usage × stored pricing snapshot
3. user-configured flat cost/request
4. unknown

Unknown must never be rendered as zero.

## Pricing snapshot

Each benchmark must freeze and retain a pricing snapshot with provider, model, currency, rates, effective date, and optional source note. The current implementation does not yet do this.

Provider prices are time-sensitive. The implementation must verify current official pricing when creating/updating built-in presets and must not silently rewrite historical benchmark costs.

## Budget gate

Required before every network attempt, including retries:

- validate a finite, nonnegative budget
- account for confirmed cost and reservations for in-flight requests
- establish a safe upper bound for the next attempt and reserve it before dispatch
- do not dispatch if the reservation would exceed the cap; recheck Stop after backoff

When a safe bound is unavailable, a hard-cap run must not proceed as if spending were guaranteed. A user-entered estimate or the previous response cost alone is not proof of an upper bound. Any decision to offer an estimate-only mode requires explicit labeling and a separate product decision; it does not satisfy the hard-cap requirement.
