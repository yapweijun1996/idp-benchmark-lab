import { useEffect, useState } from "react";
import { BenchmarkRunner } from "../benchmarks/runner";
import { summarizeSuite, type SuiteSummary } from "../benchmarks/summary";
import { browserExecuteDeps } from "../documents/runtimeDeps";
import { PdfPreview } from "../documents/PdfPreview";
import { DEMO_NAME, loadDemoDocumentBlob } from "../demo/fixture";
import { seedDemoFixture } from "../demo/seedDemoFixture";
import { getDb } from "../storage/db";
import { setApiKey } from "../providers/keys";
import { adapterFor } from "../providers/registry";
import { useProviderConfigs } from "../providers/useProviderConfigs";
import type { BenchmarkRun, InputMode, ProviderKind } from "../storage/types";
import { useI18n } from "../i18n";

export type DemoRunnerFactory = (onRunComplete: (run: BenchmarkRun) => void) => Pick<BenchmarkRunner, "run">;

const KIND_LABELS: Record<ProviderKind, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  openai_compatible: "Custom OpenAI-compatible",
};

const DEFAULT_MODEL: Record<ProviderKind, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-3.5-flash-lite",
  openai_compatible: "local-model",
};

const MODEL_OPTIONS: Record<ProviderKind, readonly string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o"],
  gemini: ["gemini-3.5-flash-lite", "gemini-3-flash-lite", "gemini-3-pro"],
  openai_compatible: ["local-model"],
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
  const { t } = useI18n();
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
  const [demoPdf, setDemoPdf] = useState<Blob | null>(null);
  const [demoPdfError, setDemoPdfError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadDemoDocumentBlob()
      .then((blob) => {
        if (!cancelled) {
          setDemoPdf(blob);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDemoPdfError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeKind = (next: ProviderKind) => {
    setKind(next);
    setModel(DEFAULT_MODEL[next]);
  };

  const run = async () => {
    setError(null);
    setResult(null);
    if (!apiKey.trim()) {
      setError(t("Enter an API key first."));
      return;
    }
    if (kind === "openai_compatible" && !baseUrl.trim()) {
      setError(t("Enter a base URL for the custom endpoint first."));
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
        setError(t("Every run failed — see the run detail in Runs & Results for the provider error."));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  return (
    <div id="home-demo" className="profile-form home-demo-card" role="region" aria-label={t("Demo benchmark")}>
      <h2>{t("Try the demo")}</h2>
      <p>{t("A ready-made sample — no setup required.")}</p>
      <p className="doc-card__meta">{t("Demo sample")}: {DEMO_NAME}</p>
      <div className="preview-panel demo-pdf-preview">
        <h3>{t("Document preview")}</h3>
        <p className="doc-card__meta">{t("This is the PDF that will be sent to the selected AI provider.")}</p>
        {demoPdf ? (
          <PdfPreview blob={demoPdf} scale={0.9} />
        ) : demoPdfError ? (
          <p role="alert" className="pdf-preview__status pdf-preview__status--error">
            {t("Failed to load the demo PDF preview")}: {demoPdfError}
          </p>
        ) : (
          <p role="status" className="pdf-preview__status">
            {t("Loading document preview…")}
          </p>
        )}
      </div>
      <ul className="doc-list demo-ready-list">
        <li>✓ {t("Sample PDF")}</li>
        <li>✓ {t("Extraction prompt")}</li>
        <li>✓ {t("JSON schema")}</li>
        <li>✓ {t("Expected result")}</li>
      </ul>

      <fieldset className="mode-picker">
        <legend>{t("Choose AI")}</legend>
        {(["gemini", "openai", "openai_compatible"] as const).map((k) => (
          <label key={k}>
            <input type="radio" name="demo-provider-kind" checked={kind === k} onChange={() => changeKind(k)} />
            {KIND_LABELS[k]}
          </label>
        ))}
      </fieldset>

      <div className="golden-grid">
        <label className="field">
          <span>{t("Model")}</span>
          <input
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="false"
            aria-controls={`demo-model-options-${kind}`}
            list={`demo-model-options-${kind}`}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <datalist id={`demo-model-options-${kind}`}>
            {MODEL_OPTIONS[kind].map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
        {kind === "openai_compatible" ? (
          <label className="field">
            <span>{t("Base URL")}</span>
            <input
              type="text"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </label>
        ) : null}
        <label className="field">
          <span>{t("API key (memory-only, not saved unless you opt in on Settings later)")}</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="mode-picker">
        <legend>{t("Runs")}</legend>
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
          {running ? `${t("Running…")} (${progress?.completed ?? 0}/${progress?.total ?? runCount})` : t("Run Benchmark")}
        </button>
      </div>

      {error ? (
        <p role="alert" className="status-error">
          {error}
        </p>
      ) : null}

      {result ? <DemoResultPanel result={result} /> : null}

      <p className="doc-card__meta demo-secondary-cta">
        {t("Want to test your own document?")} <a href="#/new-benchmark">{t("Upload my document")}</a>
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
  const { t } = useI18n();
  const { summary, model, providerLabel, runCount, failures } = result;
  return (
    <div className="progress-panel" role="region" aria-label={t("Demo result")}>
      <h3>{t("Result")}</h3>
      <p className="doc-card__meta">
        {t("Provider")}: {providerLabel} · {t("Model")}: {model} · {t("Runs")}: {runCount}
      </p>
      <table className="summary-table">
        <tbody>
          <tr>
            <th>{t("Schema valid")}</th>
            <td>
              {summary.attemptedRuns > 0
                ? Math.round((summary.schemaValidRate ?? 0) * summary.attemptedRuns) + "/" + summary.attemptedRuns
                : "—"}
            </td>
            <th>{t("Exact match")}</th>
            <td>
              {summary.attemptedRuns > 0
                ? Math.round((summary.exactPassRate ?? 0) * summary.attemptedRuns) + "/" + summary.attemptedRuns
                : "—"}
            </td>
          </tr>
          <tr>
            <th>{t("Field accuracy")}</th>
            <td>{pct(summary.avgLeafAccuracy)}</td>
            <th>{t("Row accuracy")}</th>
            <td>{pct(summary.rowAccuracy)}</td>
          </tr>
          <tr>
            <th>{t("Stability")}</th>
            <td>{pct(summary.consistencyRate)}</td>
            <th>{t("Unique variants")}</th>
            <td>{summary.uniqueVariants}</td>
          </tr>
          <tr>
            <th>{t("Average latency")}</th>
            <td colSpan={3}>
              {summary.latency.avg === undefined ? "—" : Math.round(summary.latency.avg) + " ms"}
            </td>
          </tr>
        </tbody>
      </table>

      {failures.length > 0 ? (
        <div className="demo-failures">
          <h4>{t("Failures")}</h4>
          <ul className="doc-list">
            {failures.map((f, i) => (
              <li key={i} className="doc-card">
                <span className="doc-card__main">
                  <span className="doc-card__name">
                    {t("Run")} {f.runNumber} · {f.path}
                  </span>
                  <span className="doc-card__meta">
                    {t("Expected")}: {fmtValue(f.expected)} · {t("Actual")}: {fmtValue(f.actual)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="doc-card__meta">
        <a href="#/runs">{t("Inspect raw outputs in Runs & Results")}</a>
      </p>
    </div>
  );
}
