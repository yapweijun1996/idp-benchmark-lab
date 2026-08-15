/**
 * Deterministic JSON serialization (EVALUATION.md):
 * - object keys sorted recursively
 * - array order preserved
 * - strings, null, and numeric types preserved
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortDeep(record[key]);
    }
    return sorted;
  }
  return value;
}
