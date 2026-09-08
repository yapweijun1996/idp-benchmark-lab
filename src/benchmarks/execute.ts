import { canonicalJson } from "../evaluation/canonical";
import { AttemptBlocked } from "./budget";
import { blobToArrayBuffer } from "../documents/blob";
import { sha256Hex } from "../documents/hash";
import { composePrompt } from "../profiles/composePrompt";
import { validateData } from "../profiles/schema";
import { estimateCost, type CostSource } from "../cost/estimate";
import { evaluateOutput, type RunEvaluation } from "../evaluation/metrics";
import { PricingService } from "../cost/pricingService";
import { getApiKey } from "../providers/keys";
import { captureRedactor, redact } from "../providers/redaction";
import { adapterFor } from "../providers/registry";
import { isGatewayDemo } from "../providers/demoGateway";
import type { IdpDatabase } from "../storage/db";
import type {
  DocumentRecord,
  ExtractionProfile,
  InputMode,
  NormalizedError,
  ProviderConfig,
  PricingSnapshot,
} from "../storage/types";
import type {
  NormalizedExtractionRequest,
  NormalizedExtractionResponse,
  ProviderAdapter,
  ProviderError,
  GatewayRequestMeta,
  ProviderRequestLease,
  ProviderRequestSettlement,
} from "../providers/types";
import {
  DEFAULT_RENDER_SETTINGS,
  renderDocumentPages,
  type CanonicalRenderSettings,
  type PageRenderer,
} from "../documents/canonicalRenderer";
import type { PdfLoader } from "../documents/usePdfDocument";
import { getSessionDocumentBlob } from "../documents/sessionStore";

export interface ExecuteDeps {
  db: IdpDatabase;
  adapters?: Partial<Record<ProviderConfig["kind"], ProviderAdapter>>;
  pdfLoader?: PdfLoader;
  pageRenderer?: PageRenderer;
  /** Blob lookup seam; production reads IndexedDB, tests inject real Blobs. */
  getBlob?: (document: DocumentRecord) => Promise<Blob | undefined>;
}

export interface ExecuteInput {
  document: DocumentRecord;
  profile: ExtractionProfile;
  config: ProviderConfig;
  /** Optional prompt draft for this run; the saved profile remains unchanged. */
  promptOverride?: string;
  /** Optional JSON schema draft for this run; the saved profile remains unchanged. */
  schemaOverride?: unknown;
  mode: InputMode;
  temperature?: number;
  thinking?: string;
  renderSettings?: CanonicalRenderSettings;
  frozenImages?: NormalizedExtractionRequest["images"];
  signal?: AbortSignal;
  /** Golden JSON enables accuracy evaluation for this run. */
  goldenJson?: unknown;
  /** null freezes an explicitly unavailable price instead of rereading mutable configuration. */
  pricingSnapshot?: PricingSnapshot | null;
  beforeAttempt?: (meta?: GatewayRequestMeta) => void | ProviderRequestLease;
  prepareAttempt?: (meta?: GatewayRequestMeta) => Promise<void>;
}

export interface RunOutcome {
  response: NormalizedExtractionResponse;
  schemaValid: boolean;
  costUsd?: number;
  costSource: CostSource;
  latencyMs: number;
  outputHash?: string;
  /** Accuracy evaluation against the Golden Answer, when one was supplied. */
  evaluation?: RunEvaluation;
}

export class RunFailure extends Error {
  constructor(readonly error: NormalizedError, readonly outcome?: RunOutcome) {
    super(error.message);
    this.name = "RunFailure";
  }
}

async function sha256String(value: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(value).buffer);
}

/**
 * Executes ONE extraction without any persistence or suite bookkeeping.
 * Shared by the single-run service and the repeated benchmark runner, so
 * both follow exactly the same provider path (ADR-008).
 */
