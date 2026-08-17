import { useState } from "react";
import { useRunHistory } from "../benchmarks/useRunHistory";
import type { BenchmarkRun, BenchmarkSuite, GoldenAnswer } from "../storage/types";
import { getDb } from "../storage/db";
import { SuiteDetail } from "./SuiteDetail";

export function RunsResultsPage() {
  const history = useRunHistory();

  const [inspecting, setInspecting] = useState<{
    suite: BenchmarkSuite;
    runs: BenchmarkRun[];
    golden?: GoldenAnswer;
  } | null>(null);

  const inspectSuite = async (suite: BenchmarkSuite) => {
    const db = getDb();
    const runs = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
    runs.sort((a, b) => a.runNumber - b.runNumber);
    const golden = suite.identity.goldenId ? await db.goldenAnswers.get(suite.identity.goldenId) : undefined;
    setInspecting({ suite, runs, golden });
  };

  return (
    <section aria-labelledby="runs-results-title">
      <h1 id="runs-results-title">Runs & Results</h1>
      <p>Every benchmark run in this browser, newest first. Inspect one for field accuracy, drift, and export.</p>

      {inspecting ? (
        <SuiteDetail suite={inspecting.suite} runs={inspecting.runs} golden={inspecting.golden} />
      ) : null}

      <h2>Recent runs</h2>
      {history.suites.length === 0 ? (
        <p className="empty-state">
          No runs yet. Start a{" "}
          <a href="#/new-benchmark">New Benchmark</a> to see results here.
        </p>
      ) : (
        <ul className="doc-list">
          {history.suites.map((s) => (
            <li key={s.id} className="doc-card">
              <span className="doc-card__main">
                <span className="doc-card__name">{s.name ?? "Benchmark"}</span>
                <span className="doc-card__meta">
                  {s.identity.model} · {s.identity.inputMode} · {s.requestedRuns} run(s)
                </span>
              </span>
              <span className={"chip " + (s.status === "failed" ? "chip--bad" : s.status === "completed" ? "chip--ok" : "chip--todo")}>
                {s.status}
              </span>
              <button type="button" onClick={() => void inspectSuite(s)}>
                Inspect
              </button>
              <span className="doc-card__meta">{new Date(s.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
