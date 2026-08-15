import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";
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

function run(n: number, exact: boolean): BenchmarkRun {
  return {
    id: "r-" + n,
    suiteId: "s-1",
    runNumber: n,
    state: "succeeded",
    providerCalls: 1,
    createdAt: "2026-08-15T00:00:00.000Z",
    exactMatch: exact,
    schemaValid: true,
    outputHash: exact ? "h1" : "h2",
    leafAccuracy: 1,
    latencyMs: 100 + n,
    costUsd: 0.1,
  };
}

beforeEach(async () => {
  const db = getDb();
  await Promise.all(db.tables.map((t) => t.clear()));
  useRunHistoryMock.mockReturnValue({
    suites: [suite],
    loading: false,
    refresh: vi.fn(() => Promise.resolve()),
  });
});

describe("DashboardPage", () => {
  it("shows the latest completed benchmark summary", async () => {
    const db = getDb();
    await db.benchmarkSuites.put(suite);
    await db.benchmarkRuns.bulkPut([run(1, true), run(2, true), run(3, false)]);

    render(<DashboardPage />);

    await vi.waitFor(() => expect(screen.getByRole("region", { name: /latest benchmark/i })).toBeInTheDocument());
    expect(screen.getAllByText(/gemini-3-flash-lite/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\/5 runs/).length).toBeGreaterThan(0);
    // 3 runs: 2 exact → 66.7%
    expect(screen.getAllByText("66.7%").length).toBeGreaterThan(0);
  });

  it("shows an empty state without suites", async () => {
    useRunHistoryMock.mockReturnValue({
      suites: [],
      loading: false,
      refresh: vi.fn(() => Promise.resolve()),
    });
    render(<DashboardPage />);
    await vi.waitFor(() => expect(screen.getByText(/no benchmarks yet/i)).toBeInTheDocument());
    expect(screen.getByText(/no suites yet/i)).toBeInTheDocument();
  });

  it("shows storage totals", async () => {
    const db = getDb();
    await db.benchmarkSuites.put(suite);
    await db.benchmarkRuns.bulkPut([run(1, true), run(2, true)]);
    render(<DashboardPage />);
    await vi.waitFor(() => expect(screen.getByText("1 suites")).toBeInTheDocument());
    expect(screen.getByText("2 runs")).toBeInTheDocument();
  });
});
