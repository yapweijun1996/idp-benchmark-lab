import { useCallback, useEffect, useRef, useState } from "react";
import { BenchmarkRunner, RUN_PRESETS, type RunPreset } from "../benchmarks/runner";
import { RunFailure } from "../benchmarks/execute";
import { summarizeSuite, type SuiteSummary } from "../benchmarks/summary";
import { browserExecuteDeps } from "../documents/runtimeDeps";
import { getAppSettings } from "../storage/settings";
import type { BenchmarkRun, BenchmarkSuite, InputMode } from "../storage/types";

export interface BenchmarkSelection {
  documentId: string;
  profileId: string;
  providerConfigId: string;
  goldenId?: string;
  mode: InputMode;
  temperature?: number;
  thinking?: string;
}

export type BenchmarkFactory = (onRunComplete: (run: BenchmarkRun) => void) => {
  run: BenchmarkRunner["run"];
  requestStop: () => void;
};

interface ProgressState {
  total: number;
  completed: number;
  succeeded: number;
  schemaInvalid: number;
  failed: number;
}

export function RepeatedBenchmarkSection({
  selection,
  benchmarkFactory,
  unsupportedReason,
}: {
  selection: BenchmarkSelection;
  benchmarkFactory?: BenchmarkFactory;
  /** 由父级能力门禁计算：非空时禁止启动基准并展示原因。 */
  unsupportedReason?: string;
}) {
  const [preset, setPresetState] = useState<number>(5);
  const [concurrency, setConcurrency] = useState("1");
  const [budget, setBudget] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [suite, setSuite] = useState<BenchmarkSuite | null>(null);
  const [summary, setSummary] = useState<SuiteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runnerRef = useRef<{ requestStop: () => void } | null>(null);
  const collectedRunsRef = useRef<BenchmarkRun[]>([]);
  const presetTouchedRef = useRef(false);

  const setPreset = useCallback((n: number) => {
    presetTouchedRef.current = true;
    setPresetState(n);
  }, []);

  useEffect(() => {
    void getAppSettings()
      .then((s) => {
        if (!presetTouchedRef.current && RUN_PRESETS.includes(s.defaultRunCount as RunPreset)) {
          setPresetState(s.defaultRunCount);
        }
      })
      .catch(() => undefined);
  }, []);

  const start = useCallback(async () => {
    setSuite(null);
    setSummary(null);
    setError(null);
    if (!selection.documentId || !selection.profileId || !selection.providerConfigId) {
      setError("Select a document, profile, and provider before benchmarking.");
      return;
    }
    if (unsupportedReason) {
      setError("Incompatible configuration: " + unsupportedReason);
      return;
    }
    collectedRunsRef.current = [];
    const onRunComplete = (run: BenchmarkRun) => {
      collectedRunsRef.current.push(run);
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              completed: prev.completed + 1,
              succeeded: prev.succeeded + (run.state === "succeeded" ? 1 : 0),
              schemaInvalid: prev.schemaInvalid + (run.state === "schema_invalid" ? 1 : 0),
              failed: prev.failed + (run.state === "provider_error" ? 1 : 0),
            }
          : prev,
      );
    };
    const runner = benchmarkFactory
      ? benchmarkFactory(onRunComplete)
      : new BenchmarkRunner({ onRunComplete, ...browserExecuteDeps() });
    runnerRef.current = runner;
    setProgress({ total: preset, completed: 0, succeeded: 0, schemaInvalid: 0, failed: 0 });
    setRunning(true);
    try {
      const finished = await runner.run({
        ...selection,
        requestedRuns: preset,
        concurrency: Number(concurrency) || 1,
        maxBudgetUsd: budget.trim() === "" ? undefined : Number(budget),
      });
      setSuite(finished);
      setSummary(summarizeSuite(collectedRunsRef.current, preset));
    } catch (e) {
      if (e instanceof RunFailure) {
        setError(e.error.category + ": " + e.error.message);
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setRunning(false);
    }
  }, [selection, preset, concurrency, budget, benchmarkFactory, unsupportedReason]);

  const stop = () => {
    runnerRef.current?.requestStop();
  };

  return (
    <div className="profile-form">
      <h2>Repeated benchmark</h2>
      <p className="doc-card__meta">
        Uses the document, profile, provider, golden, and input mode selected above. Every run records its own
        evidence.
      </p>

      <fieldset className="mode-picker">
        <legend>Run count</legend>
        {RUN_PRESETS.map((n) => (
          <label key={n}>
            <input
              type="radio"
              name="run-preset"
              value={n}
              checked={preset === n}
              onChange={() => setPreset(n)}
            />
            {n}
          </label>
        ))}
      </fieldset>

      <div className="golden-grid">
        <label className="field">
          <span>Concurrency</span>
          <input
            type="number"
            min={1}
            max={10}
            value={concurrency}
            onChange={(e) => setConcurrency(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Hard budget cap USD (optional)</span>
          <input type="number" step="0.01" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} />
        </label>
      </div>

      {unsupportedReason ? (
        <p role="status" className="schema-bad">
          Incompatible configuration: {unsupportedReason}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="status-error">
          {error}
        </p>
      ) : null}

      <div className="toolbar">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void start()}
          disabled={running || Boolean(unsupportedReason)}
        >
          {running ? "Benchmark running…" : "Start benchmark"}
        </button>
        <button type="button" className="btn" onClick={stop} disabled={!running}>
          Stop
        </button>
      </div>

      {progress ? (
        <div role="status" className="progress-panel">
          <p>
            {running ? "Running: " : ""}
            {progress.completed} of {progress.total} runs completed · {progress.succeeded} succeeded ·{" "}
            {progress.schemaInvalid} schema-invalid · {progress.failed} failed
          </p>
          <progress max={progress.total} value={progress.completed} aria-label="Benchmark progress" />
        </div>
      ) : null}

      {!running && suite?.stopReason ? (
        <p role="status" className={suite.status === "budget_stopped" ? "schema-bad" : "schema-ok"}>
          {suite.status === "budget_stopped" ? "⚠ " : "⏹ "}
          {suite.stopReason}
        </p>
      ) : null}

      {summary ? <SummaryPanel summary={summary} suite={suite} /> : null}
    </div>
  );
}

