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
  knownSubtotalUsd?: number;
  unknownCostRuns?: number;
  costPerSchemaValid?: number;
  projectedPer1000?: number;
  totalUsd?: number;
  avgPerRun?: number;
  costPerCorrect?: number;
}

export interface SuiteSummary {
  completedRuns?: number;
  exactPassRateNormalized?: number;
  avgLeafAccuracyNormalized?: number;
  rowAccuracyNormalized?: number;
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
  const attempted = runs.filter((r) => r.providerCalls > 0).length;
  const completed = runs.filter((r) => r.state !== "queued" && r.state !== "running");
  runs = completed;
  const succeeded = runs.filter((r) => r.state === "succeeded").length;
  const schemaInvalid = runs.filter((r) => r.state === "schema_invalid").length;
  const providerErrors = runs.filter((r) => r.state === "provider_error").length;
  const errors = runs.filter((r) => ["provider_error", "parse_error", "cancelled"].includes(r.state)).length;
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
  const knownCosts = runs.flatMap((r) => r.costUsd !== undefined ? [r.costUsd] : (r.attempts ?? []).flatMap((a) => a.costUsd === undefined ? [] : [a.costUsd]));
  const knownSubtotalUsd =
    knownCosts.length > 0 ? knownCosts.reduce((sum, cost) => sum + cost, 0) : undefined;
  const unknownCostRuns = runs.filter((r) => (r.providerCalls > 0 || r.pendingAttempt) && r.costUsd === undefined).length;
  const totalUsd = unknownCostRuns === 0 ? knownSubtotalUsd : undefined;
  const normalized = runs.filter((r) => r.exactMatchNormalized !== undefined);
  const leavesNormalized = runs.filter((r) => r.leafAccuracyNormalized !== undefined);
  const rowTotalNormalized = runs.reduce((sum, r) => sum + (r.rowTotalNormalized ?? 0), 0);

  return {
    requestedRuns,
    completedRuns: completed.length,
    attemptedRuns: attempted,
    succeededRuns: succeeded,
    schemaInvalidRuns: schemaInvalid,
    providerErrorRuns: providerErrors,
    parseableRuns: parseable.length,
    exactPassRate: completed.length > 0 && runs.some((r) => r.exactMatch !== undefined) ? exactMatches / completed.length : undefined,
    schemaValidRate: completed.length > 0 ? schemaValid / completed.length : undefined,
    exactPassRateNormalized: normalized.length > 0 ? normalized.filter((r) => r.exactMatchNormalized).length / completed.length : undefined,
    avgLeafAccuracyNormalized: leavesNormalized.length ? leavesNormalized.reduce((sum, r) => sum + r.leafAccuracyNormalized!, 0) / leavesNormalized.length : undefined,
    rowAccuracyNormalized: rowTotalNormalized > 0 ? runs.reduce((sum, r) => sum + (r.rowMatchedNormalized ?? 0), 0) / rowTotalNormalized : undefined,
    avgLeafAccuracy,
    rowAccuracy,
    consistencyRate: stability.consistencyRate,
    goldenStability: stability.goldenStability,
    uniqueVariants: variants.length,
    errorRate: requestedRuns > 0 ? errors / requestedRuns : undefined,
    latency: {
      avg: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : undefined,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      min: latencies[0],
      max: latencies[latencies.length - 1],
    },
    cost: {
      totalUsd,
      knownSubtotalUsd,
      unknownCostRuns,
      avgPerRun: totalUsd !== undefined && attempted > 0 ? totalUsd / attempted : undefined,
      costPerCorrect: totalUsd !== undefined && exactMatches > 0 ? totalUsd / exactMatches : undefined,
      costPerSchemaValid: totalUsd !== undefined && schemaValid > 0 ? totalUsd / schemaValid : undefined,
      projectedPer1000: totalUsd !== undefined && attempted > 0 ? totalUsd / attempted * 1000 : undefined,
    },
  };
}
