# EVALUATION — Accuracy & Stability

## Principle

Accuracy = is output correct?  
Stability = does same configuration keep producing same result?

Never collapse them into one score.

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
`frequency_of_modal_output_hash / completed_parseable_runs`

A model may have 100% consistency and 0% accuracy.

### Golden Stability
`exact_golden_matches / total_requested_runs`

Includes provider/parse failures in denominator.

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
