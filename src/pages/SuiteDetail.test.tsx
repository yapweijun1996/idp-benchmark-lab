import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SuiteDetail } from "./SuiteDetail";
import type { BenchmarkRun, BenchmarkSuite, GoldenAnswer } from "../storage/types";

const suite: BenchmarkSuite = {
  id: "s-1",
  name: "Benchmark — PO (x5)",
  identity: {
    documentSha256: "d",
    profileId: "p-1",
    profileVersion: 1,
    promptSha256: "p",
    schemaSha256: "s",
    providerKind: "gemini",
    model: "gemini-3-flash-lite",
    inputMode: "native_pdf",
    concurrency: 1,
    retryPolicyVersion: 1,
    appBuild: "0.1.0",
  },
  requestedRuns: 5,
  concurrency: 1,
  status: "completed",
  createdAt: "2026-08-15T00:00:00.000Z",
};

function run(n: number, mismatches: BenchmarkRun["fieldMismatches"] = []): BenchmarkRun {
  return {
    id: "r-" + n,
    suiteId: "s-1",
    runNumber: n,
    state: "succeeded",
    providerCalls: 1,
    createdAt: "2026-08-15T00:00:00.000Z",
    latencyMs: 100 + n,
    costUsd: 0.01,
    outputHash: "hash-" + n,
    parsedJson: { document_number: "0004131999" },
    safeRawResponse: '{"document_number":"0004131999"}',
    fieldMismatches: mismatches,
  };
}

const golden: GoldenAnswer = {
  id: "g-1",
  documentId: "doc-1",
  profileId: "p-1",
  profileVersion: 1,
  version: 1,
  json: { document_number: "0004131999" },
  sha256: "g",
  schemaValid: true,
  createdAt: "2026-08-15T00:00:00.000Z",
};

describe("SuiteDetail", () => {
  it("renders the field heatmap from run mismatches", () => {
    const runs = [
      run(1, [{ path: "doc_info.document_number", expected: "0004131999", actual: "0004131998" }]),
      run(2),
    ];
    render(<SuiteDetail suite={suite} runs={runs} />);
    expect(screen.getByText(/field accuracy heatmap/i)).toBeInTheDocument();
    expect(screen.getByText("doc_info.document_number")).toBeInTheDocument();
    expect(screen.getByText(/50% \(1\/2\)/)).toBeInTheDocument();
  });

  it("opens the run inspector with parsed and golden JSON", () => {
    const runs = [run(1, [{ path: "x.y", expected: null, actual: "leak" }])];
    render(<SuiteDetail suite={suite} runs={runs} golden={golden} />);
    fireEvent.click(screen.getByRole("button", { name: /run 1 succeeded/i }));
    expect(screen.getByRole("region", { name: /run 1 inspector/i })).toBeInTheDocument();
    expect(screen.getAllByText("x.y").length).toBeGreaterThan(0);
    expect(screen.getByText(/golden answer \(v1\)/i)).toBeInTheDocument();
  });

  it("shows an empty heatmap state without mismatches", () => {
    render(<SuiteDetail suite={suite} runs={[run(1), run(2)]} />);
    expect(screen.getByText(/no evaluated mismatches/i)).toBeInTheDocument();
  });
});
