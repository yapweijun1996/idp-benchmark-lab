import type { BenchmarkRun, NormalizationPolicy, NormalizedError } from "../storage/types";
import type { RunOutcome } from "./execute";
export function outcomeFields(outcome: RunOutcome, policy?: NormalizationPolicy): Partial<BenchmarkRun> {
  const evaluation = outcome.evaluation;
  return {
    exactMatchNormalized: evaluation?.exactMatchNormalized,
    leafAccuracyNormalized: evaluation?.leafAccuracyNormalized.accuracy,
    rowMatchedNormalized: evaluation?.rowComparisonNormalized.matchedRows,
    rowTotalNormalized: evaluation?.rowComparisonNormalized.goldenRows,
    fieldMismatchesNormalized: evaluation?.leafAccuracyNormalized.mismatches,
    normalizationPolicy: policy ?? { trimOuterWhitespace: false, normalizeLineEndings: false },
  };
}
export function attemptEvidence(number: number, startedAt: string, outcome?: RunOutcome, error?: NormalizedError): NonNullable<BenchmarkRun["attempts"]>[number] {
  return {
    number, startedAt, finishedAt: new Date().toISOString(), latencyMs: outcome?.latencyMs,
    raw: outcome?.response.raw, envelope: outcome?.response.envelope, usage: outcome?.response.usage,
    parseError: outcome?.response.parseError, costUsd: outcome?.costUsd, costSource: outcome?.costSource, error,
  };
}
