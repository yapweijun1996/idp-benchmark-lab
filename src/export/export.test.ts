import { describe, expect, it } from "vitest";
import { buildFieldCsv, buildSuiteExportJson, buildSummaryCsv, csvEscape } from "./export";
import type { FieldHeat } from "../evaluation/heatmap";
import type { SuiteSummary } from "../benchmarks/summary";

function summary(overrides: Partial<SuiteSummary> = {}): SuiteSummary {
  return {
    requestedRuns: 5,
    attemptedRuns: 5,
    succeededRuns: 4,
    schemaInvalidRuns: 0,
    providerErrorRuns: 1,
    parseableRuns: 4,
    exactPassRate: 0.8,
    schemaValidRate: 0.8,
    avgLeafAccuracy: 0.95,
    rowAccuracy: 0.9,
    consistencyRate: 0.75,
    goldenStability: 0.8,
    uniqueVariants: 2,
    errorRate: 0.2,
    latency: { avg: 250, p50: 200, p95: 400, min: 100, max: 500 },
    cost: { totalUsd: 0.5, avgPerRun: 0.1, costPerCorrect: 0.125 },
    ...overrides,
  };
}

describe("csvEscape", () => {
  it("quotes fields containing commas, quotes, or newlines", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("passes plain values through and blanks null/undefined", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape(42)).toBe("42");
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
});

describe("buildSuiteExportJson", () => {
  it("embeds format version, suite, runs, summary, and field accuracy", () => {
    const json = buildSuiteExportJson({
      formatVersion: 1,
      appBuild: "0.1.0",
      exportedAt: "2026-08-15T00:00:00.000Z",
      suite: { id: "s-1", name: "Bench" } as never,
      runs: [] as never[],
      summary: summary(),
      fieldAccuracy: [] as FieldHeat[],
    });
    const parsed = JSON.parse(json) as { formatVersion: number; summary: { exactPassRate: number } };
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.summary.exactPassRate).toBe(0.8);
  });
});

describe("buildSummaryCsv", () => {
  it("produces a header and one row per suite", () => {
    const csv = buildSummaryCsv([
      {
        suiteId: "s-1",
        suiteName: "Bench, PO",
        status: "completed",
        model: "gemini-3-flash-lite",
        inputMode: "native_pdf",
        summary: summary(),
      },
    ]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("suite_id");
    expect(lines[0]).toContain("cost_avg_usd");
    expect(lines[1]).toContain('"Bench, PO"');
    expect(lines[1]).toContain("gemini-3-flash-lite");
    expect(lines[1]).toContain("0.8");
  });

  it("renders undefined metrics as empty cells", () => {
    const csv = buildSummaryCsv([
      {
        suiteId: "s-1",
        suiteName: "x",
        status: "failed",
        model: "m",
        inputMode: "native_pdf",
        summary: summary({ cost: { totalUsd: undefined, avgPerRun: undefined, costPerCorrect: undefined } }),
      },
    ]);
    const row = csv.trim().split("\n")[1]!;
    expect(row.endsWith(",,")).toBe(true);
  });
});

describe("buildFieldCsv", () => {
  it("exports heatmap rows with value frequencies", () => {
    const heatmap: FieldHeat[] = [
      {
        path: "row_data[0].remark",
        mismatchedRuns: 2,
        evaluatedRuns: 4,
        mismatchRate: 0.5,
        valueFrequencies: [{ expected: null, actual: "920-007596", count: 2 }],
      },
    ];
    const csv = buildFieldCsv(heatmap);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("mismatch_rate");
    expect(lines[1]).toContain("row_data[0].remark");
    expect(lines[1]).toContain('""920-007596""');
    expect(lines[1]).toContain(",null,");
  });
});
