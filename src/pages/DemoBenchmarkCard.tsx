import { useState } from "react";
import { BenchmarkRunner } from "../benchmarks/runner";
import { summarizeSuite, type SuiteSummary } from "../benchmarks/summary";
import { browserExecuteDeps } from "../documents/runtimeDeps";
import { DEMO_NAME } from "../demo/fixture";
import { seedDemoFixture } from "../demo/seedDemoFixture";
import { getDb } from "../storage/db";
import { setApiKey } from "../providers/keys";
import { adapterFor } from "../providers/registry";
import { useProviderConfigs } from "../providers/useProviderConfigs";
import type { BenchmarkRun, InputMode, ProviderKind } from "../storage/types";

export type DemoRunnerFactory = (onRunComplete: (run: BenchmarkRun) => void) => Pick<BenchmarkRunner, "run">;

const KIND_LABELS: Record<ProviderKind, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  openai_compatible: "Custom OpenAI-compatible",
};

const DEFAULT_MODEL: Record<ProviderKind, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-3-flash-lite",
  openai_compatible: "local-model",
};

export type RunCount = 1 | 3 | 5;

interface Failure {
  runNumber: number;
  path: string;
  expected: unknown;
  actual: unknown;
}

interface DemoResult {
  summary: SuiteSummary;
  model: string;
  providerLabel: string;
  runCount: number;
  failures: Failure[];
}

const pct = (v: number | undefined): string => (v === undefined ? "—" : (v * 100).toFixed(1) + "%");
const fmtValue = (v: unknown): string => (v === undefined ? "(missing)" : JSON.stringify(v));

