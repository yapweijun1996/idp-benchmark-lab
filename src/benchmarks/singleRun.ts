import { canonicalJson } from "../evaluation/canonical";
import { blobToArrayBuffer } from "../documents/blob";
import { sha256Hex } from "../documents/hash";
import { composePrompt } from "../profiles/composePrompt";
import { validateData } from "../profiles/schema";
import { estimateCost } from "../cost/estimate";
import { PricingService } from "../cost/pricingService";
import { getApiKey } from "../providers/keys";
import { adapterFor, ALL_ADAPTERS } from "../providers/registry";
import { getDb, type IdpDatabase } from "../storage/db";
import type {
  BenchmarkIdentity,
  BenchmarkRun,
  BenchmarkSuite,
  DocumentRecord,
  ExtractionProfile,
  InputMode,
  NormalizedError,
  ProviderConfig,
} from "../storage/types";
import type { NormalizedExtractionResponse, ProviderAdapter, ProviderError } from "../providers/types";
import { DEFAULT_RENDER_SETTINGS, renderDocumentPages, type CanonicalRenderSettings, type PageRenderer } from "../documents/canonicalRenderer";
import type { PdfLoader } from "../documents/usePdfDocument";

export interface SingleRunInput {
  documentId: string;
  profileId: string;
  providerConfigId: string;
  goldenId?: string;
  mode: InputMode;
  temperature?: number;
  thinking?: string;
  renderSettings?: CanonicalRenderSettings;
}

export interface SingleRunResult {
  suite: BenchmarkSuite;
  run: BenchmarkRun;
  response: NormalizedExtractionResponse;
}

export interface SingleRunOptions {
  signal?: AbortSignal;
}

async function sha256String(value: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(value).buffer);
}

interface SingleRunServiceDeps {
  db?: IdpDatabase;
  adapters?: Partial<Record<ProviderConfig["kind"], ProviderAdapter>>;
  pdfLoader?: PdfLoader;
  pageRenderer?: PageRenderer;
  /** Blob lookup seam; production reads IndexedDB, tests inject real Blobs. */
  getBlob?: (document: DocumentRecord) => Promise<Blob | undefined>;
}

export class RunFailure extends Error {
  constructor(readonly error: NormalizedError) {
    super(error.message);
    this.name = "RunFailure";
  }
}

/**
 * Single extraction run (SPEC FR-007): loads the stored configuration,
 * prepares the provider input (native PDF or canonical images), calls the
 * adapter, evaluates schema validity, estimates cost, and persists run
 * evidence. Provider failures are recorded, never thrown silently.
 */
export class SingleRunService {
  private db: IdpDatabase;
  private adapters: Record<ProviderConfig["kind"], ProviderAdapter>;
  private pdfLoader?: PdfLoader;
  private pageRenderer?: PageRenderer;
  private getBlobImpl: (document: DocumentRecord) => Promise<Blob | undefined>;

  constructor(deps: SingleRunServiceDeps = {}) {
    this.db = deps.db ?? getDb();
    this.adapters = {
      openai: adapterFor("openai"),
      gemini: adapterFor("gemini"),
      openai_compatible: adapterFor("openai_compatible"),
      ...deps.adapters,
    };
    this.pdfLoader = deps.pdfLoader;
    this.pageRenderer = deps.pageRenderer;
    this.getBlobImpl =
      deps.getBlob ??
      (async (doc) => (await this.db.documents.get(doc.id))?.blob ?? doc.blob);
  }

  async run(input: SingleRunInput, options: SingleRunOptions = {}): Promise<SingleRunResult> {
    const now = new Date().toISOString();

    const document = await this.db.documents.get(input.documentId);
    const profile = await this.db.extractionProfiles.get(input.profileId);
    const config = await this.db.providerConfigs.get(input.providerConfigId);
    const golden = input.goldenId ? await this.db.goldenAnswers.get(input.goldenId) : undefined;
    if (!document || !profile || !config) {
      throw new RunFailure({
        category: "invalid_request",
        message: "Document, profile, or provider config not found. Check your selections.",
        retryable: false,
      });
    }

    const suite = await this.createSuite({ input, document, profile, config, golden, now });
    const runId = crypto.randomUUID();
    const runBase = {
      id: runId,
      suiteId: suite.id,
      runNumber: 1,
      state: "queued" as const,
      providerCalls: 0,
      createdAt: now,
    };
    await this.db.benchmarkRuns.put(runBase);

    const startedAt = performance.now();
    try {
      const apiKey = getApiKey(config.id);
      if (!apiKey) {
        throw new RunFailure({
          category: "auth",
          message: "No API key for this provider config. Enter it on the Providers page.",
          retryable: false,
        });
      }
      const adapter = this.adapters[config.kind];
      const capabilities = adapter.capabilities(config);
      const mode = input.mode;
      if (mode === "native_pdf" && !capabilities.nativePdf) {
        throw new RunFailure({
          category: "unsupported",
          message: `${config.kind} does not support native PDF input; use Canonical Images mode.`,
          retryable: false,
        });
      }
      const blob = await this.getDocumentBlob(document);
      const prompt = composePrompt(profile.basePrompt, profile.extractionContract, profile.jsonSchema);

      const request = await this.buildRequest(input, mode, blob, prompt, config, capabilities);

      const response = await adapter.extract(
        request,
        { config, apiKey, signal: options.signal },
      );

      const schemaCheck = validateData(response.json, profile.jsonSchema);
      const pricing = new PricingService(this.db);
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
      const state = schemaCheck.valid ? ("succeeded" as const) : ("schema_invalid" as const);
      const outputHash = await sha256String(canonicalJson(response.json));

      const run: BenchmarkRun = {
        ...runBase,
        state,
        latencyMs,
        safeRawResponse: response.raw,
        parsedJson: response.json,
        schemaValid: schemaCheck.valid,
        outputHash,
        providerCalls: response.providerCalls,
        usage: response.usage,
        costUsd: cost.usd,
        finishedAt: new Date().toISOString(),
      };
      await this.db.benchmarkRuns.put(run);

      // Both succeeded and schema_invalid runs mean the suite itself
      // finished executing; the per-run state carries the outcome.
      const finalSuite: BenchmarkSuite = {
        ...suite,
        status: "completed",
        costUsdKnown: cost.usd,
        finishedAt: new Date().toISOString(),
      };
      await this.db.benchmarkSuites.put(finalSuite);

      return { suite: finalSuite, run, response };
    } catch (e) {
      const err = e instanceof RunFailure ? e.error : this.normalize(e);
      const latencyMs = Math.round(performance.now() - startedAt);
      const run: BenchmarkRun = {
        ...runBase,
        state: "provider_error",
        latencyMs,
        providerCalls: 1,
        error: err,
        finishedAt: new Date().toISOString(),
      };
      await this.db.benchmarkRuns.put(run);
      const failedSuite: BenchmarkSuite = {
        ...suite,
        status: "failed",
        finishedAt: new Date().toISOString(),
      };
      await this.db.benchmarkSuites.put(failedSuite);
      throw new RunFailure(err);
    }
  }

