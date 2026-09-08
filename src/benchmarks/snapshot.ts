import { blobToArrayBuffer } from "../documents/blob";
import { sha256Hex } from "../documents/hash";
import { getSessionDocumentBlob } from "../documents/sessionStore";
import { arrayBufferToBase64 } from "../providers/base64";
import { redact } from "../providers/redaction";
import { effectiveProviderConfig } from "../providers/registry";
import { canonicalJson } from "../evaluation/canonical";
import { composePrompt } from "../profiles/composePrompt";
import { PricingService } from "../cost/pricingService";
import { validateData } from "../profiles/schema";
import type { BenchmarkSuite, GoldenAnswer } from "../storage/types";
import type { ExecuteDeps, ExecuteInput } from "./execute";
import { buildRequest } from "./execute";

/** Capture the bytes and effective values once; execution and history share this basis. */
export async function freezeInputs(deps: ExecuteDeps, input: ExecuteInput, golden: GoldenAnswer | undefined, settings: unknown) {
  const blob = deps.getBlob ? await deps.getBlob(input.document) : input.document.blob ?? (input.document.blobBytes ? new Blob([input.document.blobBytes], { type: "application/pdf" }) : getSessionDocumentBlob(input.document.id));
  if (!blob) throw new Error("Document bytes unavailable; cannot freeze benchmark inputs.");
  const bytes = await blobToArrayBuffer(blob);
  const document = { ...input.document, sha256: await sha256Hex(bytes), blob };
  const { blob: omittedBlob, blobBytes: omittedBytes, ...metadata } = document;
  void omittedBlob;
  void omittedBytes;
  const schema = input.schemaOverride ?? input.profile.jsonSchema;
  if (golden && (golden.documentId !== input.document.id || golden.profileId !== input.profile.id || golden.profileVersion !== input.profile.version || !validateData(golden.json, schema).valid)) {
    throw new Error("Expected Result must match the selected document, profile version and effective schema. Review it before running.");
  }
  const fields = input.schemaOverride === undefined ? input.profile.extractionContract :
    schema && typeof schema === "object" && "properties" in schema && schema.properties && typeof schema.properties === "object" ? Object.keys(schema.properties) : [];
  const pricing = new PricingService(deps.db);
  const price = input.pricingSnapshot !== undefined ? input.pricingSnapshot :
    (input.config.pricingSnapshotId ? await pricing.get(input.config.pricingSnapshotId) : await pricing.latestFor(input.config.kind, input.config.model)) ?? null;
  if (price && (price.provider !== input.config.kind || price.model !== input.config.model || price.currency !== "USD")) throw new Error("Pricing snapshot does not match the provider and model.");
  const effectivePrompt = composePrompt(input.promptOverride ?? input.profile.basePrompt, fields, schema);
  const inputImages = input.mode === "canonical_images" ? (await buildRequest(deps, input, blob, effectivePrompt)).images : undefined;
  const snapshot: NonNullable<BenchmarkSuite["snapshot"]> = redact({
    document: metadata, inputBase64: arrayBufferToBase64(bytes), profile: input.profile, golden,
    provider: effectiveProviderConfig(input.config), effectivePrompt, inputImages,
    effectiveSchema: schema, pricing: price, settings,
  });
  return { document, snapshot, hash: await sha256Hex(new TextEncoder().encode(canonicalJson(snapshot)).buffer) };
}
