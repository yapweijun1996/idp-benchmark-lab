import { useState } from "react";
import { buildFieldHeatmap } from "../evaluation/heatmap";
import type { BenchmarkRun, BenchmarkSuite, GoldenAnswer } from "../storage/types";

export interface SuiteDetailProps {
  suite: BenchmarkSuite;
  runs: BenchmarkRun[];
  golden?: GoldenAnswer;
}

export function SuiteDetail({ suite, runs, golden }: SuiteDetailProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined);
  const selected = runs.find((r) => r.id === selectedRunId);
  const heatmap = buildFieldHeatmap(runs);
  const stateChip = (state: BenchmarkRun["state"]) =>
    "chip " + (state === "succeeded" ? "chip--ok" : state === "schema_invalid" ? "chip--warn" : "chip--bad");

  return (
    <div className="profile-form" role="region" aria-label="Suite detail">
      <h2>
        {suite.name ?? "Suite"} <span className="chip chip--todo">{suite.status}</span>
      </h2>
      <p className="doc-card__meta">
        {suite.identity.model} · {suite.identity.inputMode} · {runs.length}/{suite.requestedRuns} runs
      </p>

      <h3>Field accuracy heatmap</h3>
      {heatmap.length === 0 ? (
        <p className="empty-state">No evaluated mismatches in this suite.</p>
      ) : (
        <table className="summary-table">
          <thead>
            <tr>
              <th>Field path</th>
              <th>Mismatch rate</th>
              <th>Observed (expected → actual)</th>
            </tr>
          </thead>
          <tbody>
            {heatmap.map((heat) => (
              <tr key={heat.path}>
                <td className="mono-input">{heat.path}</td>
                <td>
                  {Math.round(heat.mismatchRate * 100)}% ({heat.mismatchedRuns}/{heat.evaluatedRuns})
                </td>
                <td>
                  {heat.valueFrequencies.map((f) => (
                    <div key={JSON.stringify(f.expected) + JSON.stringify(f.actual)} className="doc-card__meta">
                      {JSON.stringify(f.expected)} → {JSON.stringify(f.actual)} ×{f.count}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Runs</h3>
      <ul className="doc-list">
        {runs.map((run) => (
          <li key={run.id} className="doc-card">
            <button type="button" className="doc-card__main" onClick={() => setSelectedRunId(run.id)}>
              <span className="doc-card__name">
                Run {run.runNumber} <span className={stateChip(run.state)}>{run.state}</span>
              </span>
              <span className="doc-card__meta">
                {run.latencyMs !== undefined ? run.latencyMs + " ms" : "—"} ·{" "}
                {run.costUsd !== undefined ? "$" + run.costUsd.toFixed(6) : "cost unknown"} ·{" "}
                {run.outputHash?.slice(0, 10)}…
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? <RunInspector run={selected} golden={golden} /> : null}
    </div>
  );
}

function RunInspector({ run, golden }: { run: BenchmarkRun; golden?: GoldenAnswer }) {
  return (
    <div className="progress-panel" role="region" aria-label={"Run " + run.runNumber + " inspector"}>
      <h3>Run {run.runNumber} inspector</h3>
      {run.error ? (
        <p className="status-error">
          {run.error.category}: {run.error.message}
        </p>
      ) : null}
      {run.fieldMismatches && run.fieldMismatches.length > 0 ? (
        <table className="summary-table">
          <thead>
            <tr>
              <th>Path</th>
              <th>Expected</th>
              <th>Actual</th>
            </tr>
          </thead>
          <tbody>
            {run.fieldMismatches.map((m) => (
              <tr key={m.path}>
                <td className="mono-input">{m.path}</td>
                <td className="mono-input">{JSON.stringify(m.expected)}</td>
                <td className="mono-input">{JSON.stringify(m.actual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <details open>
        <summary>Parsed JSON</summary>
        <pre className="raw-pre">{JSON.stringify(run.parsedJson, null, 2)}</pre>
      </details>
      {golden ? (
        <details>
          <summary>Golden Answer (v{golden.version})</summary>
          <pre className="raw-pre">{JSON.stringify(golden.json, null, 2)}</pre>
        </details>
      ) : null}
      <details>
        <summary>Raw provider response</summary>
        <pre className="raw-pre">{run.safeRawResponse ?? "(none)"}</pre>
      </details>
    </div>
  );
}
