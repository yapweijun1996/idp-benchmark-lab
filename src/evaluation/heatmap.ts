import type { BenchmarkRun } from "../storage/types";

export interface FieldValueFrequency {
  expected: unknown;
  actual: unknown;
  count: number;
}

export interface FieldHeat {
  path: string;
  mismatchedRuns: number;
  evaluatedRuns: number;
  /** mismatchedRuns / evaluatedRuns. */
  mismatchRate: number;
  /** Observed (expected → actual) value pairs with frequencies. */
  valueFrequencies: FieldValueFrequency[];
}

function valueKey(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Field accuracy heatmap (SPEC FR-016, EVALUATION.md field stability):
 * aggregates per-run strict leaf mismatches into per-path mismatch rates and
 * observed value frequencies, sorted by mismatch rate.
 */
export function buildFieldHeatmap(runs: BenchmarkRun[]): FieldHeat[] {
  const evaluated = runs.filter((r) => r.fieldMismatches !== undefined);
  const byPath = new Map<string, FieldHeat>();
  for (const run of evaluated) {
    for (const mismatch of run.fieldMismatches ?? []) {
      let heat = byPath.get(mismatch.path);
      if (!heat) {
        heat = {
          path: mismatch.path,
          mismatchedRuns: 0,
          evaluatedRuns: 0,
          mismatchRate: 0,
          valueFrequencies: [],
        };
        byPath.set(mismatch.path, heat);
      }
      heat.mismatchedRuns += 1;
      const key = valueKey(mismatch.expected) + "|" + valueKey(mismatch.actual);
      const existing = heat.valueFrequencies.find(
        (f) => valueKey(f.expected) + "|" + valueKey(f.actual) === key,
      );
      if (existing) {
        existing.count += 1;
      } else {
        heat.valueFrequencies.push({
          expected: mismatch.expected,
          actual: mismatch.actual,
          count: 1,
        });
      }
    }
  }
  const heats = [...byPath.values()].map((heat) => ({
    ...heat,
    evaluatedRuns: evaluated.length,
    mismatchRate: evaluated.length > 0 ? heat.mismatchedRuns / evaluated.length : 0,
  }));
  heats.sort((a, b) => b.mismatchRate - a.mismatchRate || a.path.localeCompare(b.path));
  return heats;
}