function SummaryPanel({ summary, suite }: { summary: SuiteSummary; suite: BenchmarkSuite | null }) {
  const pct = (v: number | undefined): string => (v === undefined ? "—" : (v * 100).toFixed(1) + "%");
  const usd = (v: number | undefined): string => (v === undefined ? "unknown" : "$" + v.toFixed(6));
  return (
    <div className="progress-panel" role="region" aria-label="Benchmark summary">
      <h3>
        Summary{" "}
        <span className={"chip " + (suite?.status === "completed" ? "chip--ok" : "chip--todo")}>
          {suite?.status ?? ""}
        </span>
      </h3>
      <table className="summary-table">
        <tbody>
          <tr>
            <th>Exact pass rate</th>
            <td>{pct(summary.exactPassRate)}</td>
            <th>Schema-valid rate</th>
            <td>{pct(summary.schemaValidRate)}</td>
          </tr>
          <tr>
            <th>Avg leaf accuracy</th>
            <td>{pct(summary.avgLeafAccuracy)}</td>
            <th>Row accuracy</th>
            <td>{pct(summary.rowAccuracy)}</td>
          </tr>
          <tr>
            <th>Consistency</th>
            <td>{pct(summary.consistencyRate)}</td>
            <th>Unique variants</th>
            <td>{summary.uniqueVariants}</td>
          </tr>
          <tr>
            <th>Expected Result stability</th>
            <td>{pct(summary.goldenStability)}</td>
            <th>Error rate</th>
            <td>{pct(summary.errorRate)}</td>
          </tr>
          <tr>
            <th>Latency avg / p50 / p95</th>
            <td>
              {summary.latency.avg === undefined ? "—" : Math.round(summary.latency.avg) + " ms"} /{" "}
              {summary.latency.p50 === undefined ? "—" : Math.round(summary.latency.p50) + " ms"} /{" "}
              {summary.latency.p95 === undefined ? "—" : Math.round(summary.latency.p95) + " ms"}
            </td>
            <th>Cost total / avg / per-correct</th>
            <td>
              {usd(summary.cost.totalUsd)} / {usd(summary.cost.avgPerRun)} / {usd(summary.cost.costPerCorrect)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="doc-card__meta">
        Attempted {summary.attemptedRuns} of {summary.requestedRuns} runs · {summary.succeededRuns} succeeded ·{" "}
        {summary.schemaInvalidRuns} schema-invalid · {summary.providerErrorRuns} provider errors
      </p>
    </div>
  );
}
