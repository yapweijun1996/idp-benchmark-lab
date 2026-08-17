import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdpDatabase } from "../storage/db";
import { validateData } from "../profiles/schema";
import { seedDemoFixture, DEMO_DOCUMENT_ID, DEMO_PROFILE_ID, DEMO_GOLDEN_ID } from "./seedDemoFixture";

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
    const ids = await seedDemoFixture(db, fakeBlob);
    expect(ids).toEqual({
      documentId: DEMO_DOCUMENT_ID,
      profileId: DEMO_PROFILE_ID,
      goldenId: DEMO_GOLDEN_ID,
    });

    const document = await db.documents.get(DEMO_DOCUMENT_ID);
    const profile = await db.extractionProfiles.get(DEMO_PROFILE_ID);
    const golden = await db.goldenAnswers.get(DEMO_GOLDEN_ID);
    expect(document?.storageMode).toBe("indexeddb");
    expect(document?.blob).toBeDefined();
    expect(profile?.jsonSchema).toBeDefined();
    expect(golden?.documentId).toBe(DEMO_DOCUMENT_ID);
    expect(golden?.profileId).toBe(DEMO_PROFILE_ID);
  });

  it("seeds an expected result that validates against the seeded template's schema", async () => {
    await seedDemoFixture(db, fakeBlob);
    const profile = await db.extractionProfiles.get(DEMO_PROFILE_ID);
    const golden = await db.goldenAnswers.get(DEMO_GOLDEN_ID);
    const check = validateData(golden!.json, profile!.jsonSchema);
    expect(check.errors).toEqual([]);
    expect(check.valid).toBe(true);
  });

  it("is idempotent: a second call does not duplicate rows or re-fetch the PDF blob", async () => {
    const loadBlob = vi.fn(fakeBlob);
    await seedDemoFixture(db, loadBlob);
    await seedDemoFixture(db, loadBlob);

    expect(loadBlob).toHaveBeenCalledTimes(1);
    expect(await db.documents.count()).toBe(1);
    expect(await db.extractionProfiles.count()).toBe(1);
    expect(await db.goldenAnswers.count()).toBe(1);
  });
});
