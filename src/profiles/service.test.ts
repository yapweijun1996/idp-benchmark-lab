import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdpDatabase } from "../storage/db";
import { ProfileService, type ProfileInput } from "./service";

const validInput: ProfileInput = {
  name: "Golden PO reduced",
  description: "Popular PO extraction",
  basePrompt: "Extract the printed values only. Missing values are null.",
  extractionContract: {
    doc_info: ["document_number"],
    row_data: ["stock_code", "stock_desc"],
  },
  jsonSchema: {
    type: "object",
    properties: { document_number: { type: ["string", "null"] } },
    required: ["document_number"],
    additionalProperties: false,
  },
  normalizationPolicy: { trimOuterWhitespace: true, normalizeLineEndings: true },
};

let db: IdpDatabase;
let service: ProfileService;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-profiles-test-${counter}`);
  service = new ProfileService(db);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("ProfileService.create", () => {
  it("creates version 1 with hashes", async () => {
    const profile = await service.create(validInput);
    expect(profile.version).toBe(1);
    expect(profile.promptSha256).toHaveLength(64);
    expect(profile.schemaSha256).toHaveLength(64);
    expect(profile.normalizationPolicySha256).toHaveLength(64);
    expect(profile.name).toBe("Golden PO reduced");
  });

  it("rejects schemas with provider dialect keywords", async () => {
    await expect(
      service.create({
        ...validInput,
        jsonSchema: { type: "object", properties: { a: { type: "string", nullable: true } } },
      }),
    ).rejects.toMatchObject({ name: "ProfileError", code: "invalid_schema" });
  });

  it("rejects empty names", async () => {
    await expect(service.create({ ...validInput, name: "   " })).rejects.toMatchObject({ code: "missing_name" });
  });
});

describe("ProfileService.update", () => {
  it("increments the version on update", async () => {
    const first = await service.create(validInput);
    const second = await service.update(first.id, { ...validInput, basePrompt: "New prompt rules." });
    expect(second.version).toBe(2);
    expect(second.promptSha256).not.toBe(first.promptSha256);
    expect(second.schemaSha256).toBe(first.schemaSha256);
    const stored = await service.get(first.id);
    expect(stored?.version).toBe(2);
  });

  it("fails for unknown profile ids", async () => {
    await expect(service.update("nope", validInput)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("ProfileService.list/remove", () => {
  it("lists profiles sorted by name and removes them", async () => {
    await service.create({ ...validInput, name: "Zeta" });
    await service.create({ ...validInput, name: "Alpha" });
    const list = await service.list();
    expect(list.map((p) => p.name)).toEqual(["Alpha", "Zeta"]);

    await service.remove(list[0]!.id);
    expect(await service.list()).toHaveLength(1);
  });
});
