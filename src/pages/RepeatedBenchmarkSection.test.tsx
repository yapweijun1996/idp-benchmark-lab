import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RepeatedBenchmarkSection, type BenchmarkSelection } from "./RepeatedBenchmarkSection";
import type { BenchmarkRun } from "../storage/types";

const selection: BenchmarkSelection = {
  documentId: "doc-1",
  profileId: "p-1",
  providerConfigId: "c-1",
  mode: "native_pdf",
};

function run(n: number, state: BenchmarkRun["state"], extra: Partial<BenchmarkRun> = {}): BenchmarkRun {
  return {
    id: "r-" + n,
    suiteId: "s-1",
    runNumber: n,
    state,
    providerCalls: 1,
    createdAt: "2026-08-15T00:00:00.000Z",
    finishedAt: "2026-08-15T00:00:01.000Z",
    ...extra,
  };
}

describe("RepeatedBenchmarkSection", () => {
  it("renders run-count presets, concurrency, budget, and stop", () => {
    render(<RepeatedBenchmarkSection selection={selection} />);
    expect(screen.getByRole("radio", { name: "5" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "100" })).toBeInTheDocument();
    expect(screen.getByLabelText(/concurrency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/budget cap/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop/i })).toBeDisabled();
  });

  it("requires a selection before starting", async () => {
    render(<RepeatedBenchmarkSection selection={{ ...selection, documentId: "" }} />);
    fireEvent.click(screen.getByRole("button", { name: /start benchmark/i }));
    await vi.waitFor(() => expect(screen.getByText(/select a document, profile, and provider/i)).toBeInTheDocument());
  });

  it("shows progress and a full summary after completion", async () => {
    const factory = (onRunComplete: (r: BenchmarkRun) => void) => ({
      requestStop: vi.fn(),
      run: vi.fn(async (config: { requestedRuns: number }) => {
        for (let i = 1; i <= config.requestedRuns; i += 1) {
          onRunComplete(
            i === config.requestedRuns
              ? run(i, "provider_error", { error: { category: "rate_limit", message: "x", retryable: true } })
              : run(i, "succeeded", {
                  exactMatch: true,
                  schemaValid: true,
                  outputHash: "h1",
                  leafAccuracy: 1,
                  latencyMs: 100 + i,
                  costUsd: 0.1,
                }),
          );
        }
        return { id: "s-1", status: "completed" } as never;
      }),
    });
    render(<RepeatedBenchmarkSection selection={selection} benchmarkFactory={factory} />);
    fireEvent.click(screen.getByRole("button", { name: /start benchmark/i }));

    await vi.waitFor(() => expect(screen.getByRole("region", { name: /benchmark summary/i })).toBeInTheDocument());
    // 5 preset: 4 succeeded + 1 provider error
    expect(screen.getByText(/attempted 5 of 5 runs/i)).toBeInTheDocument();
    expect(screen.getAllByText(/4 succeeded/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 provider errors/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/80.0%/).length).toBeGreaterThan(0); // exact pass 4/5
  });

  it("stop requests the runner to stop", async () => {
    const requestStop = vi.fn();
    let resolveRun!: (v: never) => void;
    const factory = () => ({
      requestStop,
      run: vi.fn(() => new Promise<never>((res) => (resolveRun = res))),
    });
    render(<RepeatedBenchmarkSection selection={selection} benchmarkFactory={factory} />);
    fireEvent.click(screen.getByRole("button", { name: /start benchmark/i }));
    await vi.waitFor(() => expect(screen.getByRole("button", { name: /stop/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(requestStop).toHaveBeenCalled();
    resolveRun({} as never);
  });
});
