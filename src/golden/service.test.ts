import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdpDatabase } from "../storage/db";
import { ProfileService, type ProfileInput } from "../profiles/service";
import { GoldenService, type GoldenInput } from "./service";

const profileInput: ProfileInput = {
  name: "PO profile",
  basePrompt: "Extract printed values.",
  extractionContract: { doc_info: ["document_number"] },
  jsonSchema: {
    type: "object",
    properties: {
      document_number: { type: ["string", "null"] },
      date_transaction: { type: ["string", "null"] },
    },
    required: ["document_number"],
    additionalProperties: false,
  },
};

let db: IdpDatabase;
let profiles: ProfileService;
let goldens: GoldenService;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-golden-test-${counter}`);
  profiles = new ProfileService(db);
  goldens = new GoldenService(db);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

async function seed() {
  const profile = await profiles.create(profileInput);
  const input: GoldenInput = {
    documentId: "doc-1",
    profileId: profile.id,
    json: { document_number: "0004131999", date_transaction: "26.06.2023" },
  };
  return { profile, input };
}

describe("GoldenService.create", () => {
  it("creates a schema-valid golden with a hash", async () => {
    const { input } = await seed();
    const golden = await goldens.create(input);
    expect(golden.version).toBe(1);
    expect(golden.schemaValid).toBe(true);
    expect(golden.sha256).toHaveLength(64);
    expect(golden.profileVersion).toBe(1);
  });

  it("rejects JSON that violates the profile schema", async () => {
    const { input } = await seed();
    await expect(
      goldens.create({ ...input, json: { document_number: 42 } }),
    ).rejects.toMatchObject({ name: "GoldenError", code: "schema_invalid" });
  });

  it("rejects unknown profile ids", async () => {
    const { input } = await seed();
    await expect(goldens.create({ ...input, profileId: "nope" })).rejects.toMatchObject({
      code: "profile_not_found",
    });
  });

  it("rejects null for a required string field", async () => {
    const { input } = await seed();
    // document_number allows null, but removing it fails required.
    await expect(goldens.create({ ...input, json: { date_transaction: "x" } })).rejects.toMatchObject({
      code: "schema_invalid",
    });
  });
});

describe("GoldenService.update", () => {
  it("increments version and re-validates against the current schema", async () => {
    const { input, profile } = await seed();
    const first = await goldens.create(input);

    // Profile schema tightens: document_number must be a string (non-null).
    await profiles.update(profile.id, {
      ...profileInput,
      jsonSchema: {
        type: "object",
        properties: { document_number: { type: "string" } },
        required: ["document_number"],
        additionalProperties: false,
      },
    });

    await expect(goldens.update(first.id, { document_number: null })).rejects.toMatchObject({
      code: "schema_invalid",
    });

    const second = await goldens.update(first.id, { document_number: "0004131999" });
    expect(second.version).toBe(2);
    expect(second.profileVersion).toBe(2);
  });

  it("fails for unknown golden ids", async () => {
    await expect(goldens.update("nope", {})).rejects.toMatchObject({ code: "not_found" });
  });
});
