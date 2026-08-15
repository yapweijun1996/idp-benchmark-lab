import { computeStability } from "../evaluation/metrics";
import { groupVariants } from "../evaluation/variants";
import type { BenchmarkRun } from "../storage/types";

export interface LatencyStats {
  avg?: number;
  p50?: number;
  p95?: number;
  min?: number;
  max?: number;
}

export interface CostStats {
  totalUsd?: number;
  avgPerRun?: number;
  costPerCorrect?: number;
}

export interface SuiteSummary {
  requestedRuns: number;
  attemptedRuns: number;
  succeededRuns: number;
  schemaInvalidRuns: number;
  providerErrorRuns: number;
  parseableRuns: number;
  /** exact golden matches / attempted runs (undefined when nothing attempted). */
  exactPassRate?: number;
  /** schema-valid runs / attempted runs. */
  schemaValidRate?: number;
  /** mean leaf accuracy over evaluated runs. */
  avgLeafAccuracy?: number;
  /** matched rows / golden rows over evaluated runs. */
  rowAccuracy?: number;
  consistencyRate?: number;
  goldenStability?: number;
  uniqueVariants: number;
  /** provider/parse failure runs / requested runs. */
  errorRate?: number;
  latency: LatencyStats;
  cost: CostStats;
}

/** Linear-interpolation percentile (standard definition). */
function percentile(sorted: number[], p: number): number | undefined {
  if (sorted.length === 0) {
    return undefined;
  }
  if (sorted.length === 1) {
    return sorted[0];
  }
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}

/**
 * Dashboard summary for a finished suite (EVALUATION.md / docs/METRICS.md).
 * All rate denominators follow the documented definitions.
 */
export function summarizeSuite(runs: BenchmarkRun[], requestedRuns: number): SuiteSummary {
  const attempted = runs.length;
  const succeeded = runs.filter((r) => r.state === "succeeded").length;
  const schemaInvalid = runs.filter((r) => r.state === "schema_invalid").length;
  const providerErrors = runs.filter((r) => r.state === "provider_error").length;
  const parseable = runs.filter((r) => r.outputHash !== undefined);

  const exactMatches = runs.filter((r) => r.exactMatch === true).length;
  const schemaValid = runs.filter((r) => r.schemaValid === true).length;

  const evaluated = runs.filter((r) => r.leafAccuracy !== undefined);
  const avgLeafAccuracy =
    evaluated.length > 0
      ? evaluated.reduce((sum, r) => sum + (r.leafAccuracy ?? 0), 0) / evaluated.length
      : undefined;

  let rowMatched = 0;
  let rowTotal = 0;
  for (const run of runs) {
    if (run.rowMatched !== undefined && run.rowTotal !== undefined) {
      rowMatched += run.rowMatched;
      rowTotal += run.rowTotal;
    }
  }
  const rowAccuracy = rowTotal > 0 ? rowMatched / rowTotal : undefined;

  const stability = computeStability(
    runs.map((r) => ({ outputHash: r.outputHash, exactMatch: r.exactMatch })),
    requestedRuns,
  );
  const variants = groupVariants(runs.map((r) => ({ runNumber: r.runNumber, outputHash: r.outputHash })));

  const latencies = runs
    .filter((r) => r.latencyMs !== undefined)
    .map((r) => r.latencyMs!)
    .sort((a, b) => a - b);
  const costRuns = runs.filter((r) => r.costUsd !== undefined);
  const totalUsd =
    costRuns.length > 0 ? costRuns.reduce((sum, r) => sum + (r.costUsd ?? 0), 0) : undefined;

  return {
    requestedRuns,
    attemptedRuns: attempted,
    succeededRuns: succeeded,
    schemaInvalidRuns: schemaInvalid,
    providerErrorRuns: providerErrors,
    parseableRuns: parseable.length,
    exactPassRate: attempted > 0 ? exactMatches / attempted : undefined,
    schemaValidRate: attempted > 0 ? schemaValid / attempted : undefined,
    avgLeafAccuracy,
    rowAccuracy,
    consistencyRate: stability.consistencyRate,
    goldenStability: stability.goldenStability,
    uniqueVariants: variants.length,
    errorRate: requestedRuns > 0 ? providerErrors / requestedRuns : undefined,
    latency: {
      avg: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : undefined,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      min: latencies[0],
      max: latencies[latencies.length - 1],
    },
    cost: {
      totalUsd,
      avgPerRun: totalUsd !== undefined && attempted > 0 ? totalUsd / attempted : undefined,
      costPerCorrect: totalUsd !== undefined && exactMatches > 0 ? totalUsd / exactMatches : undefined,
    },
  };
}
