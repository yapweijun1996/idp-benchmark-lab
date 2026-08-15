import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdpDatabase } from "../storage/db";
import { ProfileService, type ProfileInput } from "../profiles/service";
import { setApiKey, clearApiKey } from "../providers/keys";
import { BenchmarkRunner, RUN_PRESETS } from "./runner";
import type { ProviderAdapter } from "../providers/types";
import type { DocumentRecord, ProviderConfig } from "../storage/types";

const profileInput: ProfileInput = {
  name: "PO",
  basePrompt: "Extract printed values.",
  extractionContract: { doc_info: ["document_number"] },
  jsonSchema: {
    type: "object",
    properties: { document_number: { type: ["string", "null"] } },
    required: ["document_number"],
    additionalProperties: false,
  },
};

let db: IdpDatabase;
let counter = 0;

function okResponse(costUsd?: number) {
  return {
    raw: '{"document_number":"0004131999"}',
    json: { document_number: "0004131999" },
    usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
    providerCalls: 1,
    ...(costUsd !== undefined ? { providerReportedCostUsd: costUsd } : {}),
  };
}

function fakeAdapter(): ProviderAdapter & { extract: ReturnType<typeof vi.fn> } {
  return {
    kind: "gemini",
    capabilities: () => ({
      nativePdf: true,
      imageInput: true,
      structuredOutput: true,
      tokenUsage: true,
      providerReportedCost: false,
      temperature: true,
      thinking: true,
    }),
    testConnection: async () => ({ ok: true, message: "ok" }),
    extract: vi.fn(),
  } as unknown as ProviderAdapter & { extract: ReturnType<typeof vi.fn> };
}

async function seed() {
  const profiles = new ProfileService(db);
  const profile = await profiles.create(profileInput);
  const config: ProviderConfig = {
    id: "cfg-1",
    kind: "gemini",
    name: "Gemini",
    model: "gemini-3-flash-lite",
    settings: {},
  };
  await db.providerConfigs.put(config);
  const doc: DocumentRecord = {
    id: "doc-1",
    name: "po.pdf",
    mimeType: "application/pdf",
    size: 4,
    sha256: "doc-hash-64",
    createdAt: "2026-08-15T00:00:00.000Z",
    storageMode: "session",
  };
  await db.documents.put(doc);
  setApiKey("cfg-1", "AIza-test", { rememberForTab: false });
  return { profile };
}

