import { canonicalJson } from "../evaluation/canonical";
import { blobToArrayBuffer } from "../documents/blob";
import { sha256Hex } from "../documents/hash";
import { composePrompt } from "../profiles/composePrompt";
import { validateData } from "../profiles/schema";
import { estimateCost, type CostSource } from "../cost/estimate";
import { evaluateOutput, type RunEvaluation } from "../evaluation/metrics";
import { PricingService } from "../cost/pricingService";
import { getApiKey } from "../providers/keys";
import { adapterFor } from "../providers/registry";
import type { IdpDatabase } from "../storage/db";
import type {
  DocumentRecord,
  ExtractionProfile,
  InputMode,
  NormalizedError,
  ProviderConfig,
} from "../storage/types";
import type {
  NormalizedExtractionRequest,
  NormalizedExtractionResponse,
  ProviderAdapter,
  ProviderError,
} from "../providers/types";
import {
  DEFAULT_RENDER_SETTINGS,
  renderDocumentPages,
  type CanonicalRenderSettings,
  type PageRenderer,
} from "../documents/canonicalRenderer";
import type { PdfLoader } from "../documents/usePdfDocument";

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
  mode: InputMode;
  temperature?: number;
  thinking?: string;
  renderSettings?: CanonicalRenderSettings;
  signal?: AbortSignal;
  /** Golden JSON enables accuracy evaluation for this run. */
  goldenJson?: unknown;
}

export interface RunOutcome {
  response: NormalizedExtractionResponse;
  schemaValid: boolean;
  costUsd?: number;
  costSource: CostSource;
  latencyMs: number;
  outputHash: string;
  /** Accuracy evaluation against the Golden Answer, when one was supplied. */
  evaluation?: RunEvaluation;
}

export class RunFailure extends Error {
  constructor(readonly error: NormalizedError) {
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

  const apiKey = getApiKey(config.id);
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
  const prompt = composePrompt(profile.basePrompt, profile.extractionContract, profile.jsonSchema);
  const request = await buildRequest(deps, input, blob, prompt);

  const response = await adapter.extract(request, { config, apiKey, signal: input.signal });

  const schemaCheck = validateData(response.json, profile.jsonSchema);
  const pricing = new PricingService(db);
  const snapshot = config.pricingSnapshotId
    ? await pricing.get(config.pricingSnapshotId)
    : await pricing.latestFor(config.kind, config.model);
  const cost = estimateCost({
    providerReportedCostUsd: response.providerReportedCostUsd,
    usage: response.usage,
    snapshot,
    flatPerRequest: typeof snapshot?.flatPerRequest === "number" ? snapshot.flatPerRequest : undefined,
  });

  const latencyMs = Math.round(performance.now() - startedAt);
  const outputHash = await sha256String(canonicalJson(response.json));
  const evaluation =
    input.goldenJson !== undefined
      ? evaluateOutput(input.goldenJson, response.json, { normalizationPolicy: profile.normalizationPolicy })
      : undefined;
  return {
    response,
    schemaValid: schemaCheck.valid,
    costUsd: cost.usd,
    costSource: cost.source,
    latencyMs,
    outputHash,
    evaluation,
  };
}

async function resolveBlob(
  deps: ExecuteDeps,
  getBlob: ExecuteDeps["getBlob"],
  document: DocumentRecord,
): Promise<Blob> {
  const impl =
    getBlob ?? (async (doc) => (await deps.db.documents.get(doc.id))?.blob ?? doc.blob);
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

async function buildRequest(
  deps: ExecuteDeps,
  input: ExecuteInput,
  blob: Blob,
  prompt: string,
): Promise<NormalizedExtractionRequest> {
  const { config, mode, temperature, thinking, renderSettings } = input;
  if (mode === "native_pdf") {
    const documentBytes = await blobToArrayBuffer(blob);
    return { mode, documentBytes, documentMimeType: "application/pdf", prompt, temperature, thinking };
  }
  const adapter = deps.adapters?.[config.kind] ?? adapterFor(config.kind);
  if (!adapter.capabilities(config).imageInput) {
    throw new RunFailure({
      category: "unsupported",
      message: `${config.kind} is configured without image input support.`,
      retryable: false,
    });
  }
  if (!deps.pdfLoader) {
    throw new RunFailure({
      category: "invalid_request",
      message: "PDF loader unavailable for canonical image rendering.",
      retryable: false,
    });
  }
  const task = deps.pdfLoader({ data: blob });
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
    return { mode, images, prompt, temperature, thinking };
  } finally {
    void task.destroy();
  }
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
