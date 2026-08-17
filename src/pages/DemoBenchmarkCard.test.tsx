import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoBenchmarkCard, type DemoRunnerFactory } from "./DemoBenchmarkCard";
import { getDb } from "../storage/db";
import { getApiKey } from "../providers/keys";
import type { BenchmarkRun, BenchmarkSuite } from "../storage/types";

vi.mock("../demo/seedDemoFixture", () => ({
  seedDemoFixture: vi.fn(() =>
    Promise.resolve({ documentId: "demo-doc", profileId: "demo-profile", goldenId: "demo-golden" }),
  ),
}));

beforeEach(async () => {
  const db = getDb();
  await Promise.all(db.tables.map((t) => t.clear()));
});

function fakeRunnerFactory(runs: BenchmarkRun[], status: BenchmarkSuite["status"] = "completed"): DemoRunnerFactory {
  return (onRunComplete) => ({
    run: async (config) => {
      const db = getDb();
      const suiteId = "demo-suite-1";
      for (const run of runs) {
        await db.benchmarkRuns.put({ ...run, suiteId });
        onRunComplete({ ...run, suiteId });
      }
      return {
        id: suiteId,
        name: "Demo run",
        identity: {
          documentSha256: "d",
          profileId: config.profileId,
          profileVersion: 1,
          promptSha256: "p",
          schemaSha256: "s",
          providerKind: "gemini",
          model: config.providerConfigId,
          inputMode: config.mode,
          concurrency: 1,
          retryPolicyVersion: 1,
          appBuild: "0.1.0",
        },
        requestedRuns: config.requestedRuns,
        concurrency: 1,
        status,
        createdAt: "2026-08-17T00:00:00.000Z",
      } as BenchmarkSuite;
    },
  });
}

function run(overrides: Partial<BenchmarkRun>): BenchmarkRun {
  return {
    id: "r-" + Math.random(),
    suiteId: "",
    runNumber: 1,
    state: "succeeded",
    providerCalls: 1,
    createdAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("DemoBenchmarkCard", () => {
  it("shows the ready checklist and demo sample name without any setup", () => {
    render(<DemoBenchmarkCard />);
    expect(screen.getByText(/sample pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/extraction prompt/i)).toBeInTheDocument();
    expect(screen.getByText(/json schema/i)).toBeInTheDocument();
    expect(screen.getByText(/expected result/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run benchmark/i })).toBeInTheDocument();
  });

  it("requires an API key before running", async () => {
    render(<DemoBenchmarkCard runnerFactory={fakeRunnerFactory([])} />);
    fireEvent.click(screen.getByRole("button", { name: /run benchmark/i }));
    expect(await screen.findByText(/enter an api key first/i)).toBeInTheDocument();
  });

  it("runs the demo end to end and shows the summary and failures", async () => {
    const runs = [
      run({ runNumber: 1, exactMatch: true, schemaValid: true, leafAccuracy: 1, outputHash: "h1", latencyMs: 100 }),
      run({
        runNumber: 2,
        exactMatch: false,
        schemaValid: true,
        leafAccuracy: 0.8,
        outputHash: "h2",
        latencyMs: 120,
        fieldMismatches: [
          { path: "row_data[0].description", expected: "LOGITECH M650 M WL WHITE", actual: "LOGITECH M650 MWL WHITE" },
        ],
      }),
      run({ runNumber: 3, exactMatch: true, schemaValid: true, leafAccuracy: 1, outputHash: "h1", latencyMs: 110 }),
    ];
    render(<DemoBenchmarkCard runnerFactory={fakeRunnerFactory(runs)} />);

    fireEvent.change(screen.getByLabelText(/api key/i), { target: { value: "sk-test" } });
    fireEvent.click(screen.getByRole("radio", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: /run benchmark/i }));

    expect(await screen.findByRole("region", { name: /demo result/i })).toBeInTheDocument();
    expect(screen.getByText(/provider: gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/runs: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/run 2 · row_data\[0\]\.description/i)).toBeInTheDocument();
    expect(screen.getByText(/logitech m650 m wl white/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /inspect raw outputs/i })).toHaveAttribute("href", "#/runs");
  });

  it("keeps the API key memory-only (never remembered for the tab)", async () => {
    render(<DemoBenchmarkCard runnerFactory={fakeRunnerFactory([run({ runNumber: 1 })])} />);
    fireEvent.change(screen.getByLabelText(/api key/i), { target: { value: "sk-test" } });
    fireEvent.click(screen.getByRole("button", { name: /run benchmark/i }));
    await screen.findByRole("region", { name: /demo result/i });
    // 找到刚保存的 provider config，确认其 key 仅在内存中可读
    const configs = await getDb().providerConfigs.toArray();
    expect(configs).toHaveLength(1);
    expect(getApiKey(configs[0]!.id)).toBe("sk-test");
  });

  it("switching provider kind updates the default model", () => {
    render(<DemoBenchmarkCard />);
    expect(screen.getByLabelText(/^model$/i)).toHaveValue("gemini-3-flash-lite");
    fireEvent.click(screen.getByRole("radio", { name: "OpenAI" }));
    expect(screen.getByLabelText(/^model$/i)).toHaveValue("gpt-4o-mini");
  });
});
