# Metrics Reference

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