export async function executeExtraction(deps: ExecuteDeps, input: ExecuteInput): Promise<RunOutcome> {
  const { db, getBlob } = deps;
  const { document, profile, config } = input;

  const apiKey = getApiKey(config.id) ?? "";
  const redactEvidence = captureRedactor();
  if (!apiKey) {
    throw new RunFailure({
      category: "auth",
      message: "No API key for this provider config. Enter it on the Providers page.",
      retryable: false,
    });
  }

  const adapter = deps.adapters?.[config.kind] ?? adapterFor(config.kind);
  const capabilities = adapter.capabilities(config);
  const mode = input.mode;
  if (mode === "native_pdf" && !capabilities.nativePdf) {
    throw new RunFailure({
      category: "unsupported",
      message: `${config.kind} does not support native PDF input; use Canonical Images mode.`,
      retryable: false,
    });
  }

  const startedAt = performance.now();
  const blob = await resolveBlob(deps, getBlob, document);
  const schema = input.schemaOverride ?? profile.jsonSchema;
  const extractionContract = input.schemaOverride === undefined ? profile.extractionContract : topLevelFields(schema);
  const prompt = composePrompt(input.promptOverride ?? profile.basePrompt, extractionContract, schema);
  const request = await buildRequest(deps, input, blob, prompt);

  const pricing = new PricingService(db);
  const snapshot = input.pricingSnapshot !== undefined ? input.pricingSnapshot ?? undefined : config.pricingSnapshotId
    ? await pricing.get(config.pricingSnapshotId)
    : await pricing.latestFor(config.kind, config.model);

  const settleRequest = (lease: ProviderRequestLease | undefined, response?: NormalizedExtractionResponse): ProviderRequestSettlement | undefined => {
    if (!lease) return undefined;
    const requestCost = estimateCost({
      providerReportedCostUsd: response?.providerReportedCostUsd,
      usage: response?.usage,
      snapshot,
      flatPerRequest: typeof snapshot?.flatPerRequest === "number" ? snapshot.flatPerRequest : undefined,
    });
    // A completed response can settle a flat/usage estimate. A lost response
    // cannot prove billing, so keep the reservation and report unknown cost.
    const settled = response !== undefined && requestCost.usd !== undefined;
    lease.settle(settled ? requestCost.usd : undefined);
    return settled ? { costUsd: requestCost.usd, costSource: requestCost.source } : { costSource: "unknown" };
  };

  const createRequestGate = () => ({
    beforeRequest: async (meta: GatewayRequestMeta): Promise<ProviderRequestLease> => {
      await input.prepareAttempt?.(meta);
      const lease = input.beforeAttempt?.(meta);
      return lease ?? { settle: () => undefined };
    },
    afterResponse: (lease: ProviderRequestLease | undefined, response?: NormalizedExtractionResponse): ProviderRequestSettlement | undefined => {
      return settleRequest(lease, response);
    },
  });

  let response: NormalizedExtractionResponse;
  let failure: NormalizedError | undefined;
  try {
    if (isGatewayDemo(config)) {
      response = redactEvidence(await adapter.extract(request, { config, apiKey, signal: input.signal, requestGate: createRequestGate() }));
    } else {
      const meta: GatewayRequestMeta = { phase: "map", index: 1, total: 1 };
      await input.prepareAttempt?.(meta);
      const lease = input.beforeAttempt?.(meta);
      try {
        response = redactEvidence(await adapter.extract(request, { config, apiKey, signal: input.signal }));
      } catch (error) {
        settleRequest(lease && typeof lease === "object" ? lease : undefined, undefined);
        throw error;
      }
      settleRequest(lease && typeof lease === "object" ? lease : undefined, response);
    }
  }
  catch (error) {
    // A generic provider has no adapter layer to retain a pre-dispatch gate
    // refusal. Let the runner classify it directly so no synthetic provider
    // call or attempt evidence is created. The Gateway Demo adapter preserves
    // partial map/reduce evidence itself before this point.
    if (error instanceof AttemptBlocked) throw error;
    failure = redactEvidence(normalizeFailure(error));
    const evidence = error && typeof error === "object" && "evidence" in error ? (error as ProviderError).evidence : undefined;
    response = redactEvidence(evidence ?? { raw: "", json: undefined, providerCalls: 1 });
  }

  const schemaCheck = validateData(response.json, schema);
  const hasFailedProviderAttempt = response.providerAttempts?.some((attempt) => Boolean(attempt.error)) ?? false;
  const cost = hasFailedProviderAttempt
    ? { usd: undefined, source: "unknown" as CostSource }
    : estimateCost({
        providerReportedCostUsd: response.providerReportedCostUsd,
        usage: response.usage,
        snapshot,
        flatPerRequest: typeof snapshot?.flatPerRequest === "number" ? snapshot.flatPerRequest : undefined,
      });

  const latencyMs = Math.round(performance.now() - startedAt);
  const outputHash = response.json === undefined ? undefined : await sha256String(canonicalJson(response.json));
  const evaluation =
    input.goldenJson !== undefined && response.json !== undefined
      ? evaluateOutput(input.goldenJson, response.json, { normalizationPolicy: profile.normalizationPolicy })
      : undefined;
  const outcome: RunOutcome = {
    response,
    schemaValid: schemaCheck.valid,
    costUsd: cost.usd,
    costSource: cost.source,
    latencyMs,
    outputHash,
    evaluation,
  };
  if (failure) throw new RunFailure(failure, outcome);
  return outcome;
}

