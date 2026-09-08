# Cost & Pricing Rules

## Principle

Benchmark cost must be reproducible and auditable.

## Implemented controls

A synchronous per-attempt budget ledger reserves a provider-contract maximum immediately before dispatch, after input preparation. It covers concurrent requests and retries; Stop is checked at the same boundary and wakes backoff waits. Unknown costs retain the full reservation. A missing or invalid bound fails closed, including the first request.

Settings → AI Providers → Pricing and hard budget basis saves dated, sourced pricing snapshots. Suites freeze the applied snapshot; later edits affect future suites only. Cached input is subtracted from total input before applying the uncached rate; Gemini reasoning usage is included in output usage. Partial token usage never becomes a complete token-cost estimate.

## Cost source precedence

1. provider-reported monetary cost when available and trustworthy
2. provider token usage × stored pricing snapshot
3. user-configured flat cost/request
4. unknown

Unknown must never be rendered as zero.

## Pricing snapshot

Each benchmark freezes provider/model/currency, rates, effective date, source note and any verified maximum-attempt contract. A flat observed cost is an estimate, not automatically a safe maximum.

Provider prices are time-sensitive. The implementation must verify current official pricing when creating/updating built-in presets and must not silently rewrite historical benchmark costs.

## Budget gate

Required before every network attempt, including retries:

- validate a finite, nonnegative budget
- account for confirmed cost and reservations for in-flight requests
- establish a safe upper bound for the next attempt and reserve it before dispatch
- do not dispatch if the reservation would exceed the cap; recheck Stop after backoff

When a safe bound is unavailable, a hard-cap run must not proceed as if spending were guaranteed. A user-entered estimate or the previous response cost alone is not proof of an upper bound. Any decision to offer an estimate-only mode requires explicit labeling and a separate product decision; it does not satisfy the hard-cap requirement.
