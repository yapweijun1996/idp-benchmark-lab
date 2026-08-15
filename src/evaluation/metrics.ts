import type { NormalizationPolicy } from "../storage/types";
import { canonicalJson } from "./canonical";
import { flattenLeaves } from "./flatten";
import { normalizeDeep, normalizeValue } from "./normalize";

export interface LeafMismatch {
  path: string;
  expected: unknown;
  actual: unknown;
}

export interface LeafAccuracy {
  totalGoldenLeaves: number;
  matchedLeaves: number;
  /** Undefined when the golden has no leaves (division guard). */
  accuracy?: number;
  mismatches: LeafMismatch[];
}

export interface RowComparison {
  goldenRows: number;
  outputRows: number;
  matchedRows: number;
  missingRows: number;
  extraRows: number;
  /** Output contains two adjacent identical rows (model duplicated a row). */
  duplicateDetected: boolean;
}

export interface RunEvaluation {
  exactMatch: boolean;
  exactMatchNormalized: boolean;
  leafAccuracy: LeafAccuracy;
  leafAccuracyNormalized: LeafAccuracy;
  rowComparison: RowComparison;
  rowComparisonNormalized: RowComparison;
}

export interface EvaluationOptions {
  normalizationPolicy?: NormalizationPolicy;
}

const EMPTY_LEAF: LeafAccuracy = { totalGoldenLeaves: 0, matchedLeaves: 0, mismatches: [] };
const EMPTY_ROWS: RowComparison = {
  goldenRows: 0,
  outputRows: 0,
  matchedRows: 0,
  missingRows: 0,
  extraRows: 0,
  duplicateDetected: false,
};

/**
 * Full per-run evaluation (EVALUATION.md): strict and normalized metrics are
 * separate; normalization never hides OCR/identifier errors.
 */
export function evaluateOutput(
  golden: unknown,
  output: unknown,
  options: EvaluationOptions = {},
): RunEvaluation {
  const policy = options.normalizationPolicy;
  const goldenLeaves = flattenLeaves(golden);
  const outputLeaves = flattenLeaves(output);

  return {
    exactMatch: canonicalJson(golden) === canonicalJson(output),
    exactMatchNormalized:
      canonicalJson(normalizeDeep(golden, policy)) === canonicalJson(normalizeDeep(output, policy)),
    leafAccuracy: compareLeaves(goldenLeaves, outputLeaves, undefined),
    leafAccuracyNormalized: compareLeaves(goldenLeaves, outputLeaves, policy),
    rowComparison: compareRows(golden, output, undefined),
    rowComparisonNormalized: compareRows(golden, output, policy),
  };
}

function compareLeaves(
  goldenLeaves: Map<string, unknown>,
  outputLeaves: Map<string, unknown>,
  policy: NormalizationPolicy | undefined,
): LeafAccuracy {
  if (goldenLeaves.size === 0) {
    return { ...EMPTY_LEAF };
  }
  let matched = 0;
  const mismatches: LeafMismatch[] = [];
  for (const [path, expected] of goldenLeaves) {
    const actual = outputLeaves.get(path);
    const expectedNorm = normalizeValue(expected, policy);
    const actualNorm = normalizeValue(actual, policy);
    if (expectedNorm === actualNorm) {
      matched += 1;
    } else {
      mismatches.push({ path, expected, actual });
    }
  }
  return {
    totalGoldenLeaves: goldenLeaves.size,
    matchedLeaves: matched,
    accuracy: matched / goldenLeaves.size,
    mismatches,
  };
}

/** Collects row arrays (arrays whose elements are objects) by path. */
function collectRowArrays(value: unknown, path: string, out: Map<string, unknown[]>): void {
  if (Array.isArray(value)) {
    if (value.every((item) => item !== null && typeof item === "object" && !Array.isArray(item))) {
      out.set(path, value);
    }
    value.forEach((child, index) => collectRowArrays(child, path + "[" + index + "]", out));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      collectRowArrays((value as Record<string, unknown>)[key], path ? path + "." + key : key, out);
    }
  }
}

function compareRows(golden: unknown, output: unknown, policy: NormalizationPolicy | undefined): RowComparison {
  const goldenRows = new Map<string, unknown[]>();
  const outputRows = new Map<string, unknown[]>();
  collectRowArrays(golden, "", goldenRows);
  collectRowArrays(output, "", outputRows);
  if (goldenRows.size === 0) {
    return { ...EMPTY_ROWS };
  }

  let matched = 0;
  let missing = 0;
  let extra = 0;
  let duplicates = false;
  let totalGolden = 0;
  let totalOutput = 0;

  for (const [path, goldenArray] of goldenRows) {
    const outputArray = outputRows.get(path) ?? [];
    totalGolden += goldenArray.length;
    totalOutput += outputArray.length;
    missing += Math.max(0, goldenArray.length - outputArray.length);
    extra += Math.max(0, outputArray.length - goldenArray.length);
    const limit = Math.min(goldenArray.length, outputArray.length);
    for (let i = 0; i < limit; i += 1) {
      const g = policy ? normalizeDeep(goldenArray[i], policy) : goldenArray[i];
      const o = policy ? normalizeDeep(outputArray[i], policy) : outputArray[i];
      if (canonicalJson(g) === canonicalJson(o)) {
        matched += 1;
      }
    }
    for (let i = 1; i < outputArray.length; i += 1) {
      if (canonicalJson(outputArray[i]) === canonicalJson(outputArray[i - 1])) {
        duplicates = true;
      }
    }
  }

  return {
    goldenRows: totalGolden,
    outputRows: totalOutput,
    matchedRows: matched,
    missingRows: missing,
    extraRows: extra,
    duplicateDetected: duplicates,
  };
}

export interface StabilityResult {
  /** modal variant frequency / parseable runs; undefined when none parseable. */
  consistencyRate?: number;
  /** exact golden matches / requested runs (includes failures). */
  goldenStability?: number;
  modalHash?: string;
  modalCount: number;
  parseableRuns: number;
  exactMatches: number;
}

export function computeStability(
  runs: { outputHash?: string; exactMatch?: boolean }[],
  requestedRuns: number,
): StabilityResult {
  const parseable = runs.filter((r) => r.outputHash !== undefined);
  const exactMatches = runs.filter((r) => r.exactMatch === true).length;

  const counts = new Map<string, number>();
  for (const run of parseable) {
    const hash = run.outputHash!;
    counts.set(hash, (counts.get(hash) ?? 0) + 1);
  }
  let modalHash: string | undefined;
  let modalCount = 0;
  for (const [hash, count] of counts) {
    if (count > modalCount) {
      modalHash = hash;
      modalCount = count;
    }
  }

  return {
    consistencyRate: parseable.length > 0 ? modalCount / parseable.length : undefined,
    goldenStability: requestedRuns > 0 ? exactMatches / requestedRuns : undefined,
    modalHash,
    modalCount,
    parseableRuns: parseable.length,
    exactMatches,
  };
}
