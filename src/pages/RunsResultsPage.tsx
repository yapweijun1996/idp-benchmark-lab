import { useState } from "react";
import { useRunHistory } from "../benchmarks/useRunHistory";
import type { BenchmarkRun, BenchmarkSuite, GoldenAnswer } from "../storage/types";
import { getDb } from "../storage/db";
import { SuiteDetail } from "./SuiteDetail";
import { useI18n } from "../i18n";

export function RunsResultsPage() {
  const { t } = useI18n();
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
      <h1 id="runs-results-title">{t("Runs & Results")}</h1>
      <p>{t("Every benchmark run in this browser, newest first. Inspect one for field accuracy, drift, and export.")}</p>

      {inspecting ? (
        <SuiteDetail suite={inspecting.suite} runs={inspecting.runs} golden={inspecting.golden} />
      ) : null}

      <h2>{t("Recent runs")}</h2>
      {history.suites.length === 0 ? (
        <p className="empty-state">
          {t("No runs yet. Start a")} <a href="#/new-benchmark">{t("New Benchmark")}</a> {t("to see results here.")}
        </p>
      ) : (
        <ul className="doc-list">
          {history.suites.map((s) => (
            <li key={s.id} className="doc-card run-card">
              <span className="doc-card__main">
                <span className="doc-card__name">{s.name ?? t("Benchmark")}</span>
                <span className="doc-card__meta">
                  {s.identity.model} · {s.identity.inputMode} · {s.requestedRuns} {t("runs")}
                </span>
              </span>
              <div className="run-card__status" aria-label={t("Run status")}>
                <span className={"chip " + (s.status === "failed" ? "chip--bad" : s.status === "completed" ? "chip--ok" : "chip--todo")}>
                  {t(s.status)}
                </span>
              </div>
              <div className="run-card__actions">
                <button type="button" className="btn btn--primary" onClick={() => void inspectSuite(s)}>
                  {t("Inspect results")} <span aria-hidden="true">→</span>
                </button>
                <span className="doc-card__meta run-card__timestamp">{new Date(s.createdAt).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
