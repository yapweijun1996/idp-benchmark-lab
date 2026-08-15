import { useState } from "react";
import { RunFailure, SingleRunService, type SingleRunResult } from "../benchmarks/singleRun";
import { useRunHistory } from "../benchmarks/useRunHistory";
import { useDocuments } from "../documents/useDocuments";
import { useGoldens } from "../golden/useGoldens";
import { useProfiles } from "../profiles/useProfiles";
import { useProviderConfigs } from "../providers/useProviderConfigs";
import type { InputMode } from "../storage/types";

interface BenchmarksPageProps {
  /** Test seam: supplies a runner without touching the real service. */
  singleRunFactory?: () => Pick<SingleRunService, "run">;
}

export function BenchmarksPage({ singleRunFactory }: BenchmarksPageProps) {
  const documents = useDocuments();
  const profiles = useProfiles();
  const providers = useProviderConfigs();
  const goldens = useGoldens();
  const history = useRunHistory();

  const [documentId, setDocumentId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [providerConfigId, setProviderConfigId] = useState("");
  const [goldenId, setGoldenId] = useState("");
  const [mode, setMode] = useState<InputMode>("native_pdf");
  const [temperature, setTemperature] = useState("");
  const [thinking, setThinking] = useState("");

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SingleRunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const run = async () => {
    setResult(null);
    setFailure(null);
    if (!documentId || !profileId || !providerConfigId) {
      setFailure("Select a document, profile, and provider before running.");
      return;
    }
    setRunning(true);
    try {
      const service = singleRunFactory ? singleRunFactory() : new SingleRunService();
      const outcome = await service.run({
        documentId,
        profileId,
        providerConfigId,
        goldenId: goldenId || undefined,
        mode,
        temperature: temperature.trim() === "" ? undefined : Number(temperature),
        thinking: thinking.trim() || undefined,
      });
      setResult(outcome);
      await history.refresh();
    } catch (e) {
      if (e instanceof RunFailure) {
        setFailure(e.error.category + ": " + e.error.message);
      } else {
        setFailure(e instanceof Error ? e.message : String(e));
      }
      await history.refresh();
    } finally {
      setRunning(false);
    }
  };

  return (
    <section aria-labelledby="benchmarks-title">
      <h1 id="benchmarks-title">Benchmarks</h1>
      <p>Run a single extraction and inspect raw evidence before committing to a repeated benchmark.</p>

      <div className="profile-form">
        <h2>Single run</h2>
        <div className="golden-grid">
          <div>
            <label className="field">
              <span>Document</span>
              <select value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
                <option value="">— select document —</option>
                {documents.documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Extraction profile</span>
              <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                <option value="">— select profile —</option>
                {profiles.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (v{p.version})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Provider</span>
              <select value={providerConfigId} onChange={(e) => setProviderConfigId(e.target.value)}>
                <option value="">— select provider —</option>
                {providers.configs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Golden Answer (optional)</span>
              <select value={goldenId} onChange={(e) => setGoldenId(e.target.value)}>
                <option value="">— none —</option>
                {goldens.goldens.map((g) => (
                  <option key={g.id} value={g.id}>
                    Golden v{g.version} ({g.documentId.slice(0, 8)}…)
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <fieldset className="mode-picker">
              <legend>Input mode</legend>
              <label>
                <input type="radio" name="run-mode" value="native_pdf" checked={mode === "native_pdf"} onChange={() => setMode("native_pdf")} />
                Native PDF
              </label>
              <label>
                <input
                  type="radio"
                  name="run-mode"
                  value="canonical_images"
                  checked={mode === "canonical_images"}
                  onChange={() => setMode("canonical_images")}
                />
                Canonical rendered images
              </label>
            </fieldset>
            <label className="field">
              <span>Temperature (optional)</span>
              <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
            </label>
            <label className="field">
              <span>Thinking level (optional, Gemini)</span>
              <input type="text" value={thinking} onChange={(e) => setThinking(e.target.value)} />
            </label>
          </div>
        </div>

        {failure ? (
          <p role="alert" className="status-error">
            {failure}
          </p>
        ) : null}

        <div className="toolbar">
          <button type="button" className="btn btn--primary" onClick={() => void run()} disabled={running}>
            {running ? "Running…" : "Run single extraction"}
          </button>
        </div>
      </div>

      {result ? <RunResultPanel result={result} /> : null}

      <h2>Recent runs</h2>
      {history.suites.length === 0 ? (
        <p className="empty-state">No runs yet.</p>
      ) : (
        <ul className="doc-list">
          {history.suites.map((s) => (
            <li key={s.id} className="doc-card">
              <span className="doc-card__main">
                <span className="doc-card__name">{s.name ?? "Benchmark suite"}</span>
                <span className="doc-card__meta">
                  {s.identity.model} · {s.identity.inputMode} · {s.requestedRuns} run(s)
                </span>
              </span>
              <span className={"chip " + (s.status === "failed" ? "chip--bad" : s.status === "completed" ? "chip--ok" : "chip--todo")}>
                {s.status}
              </span>
              <span className="doc-card__meta">{new Date(s.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type UsageLike = { inputTokens?: number; outputTokens?: number; totalTokens?: number };

function RunResultPanel({ result }: { result: SingleRunResult }) {
  const run = result.run;
  const usage = run.usage as UsageLike | undefined;
  const costText = run.costUsd !== undefined ? "$" + run.costUsd.toFixed(6) : "unknown";
  return (
    <div className="profile-form" role="region" aria-label="Run result">
      <h2>
        Run result{" "}
        <span className={"chip " + (run.state === "succeeded" ? "chip--ok" : "chip--bad")}>{run.state}</span>
      </h2>
      <p className="doc-card__meta">
        latency {run.latencyMs ?? "—"} ms · cost {costText} · output hash {run.outputHash?.slice(0, 12)}… · provider
        calls {run.providerCalls}
      </p>
      {usage ? (
        <p className="doc-card__meta">
          usage: input {usage.inputTokens ?? "?"} · output {usage.outputTokens ?? "?"} · total{" "}
          {usage.totalTokens ?? "?"}
        </p>
      ) : null}
      <details>
        <summary>Raw provider response</summary>
        <pre className="raw-pre">{run.safeRawResponse ?? "(none)"}</pre>
      </details>
      <details open>
        <summary>Parsed JSON</summary>
        <pre className="raw-pre">{JSON.stringify(run.parsedJson, null, 2)}</pre>
      </details>
    </div>
  );
}
