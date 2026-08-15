import { getDb } from "../storage/db";
import type {
  BenchmarkIdentity,
  BenchmarkRun,
  BenchmarkSuite,
  DocumentRecord,
  ExtractionProfile,
  ProviderConfig,
} from "../storage/types";
import { DEFAULT_RENDER_SETTINGS } from "../documents/canonicalRenderer";
import { executeExtraction, normalizeFailure, RunFailure, type ExecuteDeps } from "./execute";
import type { SingleRunInput } from "./singleRun";

export const RUN_PRESETS = [5, 10, 20, 50, 100] as const;
export type RunPreset = (typeof RUN_PRESETS)[number];

export interface RetryPolicy {
  /** Total attempts per run, including the first try. */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 2,
  baseDelayMs: 500,
  maxDelayMs: 8000,
};

export interface BenchmarkConfig extends SingleRunInput {
  requestedRuns: number;
  concurrency?: number;
  maxBudgetUsd?: number;
  retryPolicy?: RetryPolicy;
}

export interface RunnerDeps extends ExecuteDeps {
  /** Backoff seam; tests inject an immediate resolve. */
  sleep?: (ms: number) => Promise<void>;
}

function backoffDelay(policy: RetryPolicy, attempt: number): number {
  return Math.min(policy.baseDelayMs * 2 ** (attempt - 1), policy.maxDelayMs);
}

/**
 * Repeated benchmark runner (SPEC FR-008/009/010, ARCHITECTURE.md):
 * queue with unique run numbers, bounded concurrency, stop gate, retry with
 * backoff, hard budget gate, and per-run persistence. Every run executes
 * through the same shared extraction engine as the single run.
 */
export class BenchmarkRunner {
  private deps: RunnerDeps;
  private stopRequested = false;

  constructor(deps: Partial<RunnerDeps> = {}) {
    this.deps = { db: deps.db ?? getDb(), ...deps } as RunnerDeps;
  }

  requestStop(): void {
    this.stopRequested = true;
  }

  async run(config: BenchmarkConfig): Promise<BenchmarkSuite> {
    if (!Number.isInteger(config.requestedRuns) || config.requestedRuns < 1) {
      throw new RunFailure({
        category: "invalid_request",
        message: "requestedRuns must be a positive integer.",
        retryable: false,
      });
    }
    const db = this.deps.db;
    const now = new Date().toISOString();

    const document = await db.documents.get(config.documentId);
    const profile = await db.extractionProfiles.get(config.profileId);
    const configRecord = await db.providerConfigs.get(config.providerConfigId);
    const golden = config.goldenId ? await db.goldenAnswers.get(config.goldenId) : undefined;
    if (!document || !profile || !configRecord) {
      throw new RunFailure({
        category: "invalid_request",
        message: "Document, profile, or provider config not found.",
        retryable: false,
      });
    }

    const concurrency = config.concurrency ?? 1;
    const retryPolicy = config.retryPolicy ?? DEFAULT_RETRY_POLICY;
    const suite: BenchmarkSuite = {
      id: crypto.randomUUID(),
      name: `Benchmark — ${profile.name} (x${config.requestedRuns})`,
      identity: this.buildIdentity({ config, document, profile, configRecord, golden, concurrency }),
      requestedRuns: config.requestedRuns,
      concurrency,
      maxBudgetUsd: config.maxBudgetUsd,
      status: "running",
      createdAt: now,
      startedAt: now,
    };
    await db.benchmarkSuites.put(suite);

    let nextRunNumber = 1;
    let knownCost = 0;
    let lastRunCost: number | undefined;
    let budgetStopped = false;
    let anySuccessful = false;

    const runOne = async (runNumber: number): Promise<void> => {
      const runBase: BenchmarkRun = {
        id: crypto.randomUUID(),
        suiteId: suite.id,
        runNumber,
        state: "queued",
        providerCalls: 0,
        createdAt: new Date().toISOString(),
      };
      await db.benchmarkRuns.put(runBase);

      const base = {
        document,
        profile,
        config: configRecord,
        mode: config.mode,
        temperature: config.temperature,
        thinking: config.thinking,
        renderSettings: config.renderSettings,
        goldenJson: golden?.json,
      };

      let lastError: ReturnType<typeof normalizeFailure> | undefined;
      let lastAttempt = 0;
      for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt += 1) {
        lastAttempt = attempt;
        try {
          const outcome = await executeExtraction(this.deps, base);
          anySuccessful = true;
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
            outputHash: outcome.outputHash,
            providerCalls: attempt,
            usage: outcome.response.usage,
            costUsd: outcome.costUsd,
            finishedAt: new Date().toISOString(),
          };
          await db.benchmarkRuns.put(run);
          lastRunCost = outcome.costUsd;
          if (outcome.costUsd !== undefined) {
            knownCost += outcome.costUsd;
          }
          return;
        } catch (e) {
          lastError = normalizeFailure(e);
          if (!lastError.retryable || attempt >= retryPolicy.maxAttempts) {
            break;
          }
          await (this.deps.sleep ?? defaultSleep)(backoffDelay(retryPolicy, attempt));
        }
      }

