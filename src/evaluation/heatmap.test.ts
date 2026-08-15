import { describe, expect, it } from "vitest";
import { buildFieldHeatmap } from "./heatmap";
import type { BenchmarkRun } from "../storage/types";

function run(n: number, mismatches: BenchmarkRun["fieldMismatches"]): BenchmarkRun {
  return {
    id: "r-" + n,
    suiteId: "s-1",
    runNumber: n,
    state: "succeeded",
    providerCalls: 1,
    createdAt: "2026-08-15T00:00:00.000Z",
    fieldMismatches: mismatches,
  };
}

describe("buildFieldHeatmap", () => {
  it("aggregates mismatch rates per path", () => {
    const runs = [
      run(1, [
        { path: "doc_info.document_number", expected: "0004131999", actual: "0004131998" },
        { path: "row_data[0].remark", expected: null, actual: "920-007596" },
      ]),
      run(2, [
        { path: "doc_info.document_number", expected: "0004131999", actual: "0004131998" },
      ]),
      run(3, []),
    ];
    const heatmap = buildFieldHeatmap(runs);
    expect(heatmap).toHaveLength(2);
    expect(heatmap[0]).toMatchObject({
      path: "doc_info.document_number",
      mismatchedRuns: 2,
      evaluatedRuns: 3,
      mismatchRate: 2 / 3,
    });
    expect(heatmap[1]).toMatchObject({ path: "row_data[0].remark", mismatchedRuns: 1, mismatchRate: 1 / 3 });
  });

  it("counts observed value-pair frequencies for field stability", () => {
    const runs = [
      run(1, [{ path: "row_data[1].remark", expected: null, actual: "920-007596" }]),
      run(2, [{ path: "row_data[1].remark", expected: null, actual: "920-007596" }]),
      run(3, [{ path: "row_data[1].remark", expected: null, actual: "910-004914" }]),
    ];
    const heat = buildFieldHeatmap(runs)[0]!;
    expect(heat.valueFrequencies).toEqual([
      { expected: null, actual: "920-007596", count: 2 },
      { expected: null, actual: "910-004914", count: 1 },
    ]);
  });

  it("returns an empty list without evaluated runs", () => {
    expect(buildFieldHeatmap([run(1, undefined), run(2, undefined)])).toEqual([]);
  });
});
