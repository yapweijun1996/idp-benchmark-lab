import { canonicalJson } from "../evaluation/canonical";
import { getDb, type IdpDatabase } from "../storage/db";
import { sha256Hex } from "../documents/hash";
import type { ExtractionProfile, NormalizationPolicy } from "../storage/types";
import { validateJsonSchema } from "./schema";

export class ProfileError extends Error {
  readonly code: "invalid_schema" | "not_found" | "missing_name";

  constructor(code: ProfileError["code"], message: string) {
    super(message);
    this.name = "ProfileError";
    this.code = code;
  }
}

export interface ProfileInput {
  name: string;
  description?: string;
  basePrompt: string;
  extractionContract: unknown;
  jsonSchema: unknown;
  normalizationPolicy?: NormalizationPolicy;
}

async function sha256String(value: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(value).buffer);
}

/**
 * Extraction profile lifecycle (SPEC FR-003, docs/PROMPT_CONTRACT.md):
 * every save creates a new version; prompt/schema/normalization hashes are
 * stored for benchmark identity.
 */
export class ProfileService {
  constructor(private db: IdpDatabase = getDb()) {}

  async create(input: ProfileInput): Promise<ExtractionProfile> {
    const prepared = await this.prepare(input);
    const record: ExtractionProfile = {
      id: crypto.randomUUID(),
      ...prepared,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.db.extractionProfiles.put(record);
    return record;
  }

  /** Saves changes as a new version of an existing profile. */
  async update(id: string, input: ProfileInput): Promise<ExtractionProfile> {
    const existing = await this.db.extractionProfiles.get(id);
    if (!existing) {
      throw new ProfileError("not_found", `Profile ${id} not found`);
    }
    const prepared = await this.prepare(input);
    const record: ExtractionProfile = {
      ...existing,
      ...prepared,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.db.extractionProfiles.put(record);
    return record;
  }

  async list(): Promise<ExtractionProfile[]> {
    const all = await this.db.extractionProfiles.toArray();
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<ExtractionProfile | undefined> {
    return this.db.extractionProfiles.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.db.extractionProfiles.delete(id);
  }

  private async prepare(input: ProfileInput): Promise<Omit<ExtractionProfile, "id" | "version" | "createdAt" | "updatedAt">> {
    if (!input.name.trim()) {
      throw new ProfileError("missing_name", "Profile name is required");
    }
    const schemaCheck = validateJsonSchema(input.jsonSchema);
    if (!schemaCheck.valid) {
      throw new ProfileError("invalid_schema", schemaCheck.errors.join("; "));
    }
    const promptSha256 = await sha256String(input.basePrompt);
    const schemaSha256 = await sha256String(canonicalJson(input.jsonSchema));
    const normalizationPolicy = input.normalizationPolicy;
    const normalizationPolicySha256 = normalizationPolicy
      ? await sha256String(canonicalJson(normalizationPolicy))
      : undefined;
    return {
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      basePrompt: input.basePrompt,
      extractionContract: input.extractionContract,
      jsonSchema: input.jsonSchema,
      normalizationPolicy,
      normalizationPolicySha256,
      promptSha256,
      schemaSha256,
    };
  }
}
