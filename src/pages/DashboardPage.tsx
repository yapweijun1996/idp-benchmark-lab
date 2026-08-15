import { useEffect, useState } from "react";
import { summarizeSuite, type SuiteSummary } from "../benchmarks/summary";
import { useRunHistory } from "../benchmarks/useRunHistory";
import { getDb } from "../storage/db";
import type { BenchmarkRun, BenchmarkSuite } from "../storage/types";

interface LatestEntry {
  suite: BenchmarkSuite;
  runs: BenchmarkRun[];
  summary: SuiteSummary;
}

const pct = (v: number | undefined): string => (v === undefined ? "—" : (v * 100).toFixed(1) + "%");

/**
 * Dashboard (DESIGN.md): the most recent benchmark at a glance — active
 * configuration, accuracy, stability, spend, and latency — plus recent
 * suites and storage totals.
 */
export function DashboardPage() {
  const history = useRunHistory();
  const [latest, setLatest] = useState<LatestEntry | null>(null);
  const [totals, setTotals] = useState<{ suites: number; runs: number }>({ suites: 0, runs: 0 });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const db = getDb();
      const allSuites = await db.benchmarkSuites.toArray();
      const allRuns = await db.benchmarkRuns.toArray();
      if (cancelled) {
        return;
      }
      setTotals({ suites: allSuites.length, runs: allRuns.length });
      const ordered = [...allSuites].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const target = ordered.find((s) => s.status === "completed") ?? ordered[0];
      if (!target) {
        setLatest(null);
        return;
      }
      const runs = allRuns
        .filter((r) => r.suiteId === target.id)
        .sort((a, b) => a.runNumber - b.runNumber);
      setLatest({ suite: target, runs, summary: summarizeSuite(runs, target.requestedRuns) });
    })();
    return () => {
      cancelled = true;
    };
  }, [history.suites]);

  return (
    <section aria-labelledby="dashboard-title">
      <h1 id="dashboard-title">Dashboard</h1>

      <div className="provider-grid">
        <div className="profile-form">
          <h2>Overview</h2>
          <p>
            <span className="chip chip--todo">{totals.suites} suites</span>
            <span className="chip chip--session">{totals.runs} runs</span>
          </p>
          <p className="doc-card__meta">
            All data stays in this browser. Run benchmarks from the Benchmarks page.
          </p>
        </div>

        {latest ? (
          <div className="profile-form" role="region" aria-label="Latest benchmark">
            <h2>
              Latest benchmark{" "}
              <span className={"chip " + (latest.suite.status === "completed" ? "chip--ok" : "chip--todo")}>
                {latest.suite.status}
              </span>
            </h2>
            <p className="doc-card__meta">
              {latest.suite.identity.model} · {latest.suite.identity.inputMode} ·{" "}
              {latest.runs.length}/{latest.suite.requestedRuns} runs
            </p>
            <table className="summary-table">
              <tbody>
                <tr>
                  <th>Exact pass</th>
                  <td>{pct(latest.summary.exactPassRate)}</td>
                  <th>Schema-valid</th>
                  <td>{pct(latest.summary.schemaValidRate)}</td>
                </tr>
                <tr>
                  <th>Avg leaf accuracy</th>
                  <td>{pct(latest.summary.avgLeafAccuracy)}</td>
                  <th>Consistency</th>
                  <td>{pct(latest.summary.consistencyRate)}</td>
                </tr>
                <tr>
                  <th>Unique variants</th>
                  <td>{latest.summary.uniqueVariants}</td>
                  <th>Latency avg / p95</th>
                  <td>
                    {latest.summary.latency.avg === undefined ? "—" : Math.round(latest.summary.latency.avg) + " ms"} /{" "}
                    {latest.summary.latency.p95 === undefined ? "—" : Math.round(latest.summary.latency.p95) + " ms"}
                  </td>
                </tr>
                <tr>
                  <th>Cost total</th>
                  <td>
                    {latest.summary.cost.totalUsd === undefined ? "unknown" : "$" + latest.summary.cost.totalUsd.toFixed(6)}
                  </td>
                  <th>Error rate</th>
                  <td>{pct(latest.summary.errorRate)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="profile-form">
            <h2>No benchmarks yet</h2>
            <p className="empty-state">
              Upload a document, create a profile and Golden Answer, configure a provider, then run a benchmark.
            </p>
          </div>
        )}
      </div>

      <h2>Recent suites</h2>
      {history.suites.length === 0 ? (
        <p className="empty-state">No suites yet.</p>
      ) : (
        <ul className="doc-list">
          {history.suites.slice(0, 5).map((s) => (
            <li key={s.id} className="doc-card">
              <span className="doc-card__main">
                <span className="doc-card__name">{s.name ?? s.id.slice(0, 8)}</span>
                <span className="doc-card__meta">
                  {s.identity.model} · {s.identity.inputMode} · {s.requestedRuns} run(s)
                </span>
              </span>
              <span className={"chip " + (s.status === "completed" ? "chip--ok" : s.status === "failed" ? "chip--bad" : "chip--todo")}>
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