  private async createSuite(args: {
    input: SingleRunInput;
    document: DocumentRecord;
    profile: ExtractionProfile;
    config: ProviderConfig;
    golden?: { version: number; sha256: string; id: string };
    now: string;
  }): Promise<BenchmarkSuite> {
    const { input, document, profile, config, golden, now } = args;
    const identity: BenchmarkIdentity = {
      documentSha256: document.sha256,
      profileId: profile.id,
      profileVersion: profile.version,
      promptSha256: profile.promptSha256,
      schemaSha256: profile.schemaSha256,
      normalizationPolicySha256: profile.normalizationPolicySha256,
      goldenId: golden?.id,
      goldenVersion: golden?.version,
      goldenSha256: golden?.sha256,
      providerKind: config.kind,
      model: config.model,
      thinking: input.thinking,
      temperature: input.temperature,
      inputMode: input.mode,
      rendererSettings: input.renderSettings ?? (input.mode === "canonical_images" ? DEFAULT_RENDER_SETTINGS : undefined),
      concurrency: 1,
      retryPolicyVersion: 1,
      appBuild: typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "0.1.0",
    };
    const suite: BenchmarkSuite = {
      id: crypto.randomUUID(),
      name: `Single run — ${profile.name}`,
      identity,
      requestedRuns: 1,
      concurrency: 1,
      status: "running",
      createdAt: now,
      startedAt: now,
    };
    await this.db.benchmarkSuites.put(suite);
    return suite;
  }

  private async getDocumentBlob(document: DocumentRecord): Promise<Blob> {
    const blob = await this.getBlobImpl(document);
    if (!blob) {
      throw new RunFailure({
        category: "invalid_request",
        message: "Document blob is not available (session documents are lost on reload).",
        retryable: false,
      });
    }
    return blob;
  }

  private async buildRequest(
    input: SingleRunInput,
    mode: InputMode,
    blob: Blob,
    prompt: string,
    config: ProviderConfig,
    capabilities: { imageInput: boolean },
  ) {
    const temperature = input.temperature;
    const thinking = input.thinking;
    if (mode === "native_pdf") {
      const documentBytes = await blobToArrayBuffer(blob);
      return {
        mode: "native_pdf" as const,
        documentBytes,
        documentMimeType: "application/pdf",
        prompt,
        temperature,
        thinking,
      };
    }
    if (!capabilities.imageInput) {
      throw new RunFailure({
        category: "unsupported",
        message: `${config.kind} is configured without image input support.`,
        retryable: false,
      });
    }
    if (!this.pdfLoader) {
      throw new RunFailure({
        category: "invalid_request",
        message: "PDF loader unavailable for canonical image rendering.",
        retryable: false,
      });
    }
    const task = this.pdfLoader({ data: blob });
    let pdf;
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
      const settings = input.renderSettings ?? DEFAULT_RENDER_SETTINGS;
      const images = await renderDocumentPages(pdf, settings, this.pageRenderer ?? missingRenderer());
      return {
        mode: "canonical_images" as const,
        images,
        prompt,
        temperature,
        thinking,
      };
    } finally {
      void task.destroy();
    }
  }

  private normalize(e: unknown): NormalizedError {
    if (e instanceof RunFailure) {
      return e.error;
    }
    if (e && typeof e === "object" && "category" in e && "message" in e) {
      const err = e as ProviderError;
      return {
        category: err.category,
        message: err.message,
        status: err.status,
        retryable: err.retryable,
      };
    }
    if (e instanceof DOMException && e.name === "AbortError") {
      return { category: "provider", message: "Run cancelled", retryable: false };
    }
    return {
      category: "unknown",
      message: e instanceof Error ? e.message : String(e),
      retryable: false,
    };
  }
}

function missingRenderer(): PageRenderer {
  return {
    async render() {
      throw new Error("Page renderer is unavailable in this environment.");
    },
  };
}

export { ALL_ADAPTERS };
