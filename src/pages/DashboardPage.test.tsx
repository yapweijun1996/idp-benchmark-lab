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

  it("shows the guided benchmark entry point for first-time users with no benchmarks", async () => {
    useRunHistoryMock.mockReturnValue({
      suites: [],
      loading: false,
      refresh: vi.fn(() => Promise.resolve()),
    });
    render(<DashboardPage />);
    await vi.waitFor(() => expect(screen.getByRole("region", { name: /guided benchmark/i })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getAllByText(/golden schema/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /run benchmark step by step/i })).toHaveAttribute("href", "#/new-benchmark");
    expect(screen.getByRole("link", { name: /^start benchmark/i })).toHaveAttribute("href", "#/new-benchmark");
    expect(screen.queryByRole("region", { name: /demo benchmark/i })).not.toBeInTheDocument();
    expect(screen.getByText(/bundled sample is available in step 1/i)).toBeInTheDocument();
  });

  it("shows storage totals", async () => {
    const db = getDb();
    await db.benchmarkSuites.put(suite);
    await db.benchmarkRuns.bulkPut([run(1, true), run(2, true)]);
    render(<DashboardPage />);
    await vi.waitFor(() => expect(screen.getByText("1 benchmarks")).toBeInTheDocument());
    expect(screen.getByText("2 runs")).toBeInTheDocument();
  });

  it("offers Compare as the next action once at least two suites exist", async () => {
    const db = getDb();
    await db.benchmarkSuites.put(suite);
    await db.benchmarkRuns.bulkPut([run(1, true)]);
    const suiteB: BenchmarkSuite = { ...suite, id: "s-2" };
    useRunHistoryMock.mockReturnValue({
      suites: [suite, suiteB],
      loading: false,
      refresh: vi.fn(() => Promise.resolve()),
    });

    render(<DashboardPage />);
    await vi.waitFor(() => expect(screen.getByRole("link", { name: /compare results/i })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /compare results/i })).toHaveAttribute("href", "#/compare");
  });

  it("does not offer Compare with only one suite", async () => {
    const db = getDb();
    await db.benchmarkSuites.put(suite);
    await db.benchmarkRuns.bulkPut([run(1, true)]);
    render(<DashboardPage />);
    await vi.waitFor(() => expect(screen.getByRole("region", { name: /latest benchmark/i })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /compare results/i })).not.toBeInTheDocument();
  });
});
