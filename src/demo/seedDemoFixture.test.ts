import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdpDatabase } from "../storage/db";
import { validateData } from "../profiles/schema";
import {
  seedDemoFixture,
  DEMO_DOCUMENT_ID,
  DEMO_PROFILE_ID,
  DEMO_GOLDEN_ID,
  NEXABYTE_DOCUMENT_ID,
  NEXABYTE_PROFILE_ID,
  NEXABYTE_GOLDEN_ID,
} from "./seedDemoFixture";
import { DEFAULT_GATEWAY_DEMO_PROVIDER_ID } from "../providers/configService";

let db: IdpDatabase;
let counter = 0;

function fakeBlob(): Promise<Blob> {
  return Promise.resolve(new Blob(["%PDF-1.4 fake"], { type: "application/pdf" }));
}

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-demo-seed-test-${counter}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("seedDemoFixture", () => {
  it("creates a document, template, and expected result with the fixed demo ids", async () => {
    const ids = await seedDemoFixture(db, fakeBlob, fakeBlob);
    expect(ids).toEqual({
      documentId: DEMO_DOCUMENT_ID,
      profileId: DEMO_PROFILE_ID,
      goldenId: DEMO_GOLDEN_ID,
    });

    const document = await db.documents.get(DEMO_DOCUMENT_ID);
    const profile = await db.extractionProfiles.get(DEMO_PROFILE_ID);
    const golden = await db.goldenAnswers.get(DEMO_GOLDEN_ID);
    expect(document?.storageMode).toBe("indexeddb");
    expect(document?.blobBytes).toBeDefined();
    expect(profile?.jsonSchema).toBeDefined();
    expect(golden?.documentId).toBe(DEMO_DOCUMENT_ID);
    expect(golden?.profileId).toBe(DEMO_PROFILE_ID);
    expect((golden?.json as { footer?: { remark?: unknown } }).footer?.remark).toBe(
      "This purchase order lists items ordered. No totals are printed below.",
    );
    const demoProvider = await db.providerConfigs.get(DEFAULT_GATEWAY_DEMO_PROVIDER_ID);
    expect(demoProvider).toMatchObject({
      id: DEFAULT_GATEWAY_DEMO_PROVIDER_ID,
      kind: "openai_compatible",
      name: "Gateway Demo",
      model: "demo-fast",
      settings: { endpointProfile: "gateway_demo", apiStyle: "responses" },
    });
    expect(await db.appSettings.get("app")).toMatchObject({ gatewayDemoSeeded: true });
    expect(await db.documents.get(NEXABYTE_DOCUMENT_ID)).toBeDefined();
    expect(await db.extractionProfiles.get(NEXABYTE_PROFILE_ID)).toBeDefined();
    expect(await db.goldenAnswers.get(NEXABYTE_GOLDEN_ID)).toBeDefined();
  });

  it("seeds an expected result that validates against the seeded template's schema", async () => {
    await seedDemoFixture(db, fakeBlob, fakeBlob);
    const profile = await db.extractionProfiles.get(DEMO_PROFILE_ID);
    const golden = await db.goldenAnswers.get(DEMO_GOLDEN_ID);
    const check = validateData(golden!.json, profile!.jsonSchema);
    expect(check.errors).toEqual([]);
    expect(check.valid).toBe(true);
  });

  it("is idempotent: a second call does not duplicate rows or re-fetch the PDF blob", async () => {
    const loadBlob = vi.fn(fakeBlob);
    await seedDemoFixture(db, loadBlob, loadBlob);
    await seedDemoFixture(db, loadBlob, loadBlob);

    expect(loadBlob).toHaveBeenCalledTimes(2);
    expect(await db.documents.count()).toBe(2);
    expect(await db.extractionProfiles.count()).toBe(2);
    expect(await db.goldenAnswers.count()).toBe(2);
    expect(await db.providerConfigs.count()).toBe(1);
  });

  it("does not recreate the default after an intentional provider removal", async () => {
    await seedDemoFixture(db, fakeBlob, fakeBlob);
    await db.providerConfigs.delete(DEFAULT_GATEWAY_DEMO_PROVIDER_ID);
    await seedDemoFixture(db, fakeBlob, fakeBlob);
    expect(await db.providerConfigs.get(DEFAULT_GATEWAY_DEMO_PROVIDER_ID)).toBeUndefined();
  });
});
