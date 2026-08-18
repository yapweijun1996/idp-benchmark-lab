import { getDb, type IdpDatabase } from "../storage/db";
import { sha256Hex } from "../documents/hash";
import { blobToArrayBuffer } from "../documents/blob";
import { canonicalJson } from "../evaluation/canonical";
import {
  DEMO_GOLDEN,
  DEMO_NAME,
  DEMO_PROMPT,
  DEMO_SCHEMA,
  NEXABYTE_GOLDEN,
  NEXABYTE_NAME,
  NEXABYTE_PROMPT,
  NEXABYTE_SCHEMA,
  loadDemoDocumentBlob,
  loadNexabyteDocumentBlob,
} from "./fixture";
import type { DocumentRecord, ExtractionProfile, GoldenAnswer, ProviderConfig } from "../storage/types";
import { DEMO_GATEWAY_BASE_URL, DEMO_GATEWAY_MODEL, DEMO_GATEWAY_SETTINGS } from "../providers/demoGateway";

export const DEMO_DOCUMENT_ID = "demo-document-popular-po";
export const DEMO_PROFILE_ID = "demo-profile-popular-po";
export const DEMO_GOLDEN_ID = "demo-golden-popular-po";
export const NEXABYTE_DOCUMENT_ID = "demo-document-nexabyte-po";
export const NEXABYTE_PROFILE_ID = "demo-profile-nexabyte-po";
export const NEXABYTE_GOLDEN_ID = "demo-golden-nexabyte-po";
export const DEMO_PROVIDER_CONFIG_ID = "demo-provider-gpt-gateway";

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
  providerConfigId: string;
}

interface BundledFixture {
  documentId: string;
  profileId: string;
  goldenId: string;
  documentName: string;
  profileName: string;
  description: string;
  prompt: string;
  schema: unknown;
  golden: unknown;
  loadBlob: () => Promise<Blob>;
}

async function seedBundledFixture(db: IdpDatabase, fixture: BundledFixture): Promise<void> {
  const existingProfile = await db.extractionProfiles.get(fixture.profileId);
  if (!existingProfile) {
    const promptSha256 = await sha256String(fixture.prompt);
    const schemaSha256 = await sha256String(canonicalJson(fixture.schema));
    const profile: ExtractionProfile = {
      id: fixture.profileId,
      name: fixture.profileName,
      description: fixture.description,
      version: 1,
      basePrompt: fixture.prompt,
      extractionContract: extractionContractFrom(fixture.schema),
      jsonSchema: fixture.schema,
      normalizationPolicy: { trimOuterWhitespace: true, normalizeLineEndings: true },
      promptSha256,
      schemaSha256,
      createdAt: STABLE_CREATED_AT,
      updatedAt: STABLE_CREATED_AT,
    };
    await db.extractionProfiles.put(profile);
  }

  const existingDocument = await db.documents.get(fixture.documentId);
  if (!existingDocument) {
    const blob = await fixture.loadBlob();
    const sha256 = await sha256Hex(await blobToArrayBuffer(blob));
    const document: DocumentRecord = {
      id: fixture.documentId,
      name: fixture.documentName,
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

  const existingGolden = await db.goldenAnswers.get(fixture.goldenId);
  if (!existingGolden) {
    const golden: GoldenAnswer = {
      id: fixture.goldenId,
      documentId: fixture.documentId,
      profileId: fixture.profileId,
      profileVersion: 1,
      version: 1,
      json: fixture.golden,
      sha256: await sha256String(canonicalJson(fixture.golden)),
      schemaValid: true,
      createdAt: STABLE_CREATED_AT,
    };
    await db.goldenAnswers.put(golden);
  }
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
  loadNexabyteBlob: () => Promise<Blob> = loadNexabyteDocumentBlob,
): Promise<DemoFixtureIds> {
  await seedBundledFixture(db, {
    documentId: DEMO_DOCUMENT_ID,
    profileId: DEMO_PROFILE_ID,
    goldenId: DEMO_GOLDEN_ID,
    documentName: "popular-po-demo.pdf",
    profileName: `Demo: ${DEMO_NAME}`,
    description: "Bundled sample template used by the Home page demo.",
    prompt: DEMO_PROMPT,
    schema: DEMO_SCHEMA,
    golden: DEMO_GOLDEN,
    loadBlob,
  });
  await seedBundledFixture(db, {
    documentId: NEXABYTE_DOCUMENT_ID,
    profileId: NEXABYTE_PROFILE_ID,
    goldenId: NEXABYTE_GOLDEN_ID,
    documentName: "nexabyte-purchase-order.pdf",
    profileName: `Preset: ${NEXABYTE_NAME}`,
    description: "Full-page purchase order with supplier, delivery, line-item, total, and approval fields.",
    prompt: NEXABYTE_PROMPT,
    schema: NEXABYTE_SCHEMA,
    golden: NEXABYTE_GOLDEN,
    loadBlob: loadNexabyteBlob,
  });

  const existingProvider = await db.providerConfigs.get(DEMO_PROVIDER_CONFIG_ID);
  const provider: ProviderConfig = existingProvider
    ? {
        ...existingProvider,
        kind: "openai_compatible",
        name: "Demo GPT Gateway",
        baseUrl: DEMO_GATEWAY_BASE_URL,
        model: DEMO_GATEWAY_MODEL,
        settings: { ...existingProvider.settings, ...DEMO_GATEWAY_SETTINGS },
      }
    : {
        id: DEMO_PROVIDER_CONFIG_ID,
        kind: "openai_compatible",
        name: "Demo GPT Gateway",
        baseUrl: DEMO_GATEWAY_BASE_URL,
        model: DEMO_GATEWAY_MODEL,
        settings: DEMO_GATEWAY_SETTINGS,
      };
  await db.providerConfigs.put(provider);

  return {
    documentId: DEMO_DOCUMENT_ID,
    profileId: DEMO_PROFILE_ID,
    goldenId: DEMO_GOLDEN_ID,
    providerConfigId: DEMO_PROVIDER_CONFIG_ID,
  };
}