function topLevelFields(schema: unknown): string[] {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return [];
  const properties = (schema as { properties?: unknown }).properties;
  return properties && typeof properties === "object" && !Array.isArray(properties) ? Object.keys(properties) : [];
}

async function resolveBlob(
  deps: ExecuteDeps,
  getBlob: ExecuteDeps["getBlob"],
  document: DocumentRecord,
): Promise<Blob> {
  if (document.blob) return document.blob;
  const impl =
    getBlob ?? (async (doc) => (await deps.db.documents.get(doc.id))?.blob ?? getSessionDocumentBlob(doc.id) ?? doc.blob);
  const blob = await impl(document);
  if (!blob) {
    throw new RunFailure({
      category: "invalid_request",
      message: "Document blob is not available (session documents are lost on reload).",
      retryable: false,
    });
  }
  return blob;
}

export async function buildRequest(
  deps: ExecuteDeps,
  input: ExecuteInput,
  blob: Blob,
  prompt: string,
): Promise<NormalizedExtractionRequest> {
  const { config, mode, temperature, thinking, renderSettings } = input;
  const effectiveThinking = thinking ?? configuredThinking(config);
  if (mode === "native_pdf") {
    const documentBytes = await blobToArrayBuffer(blob);
    return { mode, documentBytes, documentMimeType: "application/pdf", documentName: input.document.name, prompt, temperature, thinking: effectiveThinking };
  }
  const adapter = deps.adapters?.[config.kind] ?? adapterFor(config.kind);
  if (!adapter.capabilities(config).imageInput) {
    throw new RunFailure({
      category: "unsupported",
      message: `${config.kind} is configured without image input support.`,
      retryable: false,
    });
  }
  if (input.frozenImages) return { mode, images: structuredClone(input.frozenImages), documentName: input.document.name, prompt, temperature, thinking: effectiveThinking };
  if (!deps.pdfLoader) {
    throw new RunFailure({
      category: "invalid_request",
      message: "PDF loader unavailable for canonical image rendering.",
      retryable: false,
    });
  }
  const pdfBytes = await blobToArrayBuffer(blob);
  const task = deps.pdfLoader({ data: pdfBytes });
  let pdf: { numPages: number; getPage(n: number): Promise<unknown> };
  try {
    pdf = await task.promise;
  } catch (e) {
    throw new RunFailure({
      category: "invalid_request",
      message: `PDF parsing failed: ${e instanceof Error ? e.message : String(e)}`,
      retryable: false,
    });
  }
  try {
    const settings = renderSettings ?? DEFAULT_RENDER_SETTINGS;
    const images = await renderDocumentPages(pdf, settings, deps.pageRenderer ?? missingRenderer());
    return { mode, images, documentName: input.document.name, prompt, temperature, thinking: effectiveThinking };
  } finally {
    void task.destroy();
  }
}

/** Returns the provider-card default when a run has no per-run override. */
export function configuredThinking(config: ProviderConfig): string | undefined {
  const key = config.kind === "openai" ? "reasoningEffort" : config.kind === "gemini" ? "thinkingLevel" : undefined;
  const value = key ? config.settings[key] : undefined;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function missingRenderer(): PageRenderer {
  return {
    async render() {
      throw new Error("Page renderer is unavailable in this environment.");
    },
  };
}

/** Normalizes any thrown value into a stable ProviderError. */
export function normalizeFailure(e: unknown): NormalizedError {
  return redact(normalizeFailureValue(e));
}
function normalizeFailureValue(e: unknown): NormalizedError {
  if (e instanceof RunFailure) {
    return e.error;
  }
  if (e && typeof e === "object" && "category" in e && "message" in e) {
    const err = e as ProviderError;
    return { category: err.category, message: err.message, status: err.status, retryable: err.retryable };
  }
  if (e instanceof DOMException && e.name === "AbortError") {
    return { category: "provider", message: "Run cancelled", retryable: false };
  }
  return { category: "unknown", message: e instanceof Error ? e.message : String(e), retryable: false };
}
