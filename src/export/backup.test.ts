import { sha256Hex } from "../documents/hash";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdpDatabase } from "../storage/db";
import { ProfileService } from "../profiles/service";
import { buildBackup, importBackup } from "./backup";
import type { AppSettings } from "../storage/types";

let db: IdpDatabase;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-backup-test-${counter}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("backup round-trip", () => {
  it("serializes entities with document blobs as base64 and restores them", async () => {
    const profile = await new ProfileService(db).create({
      name: "PO",
      basePrompt: "x",
      extractionContract: {},
      jsonSchema: { type: "object" },
    });
    const blob = new Blob(["%PDF-1.4 mock"], { type: "application/pdf" });
    await db.documents.put({
      id: "doc-1",
      name: "po.pdf",
      mimeType: "application/pdf",
      size: blob.size,
      sha256: await sha256Hex(new TextEncoder().encode("%PDF-1.4 mock").buffer),
      createdAt: "2026-08-15T00:00:00.000Z",
      storageMode: "indexeddb",
      blob,
    });
    await db.appSettings.put({
      id: "app",
      defaultConcurrency: 2,
      defaultInputMode: "canonical_images",
      defaultRunCount: 5,
      theme: "dark",
      showSecretsWarning: false,
      updatedAt: "2026-09-08T00:00:00Z",
    } satisfies AppSettings);

    const bundle = await buildBackup(db, {
      getBlob: () => Promise.resolve(blob),
    });
    expect(bundle.formatVersion).toBe(1);
    const doc = bundle.entities.documents[0]!;
    expect(doc.blobBase64).toBe("JVBERi0xLjQgbW9jaw==");

    // 恢复到干净数据库
    const restored = new IdpDatabase(`idp-backup-restore-${++counter}`);
    const count = await importBackup(restored, JSON.stringify(bundle));
    expect(count).toBeGreaterThanOrEqual(3);

    const restoredDoc = await restored.documents.get("doc-1");
    expect(restoredDoc?.name).toBe("po.pdf");
    expect(restoredDoc?.blobBytes).toBeDefined();
    const restoredProfile = await restored.extractionProfiles.get(profile.id);
    expect(restoredProfile?.name).toBe("PO");
    const settings = await restored.appSettings.get("app");
    expect(settings?.defaultConcurrency).toBe(2);

    restored.close();
    await restored.delete();
  });

  it("rejects invalid JSON and wrong format versions", async () => {
    await expect(importBackup(db, "{not json")).rejects.toMatchObject({ code: "invalid_json" });
    await expect(
      importBackup(db, JSON.stringify({ formatVersion: 99, entities: {} })),
    ).rejects.toMatchObject({ code: "invalid_format" });
  });

  it("rejects backups whose stores are not arrays or lack ids", async () => {
    await expect(
      importBackup(db, JSON.stringify({ formatVersion: 1, entities: { documents: "nope" } })),
    ).rejects.toMatchObject({ code: "invalid_entities" });
    await expect(
      importBackup(db, JSON.stringify({ formatVersion: 1, entities: { documents: [{ noId: true }] } })),
    ).rejects.toMatchObject({ code: "invalid_entities" });
  });

  it("refuses backups containing secret-like fields", async () => {
    const bundle = await buildBackup(db);
    const poisoned = JSON.parse(JSON.stringify(bundle)) as { entities: { providerConfigs: unknown[] } };
    poisoned.entities.providerConfigs.push({ id: "evil", apiKey: "sk-123" });
    await expect(importBackup(db, JSON.stringify(poisoned))).rejects.toMatchObject({ code: "secret_found" });
  });

  it("merge mode overwrites by id without clearing other records", async () => {
    await db.appSettings.put({
      id: "app",
      defaultConcurrency: 1,
      defaultInputMode: "native_pdf",
      defaultRunCount: 5,
      theme: "system",
      showSecretsWarning: true,
      updatedAt: "2026-09-08T00:00:00Z",
    });
    const bundle = {
      formatVersion: 1,
      appVersion: "0.1.0",
      exportedAt: "2026-09-08T00:00:00Z",
      entities: {
        documents: [],
        extractionProfiles: [],
        goldenAnswers: [],
        providerConfigs: [],
        pricingSnapshots: [],
        benchmarkSuites: [],
        benchmarkRuns: [],
        appSettings: [
          {
            id: "app",
            defaultConcurrency: 5,
            defaultRunCount: 5,
            defaultInputMode: "native_pdf",
            theme: "system",
            showSecretsWarning: true,
            updatedAt: "2026-09-08T00:00:00Z",
          },
        ],
      },
    };
    await importBackup(db, JSON.stringify(bundle), "merge");
    const settings = await db.appSettings.get("app");
    expect(settings?.defaultConcurrency).toBe(5);
  });

  it("merge mode validates partial incoming stores against retained references", async () => {
    const profile = await new ProfileService(db).create({
      name: "PO",
      basePrompt: "Extract number",
      extractionContract: ["number"],
      jsonSchema: { type: "object", properties: { number: { type: "string" } }, required: ["number"], additionalProperties: false },
    });
    const bytes = new TextEncoder().encode("%PDF-1.4 retained");
    await db.documents.put({ id: "doc-retained", name: "retained.pdf", mimeType: "application/pdf", size: bytes.byteLength, sha256: await sha256Hex(bytes.buffer), storageMode: "indexeddb", blobBytes: bytes.buffer, createdAt: "2026-09-08T00:00:00Z" });
    const golden = {
      id: "golden-retained", documentId: "doc-retained", profileId: profile.id, profileVersion: profile.version, version: 1,
      json: { number: "001" }, sha256: await sha256Hex(new TextEncoder().encode('{"number":"001"}').buffer), schemaValid: true, createdAt: "2026-09-08T00:00:00Z",
    };
    await db.goldenAnswers.put(golden);
    const full = await buildBackup(db);
    const partial = structuredClone(full);
    partial.entities.documents = [];
    partial.entities.extractionProfiles = [];
    partial.entities.goldenAnswers = [full.entities.goldenAnswers[0]!];
    partial.entities.providerConfigs = [];
    partial.entities.pricingSnapshots = [];
    partial.entities.benchmarkSuites = [];
    partial.entities.benchmarkRuns = [];
    partial.entities.appSettings = [];
    await expect(importBackup(db, JSON.stringify(partial), "merge")).resolves.toBe(1);
    expect(await db.documents.get("doc-retained")).toBeDefined();
  });
});