function runnerFor(adapter: ProviderAdapter, sleep?: (ms: number) => Promise<void>): BenchmarkRunner {
  return new BenchmarkRunner({
    db,
    adapters: { gemini: adapter },
    getBlob: () => Promise.resolve(new Blob(["%PDF"], { type: "application/pdf" })),
    sleep: sleep ?? (() => Promise.resolve()),
  });
}

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-runner-test-${counter}`);
});

afterEach(async () => {
  clearApiKey("cfg-1");
  db.close();
  await db.delete();
});

const baseConfig = {
  documentId: "doc-1",
  profileId: "",
  providerConfigId: "cfg-1",
  mode: "native_pdf" as const,
};

describe("RUN_PRESETS", () => {
  it("offers the documented presets", () => {
    expect(RUN_PRESETS).toEqual([5, 10, 20, 50, 100]);
  });
});

describe("BenchmarkRunner queue", () => {
  it("runs exactly the requested number of runs with unique numbers", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue(okResponse());
    const { profile } = await seed();
    const runner = runnerFor(adapter);
    const suite = await runner.run({ ...baseConfig, profileId: profile.id, requestedRuns: 5 });

    expect(suite.status).toBe("completed");
    const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
    expect(runs).toHaveLength(5);
    expect(new Set(runs.map((r) => r.runNumber)).size).toBe(5);
    expect(runs.every((r) => r.state === "succeeded")).toBe(true);
    expect(adapter.extract).toHaveBeenCalledTimes(5);
  });

  it("never exceeds the requested run count", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue(okResponse());
    const { profile } = await seed();
    const runner = runnerFor(adapter);
    await runner.run({ ...baseConfig, profileId: profile.id, requestedRuns: 3, concurrency: 4 });
    expect(adapter.extract).toHaveBeenCalledTimes(3);
  });

  it("transitions each run through the running state", async () => {
    const adapter = fakeAdapter();
    let observedRunning = false;
    adapter.extract.mockImplementation(async () => {
      // 执行期间 run 已写入 running 状态
      const rows = await db.benchmarkRuns.toArray();
      observedRunning = rows.some((r) => r.state === "running");
      return okResponse();
    });
    const { profile } = await seed();
    await runnerFor(adapter).run({ ...baseConfig, profileId: profile.id, requestedRuns: 1 });
    expect(observedRunning).toBe(true);
  });

  it("marks schema-invalid runs distinctly while the suite completes", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue({ ...okResponse(), json: { document_number: 42 }, raw: '{"document_number":42}' });
    const { profile } = await seed();
    const suite = await runnerFor(adapter).run({ ...baseConfig, profileId: profile.id, requestedRuns: 2 });
    expect(suite.status).toBe("completed");
    const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
    expect(runs.every((r) => r.state === "schema_invalid")).toBe(true);
  });
});

describe("Stop gate", () => {
  it("starts no new runs after requestStop", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockImplementation(async () => {
      runner.requestStop();
      return okResponse();
    });
    const { profile } = await seed();
    const runner = runnerFor(adapter);
    const suite = await runner.run({ ...baseConfig, profileId: profile.id, requestedRuns: 10 });

    expect(suite.status).toBe("stopped");
    const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
    expect(runs.length).toBeGreaterThanOrEqual(1);
    expect(runs.length).toBeLessThan(10);
  });
});

describe("Retry policy", () => {
  it("retries retryable errors and counts provider calls", async () => {
    const adapter = fakeAdapter();
    adapter.extract
      .mockRejectedValueOnce({ category: "rate_limit", message: "slow", retryable: true })
      .mockResolvedValueOnce(okResponse());
    const { profile } = await seed();
    const suite = await runnerFor(adapter).run({ ...baseConfig, profileId: profile.id, requestedRuns: 1 });

    const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.state).toBe("succeeded");
    expect(runs[0]?.providerCalls).toBe(2);
  });

  it("does not retry non-retryable errors", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockRejectedValue({ category: "auth", message: "bad key", retryable: false });
    const { profile } = await seed();
    const suite = await runnerFor(adapter).run({ ...baseConfig, profileId: profile.id, requestedRuns: 1 });

    const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
    expect(runs[0]?.state).toBe("provider_error");
    expect(runs[0]?.providerCalls).toBe(1);
    expect(adapter.extract).toHaveBeenCalledTimes(1);
  });

  it("bounds retries at maxAttempts", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockRejectedValue({ category: "rate_limit", message: "slow", retryable: true });
    const { profile } = await seed();
    const suite = await runnerFor(adapter).run({
      ...baseConfig,
      profileId: profile.id,
      requestedRuns: 1,
      retryPolicy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2 },
    });

    const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
    expect(runs[0]?.state).toBe("provider_error");
    expect(runs[0]?.providerCalls).toBe(3);
    expect(adapter.extract).toHaveBeenCalledTimes(3);
  });
});

describe("Progress callback", () => {
  it("fires once per completed run in run order", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue(okResponse());
    const { profile } = await seed();
    const completed: number[] = [];
    const runner = new BenchmarkRunner({
      db,
      adapters: { gemini: adapter },
      getBlob: () => Promise.resolve(new Blob(["%PDF"], { type: "application/pdf" })),
      sleep: () => Promise.resolve(),
      onRunComplete: (run) => completed.push(run.runNumber),
    });
    await runner.run({ ...baseConfig, profileId: profile.id, requestedRuns: 3 });
    expect(completed).toEqual([1, 2, 3]);
  });
});

describe("Hard budget cap", () => {
  it("stops before a run that would exceed the cap", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue(okResponse(1)); // 每次 $1（provider reported）
    const { profile } = await seed();
    const suite = await runnerFor(adapter).run({
      ...baseConfig,
      profileId: profile.id,
      requestedRuns: 10,
      maxBudgetUsd: 2.5,
    });

    expect(suite.status).toBe("budget_stopped");
    const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
    expect(runs).toHaveLength(2); // 2 * $1 = $2 ≤ 2.5；第三次预估 $1 会超
    expect(suite.costUsdKnown).toBeCloseTo(2, 9);
  });

  it("keeps running when cost is unknown", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue(okResponse()); // 无成本信息
    const { profile } = await seed();
    const suite = await runnerFor(adapter).run({
      ...baseConfig,
      profileId: profile.id,
      requestedRuns: 3,
      maxBudgetUsd: 0.001,
    });

    expect(suite.status).toBe("completed");
    expect(suite.costUsdKnown).toBeUndefined();
  });
});
