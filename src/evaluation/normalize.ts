import type { NormalizationPolicy } from "../storage/types";

/**
 * Conservative normalization (EVALUATION.md): only the documented
 * transformations — outer whitespace trim and line-ending normalization.
 * Identifiers, model numbers, amounts, and numeric types are never touched.
 */
export function normalizeValue(value: unknown, policy?: NormalizationPolicy): unknown {
  if (typeof value !== "string" || !policy) {
    return value;
  }
  let out = value;
  // Trim outer whitespace FIRST so trailing newlines are treated as outer
  // whitespace; inner line endings are normalized afterwards.
  if (policy.trimOuterWhitespace) {
    out = out.trim();
  }
  if (policy.normalizeLineEndings) {
    out = out.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }
  return out;
}

/** Deep normalization of a whole JSON value (for normalized exact match). */
export function normalizeDeep(value: unknown, policy?: NormalizationPolicy): unknown {
  if (Array.isArray(value)) {
    return value.map((child) => normalizeDeep(child, policy));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = normalizeDeep((value as Record<string, unknown>)[key], policy);
    }
    return out;
  }
  return normalizeValue(value, policy);
}
