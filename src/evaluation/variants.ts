export interface VariantInput {
  runNumber: number;
  outputHash?: string;
}

export interface VariantGroup {
  hash: string;
  count: number;
  percentage: number;
  /** Run numbers belonging to this variant, in run order. */
  runNumbers: number[];
  /** Lowest run number — the representative for diff inspection. */
  representativeRunNumber: number;
}

/**
 * Groups parseable runs by canonical output hash (SPEC FR-015).
 * Only runs with an output hash count; failures belong to no variant.
 */
export function groupVariants(runs: VariantInput[]): VariantGroup[] {
  const parseable = runs.filter((r) => r.outputHash !== undefined);
  const counts = new Map<string, number[]>();
  for (const run of parseable) {
    const list = counts.get(run.outputHash!) ?? [];
    list.push(run.runNumber);
    counts.set(run.outputHash!, list);
  }
  const groups: VariantGroup[] = [];
  for (const [hash, runNumbers] of counts) {
    groups.push({
      hash,
      count: runNumbers.length,
      percentage: parseable.length > 0 ? runNumbers.length / parseable.length : 0,
      runNumbers,
      representativeRunNumber: Math.min(...runNumbers),
    });
  }
  groups.sort((a, b) => b.count - a.count || a.representativeRunNumber - b.representativeRunNumber);
  return groups;
}
