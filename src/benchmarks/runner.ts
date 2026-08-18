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
import { sha256Hex } from "../documents/hash";
import { canonicalJson } from "../evaluation/canonical";
import { configuredThinking, executeExtraction, normalizeFailure, RunFailure, type ExecuteDeps } from "./execute";
import type { SingleRunInput } from "./singleRun";
import { getSessionDocument } from "../documents/sessionStore";

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
  /** Progress callback: fired after each run reaches a terminal state. */
  onRunComplete?: (run: BenchmarkRun) => void;
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

    const document = (await db.documents.get(config.documentId)) ?? getSessionDocument(config.documentId);
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
      identity: await this.buildIdentity({ config, document, profile, configRecord, golden, concurrency }),
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
      await db.benchmarkRuns.put({ ...runBase, state: "running" });

      const base = {
        document,
        profile,
        config: configRecord,
        mode: config.mode,
        promptOverride: config.promptOverride,
        schemaOverride: config.schemaOverride,
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
            rowMatched: outcome.evaluation?.rowComparison.matchedRows,
            rowTotal: outcome.evaluation?.rowComparison.goldenRows,
            fieldMismatches: outcome.evaluation?.leafAccuracy.mismatches,
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
          this.deps.onRunComplete?.(run);
          return;
        } catch (e) {
          lastError = normalizeFailure(e);
          if (!lastError.retryable || attempt >= retryPolicy.maxAttempts) {
            break;
          }
          await (this.deps.sleep ?? defaultSleep)(backoffDelay(retryPolicy, attempt));
        }
      }

      // 取消语义：runner 的优雅 Stop 不 abort in-flight；只有 AbortError
      // （normalizeFailure 归一化为 "Run cancelled"）才产生 cancelled 终态。
      const cancelled = lastError?.category === "provider" && lastError.message === "Run cancelled";
      const failedRun: BenchmarkRun = {
        ...runBase,
        state: cancelled ? "cancelled" : "provider_error",
        providerCalls: lastAttempt,
        error: lastError ?? { category: "unknown", message: "No attempts completed", retryable: false },
        finishedAt: new Date().toISOString(),
      };
      await db.benchmarkRuns.put(failedRun);
      this.deps.onRunComplete?.(failedRun);
    };

    // 预算规则（docs/COST_AND_PRICING.md）：
    // 下一次运行的成本用「最近一次已确认成本」作为上界预估；当且仅当
    // 已确认累计 + 该预估 严格超过上限时才停止启动新运行。若最近一次
    // 成本未知（provider 未报告且无 pricing 快照），则无法保证上限，
    // 按文档继续运行并在 stopReason 中说明。
    let budgetStopReason: string | undefined;
    const budgetWouldExceed = (): boolean => {
      if (config.maxBudgetUsd === undefined) {
        return false;
      }
      if (lastRunCost === undefined) {
        return false;
      }
      const projected = knownCost + lastRunCost;
      if (projected > config.maxBudgetUsd) {
        budgetStopReason =
          `Budget cap ${config.maxBudgetUsd} USD: confirmed spend ${knownCost.toFixed(6)} USD, ` +
          `next run estimated at ${lastRunCost.toFixed(6)} USD based on the most recent run, ` +
          `projected total ${projected.toFixed(6)} USD would exceed the cap — stopped starting new runs.`;
        return true;
      }
      return false;
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
      stopReason: budgetStopReason ?? (this.stopRequested && attempted < config.requestedRuns ? "Stopped manually by the user." : undefined),
      finishedAt: new Date().toISOString(),
    };
    await db.benchmarkSuites.put(finalSuite);
    return finalSuite;
  }

  private async buildIdentity(args: {
    config: BenchmarkConfig;
    document: DocumentRecord;
    profile: ExtractionProfile;
    configRecord: ProviderConfig;
    golden?: { id: string; version: number; sha256: string };
    concurrency: number;
  }): Promise<BenchmarkIdentity> {
    const { config, document, profile, configRecord, golden, concurrency } = args;
    const promptSha256 = await sha256Hex(
      new TextEncoder().encode(config.promptOverride ?? profile.basePrompt).buffer,
    );
    const schemaSha256 =
      config.schemaOverride === undefined
        ? profile.schemaSha256
        : await sha256Hex(new TextEncoder().encode(canonicalJson(config.schemaOverride)).buffer);
    return {
      documentSha256: document.sha256,
      profileId: profile.id,
      profileVersion: profile.version,
      promptSha256,
      schemaSha256,
      normalizationPolicySha256: profile.normalizationPolicySha256,
      goldenId: golden?.id,
      goldenVersion: golden?.version,
      goldenSha256: golden?.sha256,
      providerKind: configRecord.kind,
      model: configRecord.model,
      thinking: config.thinking ?? configuredThinking(configRecord),
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
