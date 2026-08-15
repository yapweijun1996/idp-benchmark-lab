import { describe, expect, it } from "vitest";
import { estimateCost } from "./estimate";
import type { PricingSnapshot } from "../storage/types";

const snapshot: PricingSnapshot = {
  id: "s-1",
  provider: "openai",
  model: "gpt-4o-mini",
  currency: "USD",
  inputPerMillion: 0.15,
  cachedInputPerMillion: 0.075,
  outputPerMillion: 0.6,
  effectiveAt: "2026-08-15T00:00:00.000Z",
};

describe("estimateCost precedence", () => {
  it("prefers provider-reported cost over everything", () => {
    const estimate = estimateCost({
      providerReportedCostUsd: 0.05,
      usage: { inputTokens: 1000, outputTokens: 1000 },
      snapshot,
      flatPerRequest: 0.01,
    });
    expect(estimate).toMatchObject({ usd: 0.05, source: "provider_reported" });
  });

  it("computes usage × snapshot when reported cost is absent", () => {
    const estimate = estimateCost({
      usage: { inputTokens: 2000, outputTokens: 1000, cachedInputTokens: 1000 },
      snapshot,
    });
    // input 2000*0.15/1e6 + cached 1000*0.075/1e6 + output 1000*0.6/1e6
    expect(estimate.source).toBe("usage_snapshot");
    expect(estimate.usd).toBeCloseTo(0.0003 + 0.000075 + 0.0006, 9);
    expect(estimate.breakdown).toEqual({
      inputUsd: 0.0003,
      cachedInputUsd: 0.000075,
      outputUsd: 0.0006,
    });
  });

  it("counts only known usage parts", () => {
    const estimate = estimateCost({ usage: { outputTokens: 1000 }, snapshot });
    expect(estimate.source).toBe("usage_snapshot");
    expect(estimate.usd).toBeCloseTo(0.0006, 9);
    expect(estimate.breakdown.inputUsd).toBeUndefined();
  });

  it("falls back to flat per-request cost", () => {
    const estimate = estimateCost({ flatPerRequest: 0.02, usage: { totalTokens: 100 } });
    expect(estimate).toMatchObject({ usd: 0.02, source: "flat" });
  });

  it("returns unknown (no usd) when nothing is known — never zero", () => {
    const estimate = estimateCost({});
    expect(estimate.source).toBe("unknown");
    expect(estimate.usd).toBeUndefined();
  });

  it("returns unknown when usage exists but has no pricing", () => {
    const estimate = estimateCost({ usage: { totalTokens: 500 } });
    expect(estimate.source).toBe("unknown");
    expect(estimate.usd).toBeUndefined();
  });
});
