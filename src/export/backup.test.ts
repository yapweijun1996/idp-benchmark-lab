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
      sha256: "h",
      createdAt: "2026-08-15T00:00:00.000Z",
      storageMode: "indexeddb",
      blob,
    });
    await db.appSettings.put({
      id: "app",
      defaultConcurrency: 2,
      defaultInputMode: "canonical_images",
      theme: "dark",
      showSecretsWarning: false,
      updatedAt: "",
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
    expect(restoredDoc?.blob).toBeDefined();
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
      theme: "system",
      showSecretsWarning: true,
      updatedAt: "",
    });
    const bundle = {
      formatVersion: 1,
      appVersion: "0.1.0",
      exportedAt: "",
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
            defaultInputMode: "native_pdf",
            theme: "system",
            showSecretsWarning: true,
            updatedAt: "",
          },
        ],
      },
    };
    await importBackup(db, JSON.stringify(bundle), "merge");
    const settings = await db.appSettings.get("app");
    expect(settings?.defaultConcurrency).toBe(5);
  });
});