      const failedRun: BenchmarkRun = {
        ...runBase,
        state: "provider_error",
        providerCalls: lastAttempt,
        error: lastError ?? { category: "unknown", message: "No attempts completed", retryable: false },
        finishedAt: new Date().toISOString(),
      };
      await db.benchmarkRuns.put(failedRun);
    };

    const budgetWouldExceed = (): boolean => {
      if (config.maxBudgetUsd === undefined || lastRunCost === undefined) {
        return false;
      }
      return knownCost + lastRunCost > config.maxBudgetUsd;
    };

    const worker = async (): Promise<void> => {
      for (;;) {
        if (this.stopRequested) {
          return;
        }
        if (budgetWouldExceed()) {
          budgetStopped = true;
          return;
        }
        const runNumber = nextRunNumber;
        nextRunNumber += 1;
        if (runNumber > config.requestedRuns) {
          return;
        }
        await runOne(runNumber);
      }
    };

    const workerCount = Math.max(1, Math.min(concurrency, config.requestedRuns));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
    const attempted = runs.length;
    let status: BenchmarkSuite["status"];
    if (budgetStopped) {
      status = "budget_stopped";
    } else if (this.stopRequested && attempted < config.requestedRuns) {
      status = "stopped";
    } else if (!anySuccessful) {
      status = "failed";
    } else {
      status = "completed";
    }
    const finalSuite: BenchmarkSuite = {
      ...suite,
      status,
      costUsdKnown: knownCost > 0 ? knownCost : undefined,
      finishedAt: new Date().toISOString(),
    };
    await db.benchmarkSuites.put(finalSuite);
    return finalSuite;
  }

  private buildIdentity(args: {
    config: BenchmarkConfig;
    document: DocumentRecord;
    profile: ExtractionProfile;
    configRecord: ProviderConfig;
    golden?: { id: string; version: number; sha256: string };
    concurrency: number;
  }): BenchmarkIdentity {
    const { config, document, profile, configRecord, golden, concurrency } = args;
    return {
      documentSha256: document.sha256,
      profileId: profile.id,
      profileVersion: profile.version,
      promptSha256: profile.promptSha256,
      schemaSha256: profile.schemaSha256,
      normalizationPolicySha256: profile.normalizationPolicySha256,
      goldenId: golden?.id,
      goldenVersion: golden?.version,
      goldenSha256: golden?.sha256,
      providerKind: configRecord.kind,
      model: configRecord.model,
      thinking: config.thinking,
      temperature: config.temperature,
      inputMode: config.mode,
      rendererSettings:
        config.renderSettings ?? (config.mode === "canonical_images" ? DEFAULT_RENDER_SETTINGS : undefined),
      concurrency,
      retryPolicyVersion: 1,
      appBuild: typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "0.1.0",
    };
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rowAccuracyOf(evaluation: import("./execute").RunOutcome["evaluation"]): number | undefined {
  const rows = evaluation?.rowComparison;
  if (!rows || rows.goldenRows === 0) {
    return undefined;
  }
  return rows.matchedRows / rows.goldenRows;
}
