import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DB_VERSION, IdpDatabase } from "./db";
import type { AppSettings, BenchmarkRun, DocumentRecord } from "./types";

let db: IdpDatabase;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-test-${counter}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("IdpDatabase schema", () => {
  it("creates version " + DB_VERSION + " with all expected stores", () => {
    expect(db.verno).toBe(DB_VERSION);
    expect(db.tables.map((t) => t.name)).toEqual([
      "documents",
      "extractionProfiles",
      "goldenAnswers",
      "providerConfigs",
      "pricingSnapshots",
      "benchmarkSuites",
      "benchmarkRuns",
      "appSettings",
    ]);
  });
});

describe("IdpDatabase CRUD", () => {
  it("round-trips an AppSettings record through its id key", async () => {
    const settings: AppSettings = {
      id: "app",
      defaultConcurrency: 1,
      defaultInputMode: "native_pdf",
      defaultRunCount: 5,
      theme: "system",
      showSecretsWarning: true,
      updatedAt: "2026-08-15T00:00:00.000Z",
    };
    await db.appSettings.put(settings);
    const loaded = await db.appSettings.get("app");
    expect(loaded).toEqual(settings);
  });

  it("round-trips a DocumentRecord and queries by sha256 index", async () => {
    const doc: DocumentRecord = {
      id: "doc-1",
      name: "golden-po.pdf",
      mimeType: "application/pdf",
      size: 12345,
      sha256: "abc123",
      createdAt: "2026-08-15T00:00:00.000Z",
      storageMode: "session",
    };
    await db.documents.put(doc);
    const byHash = await db.documents.where("sha256").equals("abc123").first();
    expect(byHash).toEqual(doc);
  });

  it("rejects a duplicate [suiteId+runNumber] instead of duplicating runs", async () => {
    const base = {
      id: "run-1",
      suiteId: "suite-1",
      runNumber: 1,
      state: "succeeded" as const,
      providerCalls: 1,
      createdAt: "2026-08-15T00:00:00.000Z",
    };
    await db.benchmarkRuns.put(base);
    // Same suite + runNumber violates the unique index (TESTING.md:
    // concurrency must never duplicate run numbers).
    await expect(
      db.benchmarkRuns.put({ ...base, id: "run-1b", latencyMs: 42 }),
    ).rejects.toMatchObject({ name: "ConstraintError" });
    const runs = await db.benchmarkRuns.where("[suiteId+runNumber]").equals(["suite-1", 1]).toArray();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe("run-1");
  });

  it("keeps distinct run numbers in the same suite as separate records", async () => {
    const mk = (n: number): BenchmarkRun => ({
      id: `run-${n}`,
      suiteId: "suite-2",
      runNumber: n,
      state: "succeeded",
      providerCalls: 1,
      createdAt: "2026-08-15T00:00:00.000Z",
    });
    await db.benchmarkRuns.bulkPut([mk(1), mk(2), mk(3)]);
    const runs = await db.benchmarkRuns.where("suiteId").equals("suite-2").toArray();
    expect(runs).toHaveLength(3);
  });
});