export function DemoBenchmarkCard({ runnerFactory }: { runnerFactory?: DemoRunnerFactory } = {}) {
  const providers = useProviderConfigs();
  const [kind, setKind] = useState<ProviderKind>("gemini");
  const [model, setModel] = useState(DEFAULT_MODEL.gemini);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKeyState] = useState("");
  const [runCount, setRunCount] = useState<RunCount>(3);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changeKind = (next: ProviderKind) => {
    setKind(next);
    setModel(DEFAULT_MODEL[next]);
  };

  const run = async () => {
    setError(null);
    setResult(null);
    if (!apiKey.trim()) {
      setError("Enter an API key first.");
      return;
    }
    if (kind === "openai_compatible" && !baseUrl.trim()) {
      setError("Enter a base URL for the custom endpoint first.");
      return;
    }
    setRunning(true);
    setProgress({ completed: 0, total: runCount });
    try {
      const { documentId, profileId, goldenId } = await seedDemoFixture();

      const savedConfigs = await getDb().providerConfigs.where("kind").equals(kind).toArray();
      const existing = savedConfigs[0];
      const providerConfig = await providers.save({
        id: existing?.id,
        kind,
        name: existing?.name ?? KIND_LABELS[kind],
        baseUrl: kind === "openai_compatible" ? baseUrl.trim() : undefined,
        model: model.trim(),
        settings: existing?.settings ?? {},
      });
      setApiKey(providerConfig.id, apiKey.trim(), { rememberForTab: false });

      const caps = adapterFor(kind).capabilities(providerConfig);
      const mode: InputMode = caps.nativePdf ? "native_pdf" : "canonical_images";

      const onRunComplete = () => setProgress((prev) => (prev ? { ...prev, completed: prev.completed + 1 } : prev));
      const runner = runnerFactory
        ? runnerFactory(onRunComplete)
        : new BenchmarkRunner({ ...browserExecuteDeps(), onRunComplete });
      const suite = await runner.run({
        documentId,
        profileId,
        goldenId,
        providerConfigId: providerConfig.id,
        mode,
        requestedRuns: runCount,
        concurrency: 1,
      });

      const db = getDb();
      const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
      runs.sort((a, b) => a.runNumber - b.runNumber);
      const summary = summarizeSuite(runs, runCount);
      const failures = collectFailures(runs);

      setResult({ summary, model: model.trim(), providerLabel: KIND_LABELS[kind], runCount, failures });
      if (suite.status === "failed") {
        setError("Every run failed — see the run detail in Runs & Results for the provider error.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  return (
    <div className="profile-form" role="region" aria-label="Demo benchmark">
      <h2>Try the demo</h2>
      <p>A ready-made sample — no setup required.</p>
      <p className="doc-card__meta">Demo sample: {DEMO_NAME}</p>
      <ul className="doc-list demo-ready-list">
        <li>✓ Sample PDF</li>
        <li>✓ Extraction prompt</li>
        <li>✓ JSON schema</li>
        <li>✓ Expected result</li>
      </ul>

      <fieldset className="mode-picker">
        <legend>Choose AI</legend>
        {(["gemini", "openai", "openai_compatible"] as const).map((k) => (
          <label key={k}>
            <input type="radio" name="demo-provider-kind" checked={kind === k} onChange={() => changeKind(k)} />
            {KIND_LABELS[k]}
          </label>
        ))}
      </fieldset>

      <div className="golden-grid">
        <label className="field">
          <span>Model</span>
          <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
        </label>
        {kind === "openai_compatible" ? (
          <label className="field">
            <span>Base URL</span>
            <input
              type="text"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </label>
        ) : null}
        <label className="field">
          <span>API key (memory-only, not saved unless you opt in on Settings later)</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="mode-picker">
        <legend>Runs</legend>
        {([1, 3, 5] as const).map((n) => (
          <label key={n}>
            <input
              type="radio"
              name="demo-run-count"
              checked={runCount === n}
              onChange={() => setRunCount(n)}
            />
            {n}
          </label>
        ))}
      </fieldset>

      <div className="toolbar">
        <button type="button" className="btn btn--primary" onClick={() => void run()} disabled={running}>
          {running ? `Running… (${progress?.completed ?? 0}/${progress?.total ?? runCount})` : "Run Benchmark"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="status-error">
          {error}
        </p>
      ) : null}

      {result ? <DemoResultPanel result={result} /> : null}

      <p className="doc-card__meta demo-secondary-cta">
        Want to test your own document?{" "}
        <a href="#/new-benchmark">Upload my document</a>
      </p>
    </div>
  );
}

function collectFailures(runs: BenchmarkRun[]): Failure[] {
  const failures: Failure[] = [];
  for (const run of runs) {
    for (const mismatch of run.fieldMismatches ?? []) {
      failures.push({ runNumber: run.runNumber, path: mismatch.path, expected: mismatch.expected, actual: mismatch.actual });
      if (failures.length >= 10) {
        return failures;
      }
    }
  }
  return failures;
}

function DemoResultPanel({ result }: { result: DemoResult }) {
  const { summary, model, providerLabel, runCount, failures } = result;
  return (
    <div className="progress-panel" role="region" aria-label="Demo result">
      <h3>Result</h3>
      <p className="doc-card__meta">
        Provider: {providerLabel} · Model: {model} · Runs: {runCount}
      </p>
      <table className="summary-table">
        <tbody>
          <tr>
            <th>Schema valid</th>
            <td>
              {summary.attemptedRuns > 0
                ? Math.round((summary.schemaValidRate ?? 0) * summary.attemptedRuns) + "/" + summary.attemptedRuns
                : "—"}
            </td>
            <th>Exact match</th>
            <td>
              {summary.attemptedRuns > 0
                ? Math.round((summary.exactPassRate ?? 0) * summary.attemptedRuns) + "/" + summary.attemptedRuns
                : "—"}
            </td>
          </tr>
          <tr>
            <th>Field accuracy</th>
            <td>{pct(summary.avgLeafAccuracy)}</td>
            <th>Row accuracy</th>
            <td>{pct(summary.rowAccuracy)}</td>
          </tr>
          <tr>
            <th>Stability</th>
            <td>{pct(summary.consistencyRate)}</td>
            <th>Unique variants</th>
            <td>{summary.uniqueVariants}</td>
          </tr>
          <tr>
            <th>Average latency</th>
            <td colSpan={3}>
              {summary.latency.avg === undefined ? "—" : Math.round(summary.latency.avg) + " ms"}
            </td>
          </tr>
        </tbody>
      </table>

      {failures.length > 0 ? (
        <div className="demo-failures">
          <h4>Failures</h4>
          <ul className="doc-list">
            {failures.map((f, i) => (
              <li key={i} className="doc-card">
                <span className="doc-card__main">
                  <span className="doc-card__name">
                    Run {f.runNumber} · {f.path}
                  </span>
                  <span className="doc-card__meta">
                    Expected: {fmtValue(f.expected)} · Actual: {fmtValue(f.actual)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="doc-card__meta">
        <a href="#/runs">Inspect raw outputs in Runs &amp; Results</a>
      </p>
    </div>
  );
}
