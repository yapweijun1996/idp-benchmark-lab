import { getDb } from "../storage/db";
import type {
  BenchmarkIdentity,
  BenchmarkRun,
  BenchmarkSuite,
  DocumentRecord,
  ExtractionProfile,
  ProviderConfig,
} from "../storage/types";
import type { NormalizedExtractionResponse } from "../providers/types";
import type { CanonicalRenderSettings } from "../documents/canonicalRenderer";
import { executeExtraction, normalizeFailure, RunFailure, type ExecuteDeps, type RunOutcome } from "./execute";
import { DEFAULT_RENDER_SETTINGS } from "../documents/canonicalRenderer";
import { sha256Hex } from "../documents/hash";
import { canonicalJson } from "../evaluation/canonical";

export { RunFailure };
export type { ExecuteDeps, RunOutcome };

export interface SingleRunInput {
  documentId: string;
  profileId: string;
  providerConfigId: string;
  goldenId?: string;
  /** Optional prompt draft for this run; the saved profile remains unchanged. */
  promptOverride?: string;
  /** Optional JSON schema draft for this run; the saved profile remains unchanged. */
  schemaOverride?: unknown;
  mode: "native_pdf" | "canonical_images";
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

export type SingleRunServiceDeps = ExecuteDeps;

/**
 * Single extraction run (SPEC FR-007): loads the stored configuration,
 * executes one extraction through the shared engine, and persists run
 * evidence with an immutable benchmark identity (FR-017).
 */
export class SingleRunService {
  private deps: SingleRunServiceDeps;

  constructor(deps: Partial<SingleRunServiceDeps> = {}) {
    this.deps = {
      db: deps.db ?? getDb(),
      ...deps,
    } as SingleRunServiceDeps;
  }

  async run(input: SingleRunInput, options: SingleRunOptions = {}): Promise<SingleRunResult> {
    const db = this.deps.db;
    const now = new Date().toISOString();

    const document = await db.documents.get(input.documentId);
    const profile = await db.extractionProfiles.get(input.profileId);
    const config = await db.providerConfigs.get(input.providerConfigId);
    const golden = input.goldenId ? await db.goldenAnswers.get(input.goldenId) : undefined;
    if (!document || !profile || !config) {
      throw new RunFailure({
        category: "invalid_request",
        message: "Document, profile, or provider config not found. Check your selections.",
        retryable: false,
      });
    }

    const suite = await this.createSuite({ input, document, profile, config, golden, now });
    const runBase: BenchmarkRun = {
      id: crypto.randomUUID(),
      suiteId: suite.id,
      runNumber: 1,
      state: "queued",
      providerCalls: 0,
      createdAt: now,
    };
    await db.benchmarkRuns.put(runBase);
    await db.benchmarkRuns.put({ ...runBase, state: "running" });

    try {
      const outcome = await executeExtraction(this.deps, {
        document,
        profile,
        config,
        mode: input.mode,
        promptOverride: input.promptOverride,
        schemaOverride: input.schemaOverride,
        temperature: input.temperature,
        thinking: input.thinking,
        renderSettings: input.renderSettings,
        signal: options.signal,
        goldenJson: golden?.json,
      });
      const state = outcome.schemaValid ? ("succeeded" as const) : ("schema_invalid" as const);
      const run: BenchmarkRun = {
        ...runBase,
        state,
        latencyMs: outcome.latencyMs,
        safeRawResponse: outcome.response.raw,
        parsedJson: outcome.response.json,
        schemaValid: outcome.schemaValid,
        exactMatch: outcome.evaluation?.exactMatch,
        leafAccuracy: outcome.evaluation?.leafAccuracy.accuracy,
        rowAccuracy: rowAccuracyOf(outcome.evaluation),
        rowMatched: outcome.evaluation?.rowComparison.matchedRows,
        rowTotal: outcome.evaluation?.rowComparison.goldenRows,
        fieldMismatches: outcome.evaluation?.leafAccuracy.mismatches,
        outputHash: outcome.outputHash,
        providerCalls: outcome.response.providerCalls,
        usage: outcome.response.usage,
        costUsd: outcome.costUsd,
        finishedAt: new Date().toISOString(),
      };
      await db.benchmarkRuns.put(run);

      const finalSuite: BenchmarkSuite = {
        ...suite,
        status: "completed",
        costUsdKnown: outcome.costUsd,
        finishedAt: new Date().toISOString(),
      };
      await db.benchmarkSuites.put(finalSuite);

      return { suite: finalSuite, run, response: outcome.response };
    } catch (e) {
      const err = normalizeFailure(e);
      const cancelled = e instanceof DOMException && e.name === "AbortError";
      const run: BenchmarkRun = {
        ...runBase,
        state: cancelled ? "cancelled" : "provider_error",
        providerCalls: 1,
        error: err,
        finishedAt: new Date().toISOString(),
      };
      await db.benchmarkRuns.put(run);
      const failedSuite: BenchmarkSuite = {
        ...suite,
        status: "failed",
        finishedAt: new Date().toISOString(),
      };
      await db.benchmarkSuites.put(failedSuite);
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
    const promptSha256 = await sha256Hex(
      new TextEncoder().encode(input.promptOverride ?? profile.basePrompt).buffer,
    );
    const schemaSha256 =
      input.schemaOverride === undefined
        ? profile.schemaSha256
        : await sha256Hex(new TextEncoder().encode(canonicalJson(input.schemaOverride)).buffer);
    const identity: BenchmarkIdentity = {
      documentSha256: document.sha256,
      profileId: profile.id,
      profileVersion: profile.version,
      promptSha256,
      schemaSha256,
      normalizationPolicySha256: profile.normalizationPolicySha256,
      goldenId: golden?.id,
      goldenVersion: golden?.version,
      goldenSha256: golden?.sha256,
      providerKind: config.kind,
      model: config.model,
      thinking: input.thinking,
      temperature: input.temperature,
      inputMode: input.mode,
      rendererSettings:
        input.renderSettings ?? (input.mode === "canonical_images" ? DEFAULT_RENDER_SETTINGS : undefined),
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
    await this.deps.db.benchmarkSuites.put(suite);
    return suite;
  }
}

function rowAccuracyOf(evaluation: RunOutcome["evaluation"]): number | undefined {
  const rows = evaluation?.rowComparison;
  if (!rows || rows.goldenRows === 0) {
    return undefined;
  }
  return rows.matchedRows / rows.goldenRows;
}

