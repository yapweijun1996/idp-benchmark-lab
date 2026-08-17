import { getDb, type IdpDatabase } from "../storage/db";
import { sha256Hex } from "../documents/hash";
import { blobToArrayBuffer } from "../documents/blob";
import { canonicalJson } from "../evaluation/canonical";
import { DEMO_GOLDEN, DEMO_NAME, DEMO_PROMPT, DEMO_SCHEMA, loadDemoDocumentBlob } from "./fixture";
import type { DocumentRecord, ExtractionProfile, GoldenAnswer } from "../storage/types";

export const DEMO_DOCUMENT_ID = "demo-document-popular-po";
export const DEMO_PROFILE_ID = "demo-profile-popular-po";
export const DEMO_GOLDEN_ID = "demo-golden-popular-po";

const STABLE_CREATED_AT = "2026-01-01T00:00:00.000Z";

async function sha256String(value: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(value).buffer);
}

/** Requested fields, derived from the schema's own top-level properties — no separate contract file needed. */
function extractionContractFrom(schema: unknown): unknown {
  if (schema && typeof schema === "object" && "properties" in schema) {
    return Object.keys((schema as { properties?: Record<string, unknown> }).properties ?? {});
  }
  return {};
}

export interface DemoFixtureIds {
  documentId: string;
  profileId: string;
  goldenId: string;
}

/**
 * Idempotently seeds the bundled demo document/template/expected-result into
 * this browser's local storage, so "Try Demo" runs through the exact same
 * BenchmarkRunner every other benchmark uses — no separate demo engine, and
 * the run is inspectable afterward in Runs & Results like any other. Safe to
 * call on every Home mount: existing rows are left untouched after the
 * first seed (checked by fixed id, not re-created or re-fetched).
 */
export async function seedDemoFixture(
  db: IdpDatabase = getDb(),
  loadBlob: () => Promise<Blob> = loadDemoDocumentBlob,
): Promise<DemoFixtureIds> {
  const existingProfile = await db.extractionProfiles.get(DEMO_PROFILE_ID);
  if (!existingProfile) {
    const promptSha256 = await sha256String(DEMO_PROMPT);
    const schemaSha256 = await sha256String(canonicalJson(DEMO_SCHEMA));
    const profile: ExtractionProfile = {
      id: DEMO_PROFILE_ID,
      name: `Demo: ${DEMO_NAME}`,
      description: "Bundled sample template used by the Home page demo.",
      version: 1,
      basePrompt: DEMO_PROMPT,
      extractionContract: extractionContractFrom(DEMO_SCHEMA),
      jsonSchema: DEMO_SCHEMA,
      normalizationPolicy: { trimOuterWhitespace: true, normalizeLineEndings: true },
      promptSha256,
      schemaSha256,
      createdAt: STABLE_CREATED_AT,
      updatedAt: STABLE_CREATED_AT,
    };
    await db.extractionProfiles.put(profile);
  }

  const existingDocument = await db.documents.get(DEMO_DOCUMENT_ID);
  if (!existingDocument) {
    const blob = await loadBlob();
    const sha256 = await sha256Hex(await blobToArrayBuffer(blob));
    const document: DocumentRecord = {
      id: DEMO_DOCUMENT_ID,
      name: "popular-po-demo.pdf",
      mimeType: "application/pdf",
      size: blob.size,
      sha256,
      pageCount: 1,
      createdAt: STABLE_CREATED_AT,
      storageMode: "indexeddb",
      blob,
    };
    await db.documents.put(document);
  }

  const existingGolden = await db.goldenAnswers.get(DEMO_GOLDEN_ID);
  if (!existingGolden) {
    const golden: GoldenAnswer = {
      id: DEMO_GOLDEN_ID,
      documentId: DEMO_DOCUMENT_ID,
      profileId: DEMO_PROFILE_ID,
      profileVersion: 1,
      version: 1,
      json: DEMO_GOLDEN,
      sha256: await sha256String(canonicalJson(DEMO_GOLDEN)),
      schemaValid: true,
      createdAt: STABLE_CREATED_AT,
    };
    await db.goldenAnswers.put(golden);
  }

  return { documentId: DEMO_DOCUMENT_ID, profileId: DEMO_PROFILE_ID, goldenId: DEMO_GOLDEN_ID };
}
