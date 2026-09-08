import Ajv from "ajv";
import { canonicalJson } from "../evaluation/canonical";
import { sha256Hex } from "../documents/hash";
import type { BackupEntities } from "./backup";
const str = { type: "string" };
const id = { type: "string", minLength: 1 };
const hash = { type: "string", pattern: "^[a-f0-9]{64}$" };
const num = { type: "number", minimum: 0 };
const int = { type: "integer", minimum: 0 };
const positive = { type: "integer", minimum: 1 };
const bool = { type: "boolean" };
const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}(?:T.*)?$" };
const enumeration = (...values: string[]) => ({ enum: values });
const object = (properties: Record<string, unknown>, required: string[] = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });
const optional = (properties: Record<string, unknown>, required: string[]) => object(properties, required);
const policy = object({ trimOuterWhitespace: bool, normalizeLineEndings: bool });
const document = optional({ id, name: str, mimeType: { const: "application/pdf" }, size: int, sha256: hash, pageCount: positive, createdAt: date, storageMode: enumeration("session", "indexeddb"), blobBase64: str }, ["id", "name", "mimeType", "size", "sha256", "createdAt", "storageMode"]);
const profile = optional({ id, name: str, description: str, version: positive, basePrompt: str, extractionContract: {}, jsonSchema: {}, normalizationPolicy: policy, normalizationPolicySha256: hash, promptSha256: hash, schemaSha256: hash, createdAt: date, updatedAt: date }, ["id", "name", "version", "basePrompt", "extractionContract", "jsonSchema", "promptSha256", "schemaSha256", "createdAt", "updatedAt"]);
const golden = object({ id, documentId: id, profileId: id, profileVersion: positive, version: positive, json: {}, sha256: hash, schemaValid: bool, createdAt: date });
const provider = optional({ id, kind: enumeration("openai", "gemini", "openai_compatible"), name: str, baseUrl: str, model: id, settings: { type: "object" }, pricingSnapshotId: id }, ["id", "kind", "name", "model", "settings"]);
const pricing = optional({ id, provider: id, model: id, currency: { const: "USD" }, inputPerMillion: num, cachedInputPerMillion: num, outputPerMillion: num, flatPerRequest: num, maximumAttemptCostUsd: num, maximumAttemptCostSource: id, effectiveAt: date, sourceNote: str }, ["id", "provider", "model", "currency", "effectiveAt"]);
const identity = optional({ documentSha256: hash, profileId: id, profileVersion: positive, promptSha256: hash, schemaSha256: hash, normalizationPolicySha256: hash, goldenId: id, goldenVersion: positive, goldenSha256: hash, providerKind: enumeration("openai", "gemini", "openai_compatible"), model: id, thinking: str, temperature: { type: "number" }, inputMode: enumeration("native_pdf", "canonical_images"), rendererSettings: {}, concurrency: positive, retryPolicyVersion: positive, appBuild: id, effectiveInputSha256: hash }, ["documentSha256", "profileId", "profileVersion", "promptSha256", "schemaSha256", "providerKind", "model", "inputMode", "concurrency", "retryPolicyVersion", "appBuild"]);
const snapshot = object({ inputImages: { type: "array", minItems: 1, items: object({ mimeType: enumeration("image/png", "image/jpeg"), dataUrl: str }) }, document, inputBase64: str, profile, golden, provider, effectivePrompt: str, effectiveSchema: {}, pricing: { anyOf: [pricing, { type: "null" }] }, settings: {} }, ["document", "inputBase64", "profile", "provider", "effectivePrompt", "effectiveSchema", "pricing", "settings"]);
const suite = optional({ id, name: str, identity, requestedRuns: positive, concurrency: positive, maxBudgetUsd: num, stopReason: str, status: enumeration("draft", "running", "completed", "stopped", "budget_stopped", "failed"), createdAt: date, startedAt: date, finishedAt: date, costUsdKnown: num, evidenceVersion: { const: 2 }, snapshot, legacyEvidence: { const: "unavailable" } }, ["id", "identity", "requestedRuns", "concurrency", "status", "createdAt"]);
const error = optional({ category: enumeration("auth", "rate_limit", "network", "cors", "invalid_request", "unsupported", "provider", "unknown"), message: str, status: int, retryable: bool }, ["category", "message", "retryable"]);
const usage = optional({ inputTokens: int, outputTokens: int, cachedInputTokens: int, totalTokens: int }, []);
const mismatches = { type: "array", items: optional({ path: str, expected: {}, actual: {} }, ["path"]) };
const attempt = optional({ number: positive, startedAt: date, finishedAt: date, latencyMs: num, raw: str, envelope: str, usage, costUsd: num, costSource: enumeration("provider_reported", "usage_snapshot", "flat", "unknown"), error, parseError: str }, ["number", "startedAt"]);
const run = optional({ pendingAttempt: object({ number: positive, preparedAt: date }), id, suiteId: id, runNumber: positive, state: enumeration("queued", "running", "succeeded", "provider_error", "parse_error", "schema_invalid", "cancelled"), latencyMs: num, safeRawResponse: str, parsedJson: {}, schemaValid: bool, exactMatch: bool, leafAccuracy: { ...num, maximum: 1 }, rowAccuracy: { ...num, maximum: 1 }, rowMatched: int, rowTotal: int, fieldMismatches: mismatches, outputHash: hash, providerCalls: int, usage, costUsd: num, error, createdAt: date, finishedAt: date, attempts: { type: "array", items: attempt }, exactMatchNormalized: bool, leafAccuracyNormalized: { ...num, maximum: 1 }, rowMatchedNormalized: int, rowTotalNormalized: int, fieldMismatchesNormalized: mismatches, normalizationPolicy: policy }, ["id", "suiteId", "runNumber", "state", "providerCalls", "createdAt"]);
const settings = object({ id: { const: "app" }, language: enumeration("en", "zh", "ms", "ja", "vi"), defaultProviderId: id, defaultConcurrency: positive, defaultInputMode: enumeration("native_pdf", "canonical_images"), defaultRunCount: positive, theme: enumeration("light", "dark", "system"), showSecretsWarning: bool, updatedAt: date }, ["id", "defaultConcurrency", "defaultInputMode", "defaultRunCount", "theme", "showSecretsWarning", "updatedAt"]);
const ajv = new Ajv({ strict: false, allErrors: true });
const schemas = { documents: document, extractionProfiles: profile, goldenAnswers: golden, providerConfigs: provider, pricingSnapshots: pricing, benchmarkSuites: suite, benchmarkRuns: run, appSettings: settings };
const validators = Object.fromEntries(Object.entries(schemas).map(([key, schema]) => [key, ajv.compile(schema)]));
const digest = (text: string) => sha256Hex(new TextEncoder().encode(text).buffer);
function fail(): never { throw new Error("Backup entity, hash, or reference validation failed; no data was changed."); }
function bytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) fail();
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
/** Validate the entire graph before starting a write transaction. Never repair imported evidence. */
export async function validateBackupEntities(entities: BackupEntities): Promise<void> {
  for (const [store, records] of Object.entries(entities)) {
    const validate = validators[store];
    if (!validate || !Array.isArray(records)) fail();
    const ids = new Set<string>();
    for (const record of records) {
      if (!validate(record) || typeof record.id !== "string" || ids.has(record.id)) fail();
      ids.add(record.id as string);
    }
  }
  for (const record of entities.documents) {
    if (record.blobBase64 !== undefined) {
      const data = bytes(record.blobBase64);
      if (data.length !== record.size || await sha256Hex(data.buffer) !== record.sha256) fail();
    }
  }
  for (const record of entities.extractionProfiles) {
    if (await digest(record.basePrompt) !== record.promptSha256 || await digest(canonicalJson(record.jsonSchema)) !== record.schemaSha256) fail();
  }
  for (const record of entities.goldenAnswers) {
    if (!entities.documents.some((d) => d.id === record.documentId) || !entities.extractionProfiles.some((p) => p.id === record.profileId && p.version >= record.profileVersion) || await digest(canonicalJson(record.json)) !== record.sha256) fail();
  }
  for (const record of entities.providerConfigs) {
    if (record.pricingSnapshotId && !entities.pricingSnapshots.some((p) => p.id === record.pricingSnapshotId && p.provider === record.kind && p.model === record.model)) fail();
  }
  for (const record of entities.benchmarkSuites) {
    if (record.snapshot) {
      const s = record.snapshot;
      if (record.evidenceVersion !== 2 || await digest(canonicalJson(s)) !== record.identity.effectiveInputSha256 || await sha256Hex(bytes(s.inputBase64).buffer) !== record.identity.documentSha256 || s.document.sha256 !== record.identity.documentSha256 || s.profile.id !== record.identity.profileId || s.profile.version !== record.identity.profileVersion || s.provider.kind !== record.identity.providerKind || s.provider.model !== record.identity.model) fail();
      if (s.golden && (s.golden.id !== record.identity.goldenId || s.golden.version !== record.identity.goldenVersion || await digest(canonicalJson(s.golden.json)) !== record.identity.goldenSha256)) fail();
    } else if (record.evidenceVersion === 2) fail();
  }
  const numbers = new Set<string>();
  for (const record of entities.benchmarkRuns) {
    const parent = entities.benchmarkSuites.find((s) => s.id === record.suiteId);
    const key = `${record.suiteId}:${record.runNumber}`;
    if (!parent || record.runNumber > parent.requestedRuns || numbers.has(key)) fail();
    numbers.add(key);
    if (record.outputHash && (record.parsedJson === undefined || await digest(canonicalJson(record.parsedJson)) !== record.outputHash)) fail();
    if (record.attempts && (record.attempts.length !== record.providerCalls || record.attempts.some((a, i) => a.number !== i + 1))) fail();
    if ((record.rowMatched ?? 0) > (record.rowTotal ?? 0) || (record.rowMatchedNormalized ?? 0) > (record.rowTotalNormalized ?? 0)) fail();
  }
  for (const record of entities.appSettings) if (record.defaultProviderId && !entities.providerConfigs.some((p) => p.id === record.defaultProviderId)) fail();
}
