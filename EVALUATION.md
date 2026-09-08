# EVALUATION — Accuracy & Stability

## Principle

Accuracy = is output correct?  
Stability = does same configuration keep producing same result?

Never collapse them into one score.

## Implementation status

Strict and normalized exact/leaf/ordered-row metrics and normalization policy persist separately and appear in result views and exports. Malformed output is parse_error with redacted envelope, usage and attempt timing.

Exact/schema-valid rates use terminal completed runs. Error rate includes provider_error, parse_error and cancelled over requested runs. Unknown cost is distinct from the known subtotal, including partial retry evidence. Totals and derived cost rates remain unknown when any attempted/interrupted run has unknown cost. Cost per schema-valid output and projected cost per 1,000 are exposed.

## Denominator definitions

- `requested_runs`: the user-selected preset (5/10/20/50/100), fixed at suite creation.
- `attempted_runs`: runs with at least one recorded dispatch. A pendingAttempt after interruption is explicitly uncertain and is included in unknown-cost reporting.
- `completed_runs`: runs that reached a terminal state (`succeeded`, `schema_invalid`, `provider_error`, `parse_error`, `cancelled`). Queued/running runs are not completed.
- `parseable_runs`: runs whose response parsed to JSON (`succeeded` + `schema_invalid`).
- `provider_calls`: dispatches recorded by completed attempt processing, including retries. A pendingAttempt journal entry records a possible additional call after interruption; it must not be silently counted as a confirmed receipt.
- Any rate whose denominator is zero displays `—` (no number), never `0`.

## Canonical JSON

- parse JSON
- sort object keys recursively
- preserve array order
- preserve strings and `null`
- preserve numeric/string type
- deterministic serialization

Do not reorder `row_data`.

## Metrics

### Exact Pass Rate
`exact_golden_matches / completed_runs`

### Schema Valid Rate
`schema_valid_runs / completed_runs`

### Leaf Field Accuracy
Flatten Golden JSON to leaf paths and count exact matches.

### Row Accuracy
MVP ordered-row exact comparison. Also report missing/extra/duplicate rows.

### Consistency Rate
`frequency_of_modal_output_hash / parseable_runs`

A model may have 100% consistency and 0% accuracy.

### Golden Stability
`exact_golden_matches / requested_runs`

Includes provider/parse failures in denominator. Runs never started after Stop or budget-stop also count toward the denominator (they are not exact matches).

### Unique Variants
Count distinct canonical output hashes. Store count, percentage, representative run, diff vs Golden.

## Strict vs normalized

Strict is character-sensitive:
- `0004131999` != `4131999`
- `M650 M WL WHITE` != `M650 MWL WHITE`
- `null` != `0`

Normalized metrics may only apply documented conservative transformations such as trimming outer whitespace or line-ending normalization. Do not normalize identifiers/model numbers/amounts in a way that hides errors.

## Field stability

For each Golden path, show observed value frequencies, e.g.:

```text
row_data[1].remark
  null           82%
  "920-007596"   18%
```

## Cost

Show total, average/run, cost/schema-valid, cost/exact-correct, and projected cost per 1,000 documents. Unknown remains unknown.

## Latency

Show average, median/p50, p95, min, max. Label failed-run latency separately when useful.

## Motivating instability

Manual Golden Popular PO experiments observed:
- Vendor Article No. sometimes mapped to `remark`
- after prompt changes, sometimes appended to `stock_desc`
- `M650 M WL WHITE` sometimes became `M650 MWL WHITE`
- structured-output configuration changed response shape

This proves full configuration identity matters, not only model name.
