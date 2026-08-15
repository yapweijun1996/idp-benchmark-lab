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

export { RunFailure };
export type { ExecuteDeps, RunOutcome };

export interface SingleRunInput {
  documentId: string;
  profileId: string;
  providerConfigId: string;
  goldenId?: string;
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

    try {
      const outcome = await executeExtraction(this.deps, {
        document,
        profile,
        config,
        mode: input.mode,
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
      const run: BenchmarkRun = {
        ...runBase,
        state: "provider_error",
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

