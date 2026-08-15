import type { PricingSnapshot } from "../storage/types";

/**
 * Built-in pricing presets are model NAMES ONLY — no hard-coded prices
 * (docs/COST_AND_PRICING.md: prices are time-sensitive and must be
 * verified against current official pricing before benchmarking).
 * Users turn a preset into a PricingSnapshot with verified rates.
 */
export interface PricingPreset {
  provider: string;
  model: string;
  note: string;
}

export const PRICING_PRESETS: readonly PricingPreset[] = [
  { provider: "openai", model: "gpt-4o-mini", note: "Verify current official OpenAI pricing before benchmarking." },
  { provider: "openai", model: "gpt-4o", note: "Verify current official OpenAI pricing before benchmarking." },
  { provider: "gemini", model: "gemini-3-flash-lite", note: "Verify current official Google pricing before benchmarking." },
  { provider: "gemini", model: "gemini-3-pro", note: "Verify current official Google pricing before benchmarking." },
];

export function presetToSnapshot(
  preset: PricingPreset,
  rates: {
    inputPerMillion?: number;
    cachedInputPerMillion?: number;
    outputPerMillion?: number;
    flatPerRequest?: number;
    sourceNote?: string;
  },
): PricingSnapshot {
  return {
    id: crypto.randomUUID(),
    provider: preset.provider,
    model: preset.model,
    currency: "USD",
    inputPerMillion: rates.inputPerMillion,
    cachedInputPerMillion: rates.cachedInputPerMillion,
    outputPerMillion: rates.outputPerMillion,
    flatPerRequest: rates.flatPerRequest,
    effectiveAt: new Date().toISOString(),
    sourceNote: rates.sourceNote ?? preset.note,
  };
}
