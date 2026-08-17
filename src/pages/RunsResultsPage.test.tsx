import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RunsResultsPage } from "./RunsResultsPage";
import { useRunHistory } from "../benchmarks/useRunHistory";
import { getDb } from "../storage/db";
import type { BenchmarkRun, BenchmarkSuite } from "../storage/types";

vi.mock("../benchmarks/useRunHistory", () => ({ useRunHistory: vi.fn() }));

const useRunHistoryMock = vi.mocked(useRunHistory);

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

function run(n: number): BenchmarkRun {
  return {
    id: "r-" + n,
    suiteId: "s-1",
    runNumber: n,
    state: "succeeded",
    providerCalls: 1,
    createdAt: "2026-08-15T00:00:00.000Z",
    exactMatch: true,
    schemaValid: true,
    outputHash: "h1",
    leafAccuracy: 1,
    latencyMs: 100 + n,
    costUsd: 0.1,
  };
}

beforeEach(async () => {
  const db = getDb();
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("RunsResultsPage", () => {
  it("shows an empty state with a link to New Benchmark", () => {
    useRunHistoryMock.mockReturnValue({ suites: [], loading: false, refresh: vi.fn(() => Promise.resolve()) });
    render(<RunsResultsPage />);
    expect(screen.getByText(/no runs yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new benchmark/i })).toHaveAttribute("href", "#/new-benchmark");
  });

  it("lists suites and inspects one on demand", async () => {
    const db = getDb();
    await db.benchmarkSuites.put(suite);
    await db.benchmarkRuns.bulkPut([run(1), run(2)]);
    useRunHistoryMock.mockReturnValue({ suites: [suite], loading: false, refresh: vi.fn(() => Promise.resolve()) });

    render(<RunsResultsPage />);
    expect(screen.getByText(/benchmark — po \(x5\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /inspect/i }));
    await vi.waitFor(() => expect(screen.getByText(/gemini-3-flash-lite/)).toBeInTheDocument());
  });
});
