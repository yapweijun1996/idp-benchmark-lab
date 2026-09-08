import { afterEach, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { Blob as NativeBlob } from "node:buffer";
import { IdpDatabase } from "../storage/db";
import { ProfileService } from "../profiles/service";
import { GoldenService } from "../golden/service";
import { BenchmarkRunner } from "./runner";
import { SingleRunService } from "./singleRun";
import { setApiKey, clearAllKeys } from "../providers/keys";
import { buildBackup, importBackup } from "../export/backup";
import { summarizeSuite } from "./summary";
import { recoverAbandonedRecords } from "./recovery";
import type { ProviderAdapter } from "../providers/types";
import type { BenchmarkRun } from "../storage/types";

const databases: IdpDatabase[] = [];
afterEach(async () => { clearAllKeys(); vi.unstubAllGlobals(); for (const db of databases.splice(0)) await db.delete(); });
function database() { const db = new IdpDatabase(crypto.randomUUID()); databases.push(db); return db; }
it("keeps dispatched evidence redacted after credentials are cleared in flight", async () => {
  const { db, deps, input, adapter } = await fixture();
  vi.mocked(adapter.extract).mockImplementation(async () => {
    expect((await db.benchmarkRuns.toArray())[0]?.pendingAttempt?.number).toBe(1);
    clearAllKeys();
    return { raw: "synthetic-production-test-credential", json: undefined, parseError: "malformed", providerCalls: 1 };
  });
  const result = await new SingleRunService(deps).run(input);
  expect(JSON.stringify(await buildBackup(db))).not.toContain("synthetic-production-test-credential");
  expect(result.run.safeRawResponse).toBe("[REDACTED]");
  expect((await db.benchmarkRuns.get(result.run.id))?.pendingAttempt).toBeUndefined();
});
it("renders canonical pixels once and freezes identical images across concurrent runs", async () => {
  const { deps, input, adapter } = await fixture();
  const render = vi.fn(async () => ({ dataUrl: "data:image/png;base64,aW1hZ2U=" }));
  const loader = vi.fn(() => ({ promise: Promise.resolve({ numPages: 1, getPage: async () => ({}) }), destroy: vi.fn() }));
  const suite = await new BenchmarkRunner({ ...deps, pdfLoader: loader as never, pageRenderer: { render } }).run({ ...input, mode: "canonical_images", requestedRuns: 5, concurrency: 3 });
  expect(render).toHaveBeenCalledTimes(1);
  expect(suite.snapshot?.inputImages).toHaveLength(1);
  for (const [request] of vi.mocked(adapter.extract).mock.calls) expect(request.images).toEqual(suite.snapshot?.inputImages);
});
async function fixture() {
  const db = database();
  const profile = await new ProfileService(db).create({ name: "PO", basePrompt: "Extract printed values only", extractionContract: ["number"], jsonSchema: { type: "object", properties: { number: { type: "string" } }, required: ["number"], additionalProperties: false }, normalizationPolicy: { trimOuterWhitespace: true, normalizeLineEndings: false } });
  const blob = new Blob(["%PDF-1.4 mock"], { type: "application/pdf" });
  await db.documents.put({ id: "doc", name: "po.pdf", mimeType: "application/pdf", size: blob.size, sha256: "e".repeat(64), storageMode: "session", createdAt: "2026-09-08T00:00:00Z" });
  await db.providerConfigs.put({ id: "provider", name: "Synthetic", kind: "gemini", model: "test", settings: {}, pricingSnapshotId: "price" });
  await db.pricingSnapshots.put({ id: "price", provider: "gemini", model: "test", currency: "USD", flatPerRequest: 0.1, maximumAttemptCostUsd: 0.1, maximumAttemptCostSource: "Synthetic contract", effectiveAt: "2026-09-08" });
  const golden = await new GoldenService(db).create({ documentId: "doc", profileId: profile.id, json: { number: "001" } });
  setApiKey("provider", "synthetic-production-test-credential", { rememberForTab: false });
  const adapter: ProviderAdapter = { kind: "gemini", capabilities: () => ({ nativePdf: true, imageInput: true, structuredOutput: true, tokenUsage: true, providerReportedCost: false, temperature: true, thinking: true }), testConnection: async () => ({ ok: true, message: "ok" }), extract: vi.fn(async () => ({ raw: '{"number":" 001 "}', json: { number: " 001 " }, providerCalls: 1 })) };
  const deps = { db, adapters: { gemini: adapter }, getBlob: async () => blob };
  const input = { documentId: "doc", profileId: profile.id, goldenId: golden.id, providerConfigId: "provider", mode: "native_pdf" as const };
  return { db, profile, golden, adapter, deps, input };
}
it("freezes overrides, Golden, input, endpoint and pricing through edits, deletion, reload and backup", async () => {
  const { db, profile, golden, adapter, deps, input } = await fixture();
  let calls = 0;
  vi.mocked(adapter.extract).mockImplementation(async () => {
    calls += 1;
    if (calls === 1) {
      await db.goldenAnswers.update(golden.id, { json: { number: "changed" }, version: 2 });
      await db.pricingSnapshots.update("price", { flatPerRequest: 9 });
      await db.providerConfigs.update("provider", { baseUrl: "https://changed.invalid" });
      await db.extractionProfiles.update(profile.id, { basePrompt: "changed", version: 2 });
    }
    return { raw: '{"number":" 001 "}', json: { number: " 001 " }, providerCalls: 1 };
  });
  const suite = await new BenchmarkRunner(deps).run({ ...input, requestedRuns: 2, promptOverride: "Effective override" });
  const runs = await db.benchmarkRuns.toArray();
  expect(runs.every((r) => r.costUsd === 0.1 && r.exactMatch === false && r.exactMatchNormalized === true)).toBe(true);
  expect(suite.snapshot?.effectivePrompt).toContain("Effective override");
  expect(suite.snapshot?.golden?.json).toEqual({ number: "001" });
  expect(suite.snapshot?.profile.version).toBe(1);
  expect(suite.snapshot?.provider.baseUrl).toBe("https://generativelanguage.googleapis.com/v1beta");
  expect(suite.snapshot?.pricing?.flatPerRequest).toBe(0.1);
  await db.goldenAnswers.clear(); await db.extractionProfiles.clear(); await db.providerConfigs.clear();
  const backup = await buildBackup(db);
  const restored = database();
  await importBackup(restored, JSON.stringify(backup));
  expect((await restored.benchmarkSuites.get(suite.id))?.snapshot).toEqual(suite.snapshot);
  expect(summarizeSuite(await restored.benchmarkRuns.toArray(), 2).exactPassRateNormalized).toBe(1);
});
it("retains failed attempt costs, timing, errors and redacted envelopes before a retry", async () => {
  const { db, adapter, deps, input } = await fixture();
  vi.mocked(adapter.extract).mockRejectedValueOnce({ category: "rate_limit", message: "echo synthetic-production-test-credential", retryable: true, evidence: { raw: "synthetic-production-test-credential", json: undefined, usage: { inputTokens: 12, outputTokens: 0 }, providerCalls: 1 } });
  await new BenchmarkRunner({ ...deps, sleep: async () => undefined }).run({ ...input, requestedRuns: 1 });
  const run = (await db.benchmarkRuns.toArray())[0]!;
  expect(run.attempts).toHaveLength(2);
  expect(run.costUsd).toBe(0.2);
  expect(run.attempts?.[0]?.latencyMs).toBeGreaterThanOrEqual(0);
  expect(JSON.stringify(run)).not.toContain("synthetic-production-test-credential");
});
it("persists malformed JSON with usage, timing and the parse_error state", async () => {
  const { db, adapter, deps, input } = await fixture();
  vi.mocked(adapter.extract).mockResolvedValue({ raw: "malformed", json: undefined, parseError: "Invalid JSON", usage: { inputTokens: 12, outputTokens: 3 }, providerCalls: 1 });
  const result = await new SingleRunService(deps).run(input);
  expect(result.run.state).toBe("parse_error");
  expect((await db.benchmarkRuns.get(result.run.id))?.attempts?.[0]?.raw).toBe("malformed");
  expect(result.run.usage).toEqual({ inputTokens: 12, outputTokens: 3 });
});
it("rejects malformed backup records, duplicate IDs and references without modifying existing data", async () => {
  const { db } = await fixture();
  const baseline = JSON.stringify(await db.extractionProfiles.toArray());
  const bundle = await buildBackup(db);
  for (const mutate of [
    (b: typeof bundle) => { b.entities.extractionProfiles = [{ id: "malformed" } as never]; },
    (b: typeof bundle) => { b.entities.extractionProfiles.push(b.entities.extractionProfiles[0]!); },
    (b: typeof bundle) => { b.entities.goldenAnswers[0]!.profileId = "missing"; },
    (b: typeof bundle) => { b.entities.providerConfigs[0]!.settings = { nested: { Authorization: "secret-import-value" } }; },
  ]) {
    const poisoned = structuredClone(bundle); mutate(poisoned);
    await expect(importBackup(db, JSON.stringify(poisoned))).rejects.toThrow();
    expect(JSON.stringify(await db.extractionProfiles.toArray())).toBe(baseline);
  }
});
it("rejects a merge that would invalidate retained Golden references before any write", async () => {
  const { db, profile, golden } = await fixture();
  await db.extractionProfiles.update(profile.id, { version: 2 });
  await db.goldenAnswers.update(golden.id, { profileVersion: 2 });
  const incoming = await buildBackup(db);
  incoming.entities.goldenAnswers = [];
  incoming.entities.extractionProfiles[0]!.version = 1;
  await expect(importBackup(db, JSON.stringify(incoming), "merge")).rejects.toMatchObject({ code: "invalid_entities" });
  expect((await db.extractionProfiles.get(profile.id))?.version).toBe(2);
  expect((await db.goldenAnswers.get(golden.id))?.profileVersion).toBe(2);
});
it("migrates v1 without losing history and removes legacy nested credentials and echoes", async () => {
  vi.stubGlobal("Blob", NativeBlob);
  const name = crypto.randomUUID();
  const legacy = new Dexie(name);
  legacy.version(1).stores({ documents: "id, sha256, createdAt", extractionProfiles: "id, name, version, promptSha256, schemaSha256, updatedAt", goldenAnswers: "id, documentId, profileId, [profileId+profileVersion], version, sha256, createdAt", providerConfigs: "id, kind, name", pricingSnapshots: "id, provider, model, effectiveAt", benchmarkSuites: "id, status, createdAt", benchmarkRuns: "id, suiteId, runNumber, state, &[suiteId+runNumber]", appSettings: "id" });
  await legacy.table("providerConfigs").put({ id: "legacy", settings: { customHeaders: { Authorization: "Bearer legacy-synthetic-credential" } } });
  await legacy.table("benchmarkRuns").put({ id: "run", suiteId: "suite", runNumber: 1, safeRawResponse: "echo legacy-synthetic-credential" });
  await legacy.table("benchmarkSuites").put({ id: "suite", status: "completed" });
  await legacy.table("documents").put({ id: "legacy-pdf", blob: new NativeBlob(["%PDF-1.4 migration"]) });
  legacy.close();
  const db = new IdpDatabase(name); databases.push(db);
  expect(await db.benchmarkRuns.count()).toBe(1);
  expect((await db.benchmarkSuites.get("suite"))?.legacyEvidence).toBe("unavailable");
  expect(JSON.stringify(await db.benchmarkRuns.toArray())).not.toContain("legacy-synthetic-credential");
  expect((await db.providerConfigs.get("legacy"))?.settings.customHeaders).toEqual({});
  const document = await db.documents.get("legacy-pdf");
  expect(new TextDecoder().decode(document?.blobBytes)).toBe("%PDF-1.4 migration");
  expect(document?.blob).toBeUndefined();
});
it("excludes incomplete rows from completed denominators and never calls a partial cost total", () => {
  const base: BenchmarkRun = { id: "run", suiteId: "suite", runNumber: 1, createdAt: "2026-09-08", state: "succeeded", providerCalls: 1, exactMatch: true, exactMatchNormalized: true, schemaValid: true, costUsd: 1 };
  const summary = summarizeSuite([base, { ...base, id: "pending", state: "running", exactMatch: undefined, schemaValid: undefined, costUsd: undefined }, { ...base, id: "error", state: "parse_error", exactMatch: false, schemaValid: false, costUsd: undefined }], 5);
  expect(summary.completedRuns).toBe(2);
  expect(summary.exactPassRate).toBe(0.5);
  expect(summary.errorRate).toBe(0.2);
  expect(summary.cost.totalUsd).toBeUndefined();
  expect(summary.cost.knownSubtotalUsd).toBe(1);
});
it("retains completed attempts when recovering interruption and never resubmits", async () => {
  const { db, deps, input, adapter } = await fixture();
  const result = await new SingleRunService(deps).run(input);
  await db.benchmarkSuites.update(result.suite.id, { status: "running" });
  await db.benchmarkRuns.update(result.run.id, { state: "running" });
  expect(await recoverAbandonedRecords(db)).toBe(1);
  const recovered = await db.benchmarkRuns.get(result.run.id);
  expect(recovered?.state).toBe("cancelled");
  expect(recovered?.attempts).toEqual(result.run.attempts);
  expect(adapter.extract).toHaveBeenCalledTimes(1);
});
