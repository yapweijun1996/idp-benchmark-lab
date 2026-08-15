import { describe, expect, it } from "vitest";
import { summarizeSuite } from "./summary";
import type { BenchmarkRun } from "../storage/types";

function run(overrides: Partial<BenchmarkRun>): BenchmarkRun {
  return {
    id: crypto.randomUUID(),
    suiteId: "s-1",
    runNumber: 1,
    state: "succeeded",
    providerCalls: 1,
    createdAt: "2026-08-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("summarizeSuite", () => {
  it("computes pass/schema/consistency/variant rates", () => {
    const runs = [
      run({ runNumber: 1, state: "succeeded", exactMatch: true, schemaValid: true, outputHash: "h1", leafAccuracy: 1 }),
      run({ runNumber: 2, state: "succeeded", exactMatch: true, schemaValid: true, outputHash: "h1", leafAccuracy: 1 }),
      run({ runNumber: 3, state: "schema_invalid", exactMatch: false, schemaValid: false, outputHash: "h2", leafAccuracy: 0.5 }),
      run({ runNumber: 4, state: "provider_error" }),
    ];
    const summary = summarizeSuite(runs, 4);
    expect(summary.attemptedRuns).toBe(4);
    expect(summary.exactPassRate).toBeCloseTo(2 / 4);
    expect(summary.schemaValidRate).toBeCloseTo(2 / 4);
    expect(summary.consistencyRate).toBeCloseTo(2 / 3);
    expect(summary.uniqueVariants).toBe(2);
    expect(summary.errorRate).toBeCloseTo(1 / 4);
    expect(summary.goldenStability).toBeCloseTo(2 / 4);
  });

  it("aggregates row accuracy from raw totals", () => {
    const runs = [
      run({ runNumber: 1, rowMatched: 2, rowTotal: 2 }),
      run({ runNumber: 2, rowMatched: 1, rowTotal: 2 }),
    ];
    expect(summarizeSuite(runs, 2).rowAccuracy).toBeCloseTo(3 / 4);
  });

  it("computes latency percentiles", () => {
    const runs = [100, 200, 300, 400].map((ms, i) =>
      run({ runNumber: i + 1, latencyMs: ms }),
    );
    const latency = summarizeSuite(runs, 4).latency;
    expect(latency.avg).toBeCloseTo(250);
    expect(latency.p50).toBe(250);
    expect(latency.p95).toBeCloseTo(385);
    expect(latency.min).toBe(100);
    expect(latency.max).toBe(400);
  });

  it("aggregates cost and guards unknown cost", () => {
    const summary = summarizeSuite(
      [
        run({ runNumber: 1, costUsd: 0.1, exactMatch: true }),
        run({ runNumber: 2, costUsd: 0.3, exactMatch: true }),
      ],
      2,
    );
    expect(summary.cost.totalUsd).toBeCloseTo(0.4, 9);
    expect(summary.cost.avgPerRun).toBeCloseTo(0.2, 9);
    expect(summary.cost.costPerCorrect).toBeCloseTo(0.2, 9);

    const unknown = summarizeSuite([run({ runNumber: 1 }), run({ runNumber: 2 })], 2);
    expect(unknown.cost.totalUsd).toBeUndefined();
  });

  it("guards zero denominators", () => {
    const summary = summarizeSuite([], 0);
    expect(summary.exactPassRate).toBeUndefined();
    expect(summary.schemaValidRate).toBeUndefined();
    expect(summary.consistencyRate).toBeUndefined();
    expect(summary.uniqueVariants).toBe(0);
  });
});
