import { canonicalJson } from "../evaluation/canonical";
import { sha256Hex } from "../documents/hash";
import { getDb, type IdpDatabase } from "../storage/db";
import type { GoldenAnswer } from "../storage/types";
import { validateData } from "../profiles/schema";

export class GoldenError extends Error {
  readonly code: "schema_invalid" | "not_found" | "profile_not_found";

  constructor(code: GoldenError["code"], message: string) {
    super(message);
    this.name = "GoldenError";
    this.code = code;
  }
}

export interface GoldenInput {
  documentId: string;
  profileId: string;
  json: unknown;
}

async function sha256String(value: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(value).buffer);
}

/**
 * Golden Answer lifecycle (SPEC FR-004, ADR-004): the expected JSON is
 * always validated against the active profile schema before saving and is
 * never auto-rewritten.
 */
export class GoldenService {
  constructor(private db: IdpDatabase = getDb()) {}

  async create(input: GoldenInput): Promise<GoldenAnswer> {
    const profile = await this.db.extractionProfiles.get(input.profileId);
    if (!profile) {
      throw new GoldenError("profile_not_found", `Profile ${input.profileId} not found`);
    }
    const check = validateData(input.json, profile.jsonSchema);
    if (!check.valid) {
      throw new GoldenError("schema_invalid", check.errors.join("; "));
    }
    const record: GoldenAnswer = {
      id: crypto.randomUUID(),
      documentId: input.documentId,
      profileId: input.profileId,
      profileVersion: profile.version,
      version: 1,
      json: input.json,
      sha256: await sha256String(canonicalJson(input.json)),
      schemaValid: true,
      createdAt: new Date().toISOString(),
    };
    await this.db.goldenAnswers.put(record);
    return record;
  }

  /** Re-validates against the profile's current schema and bumps the version. */
  async update(id: string, json: unknown): Promise<GoldenAnswer> {
    const existing = await this.db.goldenAnswers.get(id);
    if (!existing) {
      throw new GoldenError("not_found", `Golden Answer ${id} not found`);
    }
    const profile = await this.db.extractionProfiles.get(existing.profileId);
    if (!profile) {
      throw new GoldenError("profile_not_found", `Profile ${existing.profileId} not found`);
    }
    const check = validateData(json, profile.jsonSchema);
    if (!check.valid) {
      throw new GoldenError("schema_invalid", check.errors.join("; "));
    }
    const record: GoldenAnswer = {
      ...existing,
      version: existing.version + 1,
      json,
      sha256: await sha256String(canonicalJson(json)),
      schemaValid: true,
      profileVersion: profile.version,
    };
    await this.db.goldenAnswers.put(record);
    return record;
  }

  async list(): Promise<GoldenAnswer[]> {
    return this.db.goldenAnswers.toArray();
  }

  async get(id: string): Promise<GoldenAnswer | undefined> {
    return this.db.goldenAnswers.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.db.goldenAnswers.delete(id);
  }
}
