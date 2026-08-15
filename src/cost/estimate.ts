import type { NormalizedUsage } from "../providers/types";
import type { PricingSnapshot } from "../storage/types";

/**
 * Cost source precedence (SPEC.md / docs/COST_AND_PRICING.md):
 * 1. provider-reported monetary cost (trustworthy)
 * 2. usage × pricing snapshot
 * 3. user-configured flat cost per request
 * 4. unknown — never rendered as zero
 */
export type CostSource = "provider_reported" | "usage_snapshot" | "flat" | "unknown";

export interface CostBreakdown {
  inputUsd?: number;
  cachedInputUsd?: number;
  outputUsd?: number;
}

export interface CostEstimate {
  /** Undefined means unknown — callers must display "unknown", never 0. */
  usd?: number;
  source: CostSource;
  breakdown: CostBreakdown;
}

export interface CostInput {
  providerReportedCostUsd?: number;
  flatPerRequest?: number;
  usage?: NormalizedUsage;
  snapshot?: PricingSnapshot;
}

const PER_MILLION = 1_000_000;

function fromUsageAndSnapshot(usage: NormalizedUsage, snapshot: PricingSnapshot): CostBreakdown {
  const breakdown: CostBreakdown = {};
  if (snapshot.inputPerMillion !== undefined && usage.inputTokens !== undefined) {
    breakdown.inputUsd = (usage.inputTokens / PER_MILLION) * snapshot.inputPerMillion;
  }
  if (snapshot.cachedInputPerMillion !== undefined && usage.cachedInputTokens !== undefined) {
    breakdown.cachedInputUsd = (usage.cachedInputTokens / PER_MILLION) * snapshot.cachedInputPerMillion;
  }
  if (snapshot.outputPerMillion !== undefined && usage.outputTokens !== undefined) {
    breakdown.outputUsd = (usage.outputTokens / PER_MILLION) * snapshot.outputPerMillion;
  }
  return breakdown;
}

function sumUsd(breakdown: CostBreakdown): number | undefined {
  const parts = [breakdown.inputUsd, breakdown.cachedInputUsd, breakdown.outputUsd].filter(
    (v): v is number => v !== undefined,
  );
  return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : undefined;
}

export function estimateCost(input: CostInput): CostEstimate {
  // 1. Provider-reported monetary cost.
  if (input.providerReportedCostUsd !== undefined) {
    return { usd: input.providerReportedCostUsd, source: "provider_reported", breakdown: {} };
  }

  // 2. Usage × snapshot. Partial usage counts only what is known.
  if (input.usage && input.snapshot) {
    const breakdown = fromUsageAndSnapshot(input.usage, input.snapshot);
    const usd = sumUsd(breakdown);
    if (usd !== undefined) {
      return { usd, source: "usage_snapshot", breakdown };
    }
  }

  // 3. Flat per-request cost.
  if (input.flatPerRequest !== undefined) {
    return { usd: input.flatPerRequest, source: "flat", breakdown: {} };
  }

  // 4. Unknown.
  return { usd: undefined, source: "unknown", breakdown: {} };
}
