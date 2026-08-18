import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdpDatabase } from "../storage/db";
import { validateData } from "../profiles/schema";
import {
  seedDemoFixture,
  DEMO_DOCUMENT_ID,
  DEMO_PROFILE_ID,
  DEMO_GOLDEN_ID,
  DEMO_PROVIDER_CONFIG_ID,
  NEXABYTE_DOCUMENT_ID,
  NEXABYTE_PROFILE_ID,
  NEXABYTE_GOLDEN_ID,
} from "./seedDemoFixture";

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
      providerConfigId: DEMO_PROVIDER_CONFIG_ID,
    });

    const document = await db.documents.get(DEMO_DOCUMENT_ID);
    const profile = await db.extractionProfiles.get(DEMO_PROFILE_ID);
    const golden = await db.goldenAnswers.get(DEMO_GOLDEN_ID);
    expect(document?.storageMode).toBe("indexeddb");
    expect(document?.blob).toBeDefined();
    expect(profile?.jsonSchema).toBeDefined();
    expect(golden?.documentId).toBe(DEMO_DOCUMENT_ID);
    expect(golden?.profileId).toBe(DEMO_PROFILE_ID);
    expect((golden?.json as { footer?: { remark?: unknown } }).footer?.remark).toBe(
      "This purchase order lists items ordered. No totals are printed below.",
    );
    expect((await db.providerConfigs.get(DEMO_PROVIDER_CONFIG_ID))?.model).toBe("gpt-5.4-mini");
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
});
