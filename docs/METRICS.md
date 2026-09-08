# Metrics Reference

This table is the target metric contract. Current persisted/displayed metrics have gaps: normalized scores are discarded, malformed output loses evidence, exact/schema rates use all stored run rows rather than terminal runs, error rate counts only provider errors, and cost exposes only total/average/exact-correct values. [EVALUATION.md](../EVALUATION.md) is the canonical definition and distinguishes it from current summary behavior; [TASK.md](../TASK.md) tracks remediation.

| Metric | Meaning |
|---|---|
| Exact Pass Rate | Canonical output exactly equals Golden |
| Schema Valid Rate | Parsed output passes requested schema |
| Leaf Accuracy | Golden leaf values matched |
| Row Accuracy | Golden rows exactly matched |
| Consistency Rate | Frequency of modal output variant |
| Golden Stability | Exact correct runs / requested runs |
| Unique Variants | Number of distinct canonical outputs |
| Error Rate | failed/provider/parse runs / requested runs |

Latency: avg, p50, p95, min, max.

Cost: total, average/run, cost/schema-valid, cost/exact-correct, projected cost per 1,000.

Suggested warning:

If consistency is high but accuracy low, show **Stable but wrong**.

If accuracy is high but consistency low, show **Often correct but unstable; inspect variants and field drift**.
