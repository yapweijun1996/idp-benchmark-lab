import { useState } from "react";
import { useRunHistory } from "../benchmarks/useRunHistory";
import { summarizeSuite, type SuiteSummary } from "../benchmarks/summary";
import { getDb } from "../storage/db";
import type { BenchmarkRun, BenchmarkSuite } from "../storage/types";

interface CompareRow {
  suite: BenchmarkSuite;
  summary: SuiteSummary;
}

export type RunsLoader = (suite: BenchmarkSuite) => Promise<BenchmarkRun[]>;

const defaultRunsLoader: RunsLoader = async (suite) => {
  const runs = await getDb().benchmarkRuns.where("suiteId").equals(suite.id).toArray();
  runs.sort((a, b) => a.runNumber - b.runNumber);
  return runs;
};

const pct = (v: number | undefined): string => (v === undefined ? "—" : (v * 100).toFixed(1) + "%");

export function ComparePage({ runsLoader }: { runsLoader?: RunsLoader }) {
  const history = useRunHistory();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const compare = async () => {
    setError(null);
    const loader = runsLoader ?? defaultRunsLoader;
    const chosen = history.suites.filter((s) => selected.has(s.id));
    try {
      const loaded: CompareRow[] = [];
      for (const suite of chosen) {
        const runs = await loader(suite);
        loaded.push({ suite, summary: summarizeSuite(runs, suite.requestedRuns) });
      }
      setRows(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section aria-labelledby="compare-title">
      <h1 id="compare-title">Compare</h1>
      <p>Select suites to compare side by side. Only the same benchmark identity inputs make stability claims comparable.</p>

      {history.suites.length === 0 ? (
        <p className="empty-state">No suites yet. Run benchmarks first.</p>
      ) : (
        <ul className="doc-list">
          {history.suites.map((s) => (
            <li key={s.id} className="doc-card">
              <label className="checkbox">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="doc-card__name">{s.name ?? s.id.slice(0, 8)}</span>
              </label>
              <span className="doc-card__meta">
                {s.identity.model} · {s.identity.inputMode} · {s.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="status-error">
          {error}
        </p>
      ) : null}

      <div className="toolbar">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void compare()}
          disabled={selected.size === 0}
        >
          Compare selected
        </button>
      </div>

      {rows.length > 0 ? (
        <div className="compare-wrap" role="region" aria-label="Comparison table">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Metric</th>
                {rows.map((row) => (
                  <th key={row.suite.id}>
                    {row.suite.identity.model}
                    <div className="doc-card__meta">{row.suite.identity.inputMode}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Status</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>{row.suite.status}</td>
                ))}
              </tr>
              <tr>
                <th>Attempted</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>
                    {row.summary.attemptedRuns}/{row.summary.requestedRuns}
                  </td>
                ))}
              </tr>
              <tr>
                <th>Exact pass</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>{pct(row.summary.exactPassRate)}</td>
                ))}
              </tr>
              <tr>
                <th>Schema-valid</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>{pct(row.summary.schemaValidRate)}</td>
                ))}
              </tr>
              <tr>
                <th>Avg leaf accuracy</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>{pct(row.summary.avgLeafAccuracy)}</td>
                ))}
              </tr>
              <tr>
                <th>Row accuracy</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>{pct(row.summary.rowAccuracy)}</td>
                ))}
              </tr>
              <tr>
                <th>Consistency</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>{pct(row.summary.consistencyRate)}</td>
                ))}
              </tr>
              <tr>
                <th>Unique variants</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>{row.summary.uniqueVariants}</td>
                ))}
              </tr>
              <tr>
                <th>Latency avg / p95</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>
                    {row.summary.latency.avg === undefined ? "—" : Math.round(row.summary.latency.avg) + " ms"} /{" "}
                    {row.summary.latency.p95 === undefined ? "—" : Math.round(row.summary.latency.p95) + " ms"}
                  </td>
                ))}
              </tr>
              <tr>
                <th>Cost total</th>
                {rows.map((row) => (
                  <td key={row.suite.id}>
                    {row.summary.cost.totalUsd === undefined ? "unknown" : "$" + row.summary.cost.totalUsd.toFixed(6)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
