import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComparePage } from "./ComparePage";
import { useRunHistory } from "../benchmarks/useRunHistory";
import type { BenchmarkRun, BenchmarkSuite } from "../storage/types";

vi.mock("../benchmarks/useRunHistory", () => ({ useRunHistory: vi.fn() }));

const useRunHistoryMock = vi.mocked(useRunHistory);

const suiteA: BenchmarkSuite = {
  id: "s-a",
  name: "Bench A",
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

const suiteB: BenchmarkSuite = {
  ...suiteA,
  id: "s-b",
  name: "Bench B",
  identity: { ...suiteA.identity, model: "gemini-3-flash-lite-thinking", inputMode: "canonical_images" },
};

function run(n: number, exact = true): BenchmarkRun {
  return {
    id: "r-" + n,
    suiteId: "s",
    runNumber: n,
    state: "succeeded",
    providerCalls: 1,
    createdAt: "2026-08-15T00:00:00.000Z",
    exactMatch: exact,
    schemaValid: true,
    outputHash: exact ? "h1" : "h2",
    leafAccuracy: 1,
    latencyMs: 100,
    costUsd: 0.1,
  };
}

const loader = (suite: BenchmarkSuite) => Promise.resolve(suite.id === "s-a" ? [run(1), run(2)] : [run(3, false)]);

beforeEach(() => {
  useRunHistoryMock.mockReturnValue({
    suites: [suiteA, suiteB],
    loading: false,
    refresh: vi.fn(() => Promise.resolve()),
  });
});

describe("ComparePage", () => {
  it("lists suites with checkboxes", () => {
    render(<ComparePage />);
    expect(screen.getByText(/bench a/i)).toBeInTheDocument();
    expect(screen.getByText(/bench b/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /compare selected/i })).toBeDisabled();
  });

  it("builds a side-by-side comparison table", async () => {
    render(<ComparePage runsLoader={loader} />);
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]!);
    fireEvent.click(boxes[1]!);
    fireEvent.click(screen.getByRole("button", { name: /compare selected/i }));

    await vi.waitFor(() => expect(screen.getByRole("region", { name: /comparison table/i })).toBeInTheDocument());
    expect(screen.getAllByText("gemini-3-flash-lite").length).toBeGreaterThan(0);
    expect(screen.getAllByText("gemini-3-flash-lite-thinking").length).toBeGreaterThan(0);
    // A: 2/2 exact, B: 0/1 exact
    expect(screen.getAllByText("100.0%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.0%").length).toBeGreaterThan(0);
  });

  it("does not warn when selected suites share the same document, prompt, and schema", () => {
    render(<ComparePage runsLoader={loader} />);
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]!);
    fireEvent.click(boxes[1]!);
    expect(screen.queryByText(/differ in/i)).not.toBeInTheDocument();
  });

  it("warns without blocking when selected suites differ in benchmark identity", () => {
    const suiteC: BenchmarkSuite = {
      ...suiteA,
      id: "s-c",
      name: "Bench C",
      identity: { ...suiteA.identity, documentSha256: "different-doc" },
    };
    useRunHistoryMock.mockReturnValue({
      suites: [suiteA, suiteC],
      loading: false,
      refresh: vi.fn(() => Promise.resolve()),
    });
    render(<ComparePage runsLoader={loader} />);
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]!);
    fireEvent.click(boxes[1]!);
    expect(screen.getByText(/differ in documentSha256/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /compare selected/i })).toBeEnabled();
  });

  it("shows a guided empty state with fewer than two suites", () => {
    useRunHistoryMock.mockReturnValue({
      suites: [suiteA],
      loading: false,
      refresh: vi.fn(() => Promise.resolve()),
    });
    render(<ComparePage />);
    expect(screen.getByText(/nothing to compare yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /run a benchmark/i })).toHaveAttribute("href", "#/new-benchmark");
    expect(screen.queryByRole("button", { name: /compare selected/i })).not.toBeInTheDocument();
  });
});
