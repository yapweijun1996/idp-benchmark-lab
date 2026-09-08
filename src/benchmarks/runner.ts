import { getDb } from "../storage/db";
import { AttemptBlocked, AttemptBudget } from "./budget";
import { PricingService } from "../cost/pricingService";
import { freezeInputs } from "./snapshot";
import { attemptEvidence, outcomeFields } from "./evidence";
import { withExecutionLease } from "./recovery";
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
  private stopWaiters = new Set<() => void>();

  constructor(deps: Partial<RunnerDeps> = {}) {
    this.deps = { db: deps.db ?? getDb(), ...deps } as RunnerDeps;
  }

  requestStop(): void {
    this.stopRequested = true;
    this.stopWaiters.forEach((wake) => wake());
  }

  private async waitForRetry(ms: number): Promise<void> {
    if (this.stopRequested) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wake!: () => void;
    const stopped = new Promise<void>((resolve) => { wake = resolve; this.stopWaiters.add(wake); });
    const delay = this.deps.sleep ? this.deps.sleep(ms) : new Promise<void>((resolve) => { timer = setTimeout(resolve, ms); });
    try { await Promise.race([stopped, delay]); }
    finally { this.stopWaiters.delete(wake); if (timer !== undefined) clearTimeout(timer); }
  }

  async run(config: BenchmarkConfig): Promise<BenchmarkSuite> {
    const frozenConfig = structuredClone(config);
    return withExecutionLease(this.deps.db, () => this.runUnlocked(frozenConfig));
  }
  private async runUnlocked(config: BenchmarkConfig): Promise<BenchmarkSuite> {
    config = structuredClone(config);
    if (!Number.isInteger(config.requestedRuns) || config.requestedRuns < 1) {
      throw new RunFailure({
        category: "invalid_request",
        message: "requestedRuns must be a positive integer.",
        retryable: false,
      });
    }
    const db = this.deps.db;
    const now = new Date().toISOString();

    let document = (await db.documents.get(config.documentId)) ?? getSessionDocument(config.documentId);
    const profile = await db.extractionProfiles.get(config.profileId);
    const configRecord = await db.providerConfigs.get(config.providerConfigId);
    const golden = config.goldenId ? await db.goldenAnswers.get(config.goldenId) : undefined;
    if (!document || !profile || !configRecord || (config.goldenId && !golden)) {
      throw new RunFailure({
        category: "invalid_request",
        message: "Document, profile, or provider config not found.",
        retryable: false,
      });
    }

    const concurrency = config.concurrency ?? 1;
    const retryPolicy = config.retryPolicy ?? DEFAULT_RETRY_POLICY;
    if (!Number.isInteger(concurrency) || concurrency < 1 || !Number.isInteger(retryPolicy.maxAttempts) || retryPolicy.maxAttempts < 1 ||
      !Number.isFinite(retryPolicy.baseDelayMs) || retryPolicy.baseDelayMs < 0 || !Number.isFinite(retryPolicy.maxDelayMs) || retryPolicy.maxDelayMs < 0) {
      throw new Error("Concurrency and retry policy must have positive counts and finite nonnegative delays.");
    }
    const pricing = new PricingService(db);
    const snapshot = (configRecord.pricingSnapshotId ? await pricing.get(configRecord.pricingSnapshotId) : await pricing.latestFor(configRecord.kind, configRecord.model)) ?? null;
    const budget = new AttemptBudget(config.maxBudgetUsd, snapshot?.maximumAttemptCostSource?.trim() ? snapshot.maximumAttemptCostUsd : undefined);
    let budgetStopReason: string | undefined;
    const frozen = await freezeInputs(this.deps, { ...config, document, profile, config: configRecord, pricingSnapshot: snapshot }, golden, { ...config, concurrency, retryPolicy });
    document = frozen.document;
    const suite: BenchmarkSuite = {
      id: crypto.randomUUID(),
      name: `Benchmark — ${profile.name} (x${config.requestedRuns})`,
      identity: { ...await this.buildIdentity({ config, document, profile, configRecord, golden, concurrency }), effectiveInputSha256: frozen.hash },
      evidenceVersion: 2,
      snapshot: frozen.snapshot,
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
    let hasKnownCost = false;
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
        pricingSnapshot: snapshot,
        frozenImages: frozen.snapshot.inputImages,
      };

      let lastError: ReturnType<typeof normalizeFailure> | undefined;
      let lastAttempt = 0;
      let blockedBeforeAttempt: "stop" | "budget" | undefined;
      const attempts: NonNullable<BenchmarkRun["attempts"]> = [];
      let runCost = 0;
      let runCostKnown = true;
      const runStarted = performance.now();
      for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt += 1) {
        const callsBeforeAttempt = lastAttempt;
        let providerReturned = false;
        let attemptStartedAt = new Date().toISOString();
        try {
          const outcome = await executeExtraction(this.deps, { ...base, prepareAttempt: async () => {
            await db.benchmarkRuns.put({ ...runBase, state: "running", attempts, providerCalls: lastAttempt, pendingAttempt: { number: lastAttempt + 1, preparedAt: new Date().toISOString() } });
          }, beforeAttempt: () => {
            if (this.stopRequested) {
              blockedBeforeAttempt = "stop";
              throw new AttemptBlocked("Stopped manually by the user.");
            }
            let lease: (costUsd?: number) => void;
            try { lease = budget.reserve(); }
            catch (error) { blockedBeforeAttempt = "budget"; budgetStopped = true; budgetStopReason = budget.reason; throw error; }
            lastAttempt += 1;
            attemptStartedAt = new Date().toISOString();
            return { settle: lease };
          } });
          providerReturned = true;
          attempts.push(attemptEvidence(attempt, attemptStartedAt, outcome));
          runCost += outcome.costUsd ?? 0;
          runCostKnown &&= outcome.costUsd !== undefined;
          anySuccessful = true;
          const state = outcome.response.parseError ? "parse_error" : outcome.schemaValid ? ("succeeded" as const) : ("schema_invalid" as const);
          const run: BenchmarkRun = {
            ...runBase,
            ...outcomeFields(outcome, profile.normalizationPolicy),
            attempts,
            state,
            latencyMs: Math.round(performance.now() - runStarted),
            safeRawResponse: outcome.response.raw,
            parsedJson: outcome.response.json,
            schemaValid: outcome.schemaValid,
            exactMatch: outcome.evaluation?.exactMatch ?? (golden ? false : undefined),
            exactMatchNormalized: outcome.evaluation?.exactMatchNormalized ?? (golden ? false : undefined),
            leafAccuracy: outcome.evaluation?.leafAccuracy.accuracy,
            rowAccuracy: rowAccuracyOf(outcome.evaluation),
            rowMatched: outcome.evaluation?.rowComparison.matchedRows,
            rowTotal: outcome.evaluation?.rowComparison.goldenRows,
            fieldMismatches: outcome.evaluation?.leafAccuracy.mismatches,
            outputHash: outcome.outputHash,
            providerCalls: lastAttempt,
            usage: outcome.response.usage,
            costUsd: runCostKnown ? runCost : undefined,
            finishedAt: new Date().toISOString(),
          };
          await db.benchmarkRuns.put(run);
          if (outcome.costUsd !== undefined) {
            knownCost += outcome.costUsd;
            hasKnownCost = true;
          }
          this.deps.onRunComplete?.(run);
          return;
        } catch (e) {
          // Persistence/UI failures after a response must never trigger another paid request.
          if (providerReturned) throw e;
          const outcome = e instanceof RunFailure ? e.outcome : undefined;
          if (e instanceof AttemptBlocked) {
            // Preserve the concrete Stop/budget refusal on the run record so
            // the UI does not fall back to a misleading "No attempts" error.
            lastError = normalizeFailure(e);
            break;
          }
          lastError = normalizeFailure(e);
          // Persist only a logical attempt that actually dispatched at least
          // one provider request. A pre-dispatch Stop/budget refusal carries
          // its reason on the run without inventing zero-call evidence.
          if (lastAttempt > callsBeforeAttempt || (outcome?.response.providerAttempts?.length ?? 0) > 0) {
            attempts.push(attemptEvidence(attempt, attemptStartedAt, outcome, lastError));
            runCost += outcome?.costUsd ?? 0;
            runCostKnown &&= outcome?.costUsd !== undefined;
            if (outcome?.costUsd !== undefined) { knownCost += outcome.costUsd; hasKnownCost = true; }
            await db.benchmarkRuns.put({ ...runBase, state: "running", attempts, providerCalls: lastAttempt });
          }
          if (!lastError.retryable || attempt >= retryPolicy.maxAttempts) {
            break;
          }
          await this.waitForRetry(backoffDelay(retryPolicy, attempt));
        }
      }

      // 取消语义：runner 的优雅 Stop 不 abort in-flight；只有 AbortError
      // （normalizeFailure 归一化为 "Run cancelled"）才产生 cancelled 终态。
      const cancelled = blockedBeforeAttempt === "stop" || blockedBeforeAttempt === "budget" || (lastError?.category === "provider" && lastError.message === "Run cancelled");
      const failedRun: BenchmarkRun = {
        ...runBase,
        exactMatch: golden ? false : undefined,
        exactMatchNormalized: golden ? false : undefined,
        attempts,
        latencyMs: Math.round(performance.now() - runStarted),
        safeRawResponse: attempts.at(-1)?.raw,
        usage: attempts.at(-1)?.usage,
        costUsd: lastAttempt > 0 && runCostKnown ? runCost : undefined,
        state: cancelled ? "cancelled" : "provider_error",
        providerCalls: lastAttempt,
        error: lastError ?? { category: "unknown", message: "No attempts completed", retryable: false },
        finishedAt: new Date().toISOString(),
      };
      await db.benchmarkRuns.put(failedRun);
      this.deps.onRunComplete?.(failedRun);
    };

    // Every network attempt also reserves synchronously after asynchronous input preparation.
    const budgetWouldExceed = (): boolean => {
      budgetStopReason = budget.reason;
      return budgetStopReason !== undefined;
    };

    const worker = async (): Promise<void> => {
      for (;;) {
        if (this.stopRequested) {
          return;
        }
        if (nextRunNumber > config.requestedRuns) return;
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
    } else if (this.stopRequested) {
      status = "stopped";
    } else if (!anySuccessful) {
      status = "failed";
    } else {
      status = "completed";
    }
    const finalSuite: BenchmarkSuite = {
      ...suite,
      status,
      costUsdKnown: hasKnownCost ? knownCost : undefined,
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

function rowAccuracyOf(evaluation: import("./execute").RunOutcome["evaluation"]): number | undefined {
  const rows = evaluation?.rowComparison;
  if (!rows || rows.goldenRows === 0) {
    return undefined;
  }
  return rows.matchedRows / rows.goldenRows;
}
