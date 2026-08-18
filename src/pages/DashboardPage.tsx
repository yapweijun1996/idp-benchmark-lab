import { useEffect, useState } from "react";
import { summarizeSuite, type SuiteSummary } from "../benchmarks/summary";
import { useRunHistory } from "../benchmarks/useRunHistory";
import { getDb } from "../storage/db";
import type { BenchmarkRun, BenchmarkSuite } from "../storage/types";
import { useI18n } from "../i18n";

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
  const { t } = useI18n();
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

  if (!latest) {
    return (
      <section className="home-page" aria-labelledby="dashboard-title">
        <div className="home-hero">
          <div className="home-hero__copy">
            <p className="home-eyebrow">{t("INTELLIGENT DOCUMENT PROCESSING")}</p>
            <h1 id="dashboard-title" aria-label={t("route.home")} className="home-hero__title">
              {t("Benchmark document")}
              <br />
              {t("extraction with confidence")}
            </h1>
            <p className="home-hero__description">
              {t("Compare AI providers against a golden result to measure accuracy and consistency of structured data extracted from documents.")}
            </p>
            <div className="home-hero__actions">
              <a href="#/new-benchmark" className="btn btn--primary home-cta">
                {t("Run benchmark step by step")} <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>

        <div className="home-status-grid" aria-label={t("Demo readiness")}>
          <HomeStatusCard
            tone="blue"
            icon="▤"
            title={t("Demo sample")}
            detail={t("Popular Purchase Order")}
            badge={`1 ${t("page")}`}
          />
          <HomeStatusCard tone="green" icon="✓" title={t("Golden schema")} detail={t("Ready")} badge={t("Validated")} />
          <HomeStatusCard tone="purple" icon="↻" title={t("Suggested run mode")} detail={`3 ${t("repeated runs")}`} badge={t("Recommended")} />
        </div>

        <div className="home-workspace-grid">
          <GuidedBenchmarkStart />
          <HowItWorks />
        </div>

        <HomePrinciples />
      </section>
    );
  }

  return (
    <section className="home-page home-page--history" aria-labelledby="dashboard-title">
      <div className="home-hero home-hero--compact">
        <p className="home-eyebrow">{t("BENCHMARK WORKSPACE")}</p>
        <h1 id="dashboard-title" aria-label={t("route.home")} className="home-hero__title">
          {t("Benchmark document")}
          <br />
          {t("extraction with confidence")}
        </h1>
        <p className="home-hero__description">
          {t("Review your latest benchmark and continue testing accuracy, stability, latency, and cost.")}
        </p>
        <div className="home-hero__actions">
          <a href="#/new-benchmark" className="btn btn--primary home-cta">
            {t("Start benchmark")} <span aria-hidden="true">→</span>
          </a>
          {history.suites.length >= 2 ? (
            <a href="#/compare" className="btn home-cta home-cta--secondary">
              {t("Compare results")} <span aria-hidden="true">＋</span>
            </a>
          ) : null}
        </div>
      </div>

      <div className="home-history-grid">
        <div className="profile-form home-summary-card">
          <h2>{t("Overview")}</h2>
          <p>
            <span className="chip chip--todo">{totals.suites} {t("benchmarks")}</span>
            <span className="chip chip--session">{totals.runs} {t("runs")}</span>
          </p>
          <p className="doc-card__meta">{t("All data stays in this browser.")}</p>
        </div>

        <div className="profile-form home-summary-card" role="region" aria-label={t("Latest benchmark")}>
          <h2>
            {t("Latest benchmark")}{" "}
            <span className={"chip " + (latest.suite.status === "completed" ? "chip--ok" : "chip--todo")}>
              {t(latest.suite.status)}
            </span>
          </h2>
          <p className="doc-card__meta">
            {latest.suite.identity.model} · {latest.suite.identity.inputMode} ·{" "}
            {latest.runs.length}/{latest.suite.requestedRuns} {t("runs")}
          </p>
          <table className="summary-table">
            <tbody>
              <tr>
                <th>{t("Exact pass")}</th>
                <td>{pct(latest.summary.exactPassRate)}</td>
                <th>{t("Schema-valid")}</th>
                <td>{pct(latest.summary.schemaValidRate)}</td>
              </tr>
              <tr>
                <th>{t("Avg leaf accuracy")}</th>
                <td>{pct(latest.summary.avgLeafAccuracy)}</td>
                <th>{t("Consistency")}</th>
                <td>{pct(latest.summary.consistencyRate)}</td>
              </tr>
              <tr>
                <th>{t("Unique variants")}</th>
                <td>{latest.summary.uniqueVariants}</td>
                <th>{t("Latency avg / p95")}</th>
                <td>
                  {latest.summary.latency.avg === undefined ? "—" : Math.round(latest.summary.latency.avg) + " ms"} /{" "}
                  {latest.summary.latency.p95 === undefined ? "—" : Math.round(latest.summary.latency.p95) + " ms"}
                </td>
              </tr>
              <tr>
                <th>{t("Cost total")}</th>
                <td>
                  {latest.summary.cost.totalUsd === undefined ? t("unknown") : "$" + latest.summary.cost.totalUsd.toFixed(6)}
                </td>
                <th>{t("Error rate")}</th>
                <td>{pct(latest.summary.errorRate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <h2>{t("Recent benchmarks")}</h2>
      <ul className="doc-list">
        {history.suites.slice(0, 5).map((s) => (
          <li key={s.id} className="doc-card">
            <span className="doc-card__main">
              <span className="doc-card__name">{s.name ?? s.id.slice(0, 8)}</span>
              <span className="doc-card__meta">
                {s.identity.model} · {s.identity.inputMode} · {s.requestedRuns} {t("runs")}
              </span>
            </span>
            <span className={"chip " + (s.status === "completed" ? "chip--ok" : s.status === "failed" ? "chip--bad" : "chip--todo")}>
              {t(s.status)}
            </span>
            <span className="doc-card__meta">{new Date(s.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GuidedBenchmarkStart() {
  const { t } = useI18n();
  return (
    <div className="profile-form home-guided-start" role="region" aria-label={t("Guided benchmark")}>
      <p className="home-eyebrow">{t("RECOMMENDED START")}</p>
      <h2>{t("Run a guided benchmark")}</h2>
      <p>
        {t("Use the bundled sample PDF or upload your own document, then review the Golden test setup before you run it.")}
      </p>
      <ol className="home-guided-start__steps">
        <li>{t("Choose a document")}</li>
        <li>{t("Review the extraction fields and Expected Result")}</li>
        <li>{t("Choose a provider and run the benchmark")}</li>
      </ol>
      <a href="#/new-benchmark" className="btn btn--primary home-cta">
        {t("Start benchmark")} <span aria-hidden="true">→</span>
      </a>
      <p className="doc-card__meta home-guided-start__note">{t("The bundled sample is available in step 1.")}</p>
    </div>
  );
}

function HomeStatusCard({
  tone,
  icon,
  title,
  detail,
  badge,
}: {
  tone: "blue" | "green" | "purple";
  icon: string;
  title: string;
  detail: string;
  badge: string;
}) {
  return (
    <div className="home-status-card">
      <span className={`home-status-card__icon home-status-card__icon--${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="home-status-card__copy">
        <strong>{title}</strong>
        <span>{detail}</span>
        <span className={`home-badge home-badge--${tone}`}>{badge}</span>
      </span>
    </div>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  return (
    <aside className="home-how-it-works" aria-labelledby="how-it-works-title">
      <div className="home-panel-heading">
        <h2 id="how-it-works-title">{t("How it works")}</h2>
        <span className="home-panel-kicker">4 {t("steps")}</span>
      </div>
      <ol className="home-steps">
        <li>
          <span className="home-step__number">1</span>
          <span className="home-step__icon" aria-hidden="true">▤</span>
          <span>
            <strong>{t("Select sample or upload document")}</strong>
            <small>{t("Pick a sample or upload your own document.")}</small>
          </span>
        </li>
        <li>
          <span className="home-step__number">2</span>
          <span className="home-step__icon" aria-hidden="true">✣</span>
          <span>
            <strong>{t("Choose provider and model")}</strong>
            <small>{t("Select the AI provider and model to test.")}</small>
          </span>
        </li>
        <li>
          <span className="home-step__number">3</span>
          <span className="home-step__icon" aria-hidden="true">↻</span>
          <span>
            <strong>{t("Run benchmark multiple times")}</strong>
            <small>{t("Run the extraction repeatedly to measure stability.")}</small>
          </span>
        </li>
        <li>
          <span className="home-step__number">4</span>
          <span className="home-step__icon" aria-hidden="true">✓</span>
          <span>
            <strong>{t("Compare against golden output")}</strong>
            <small>{t("See accuracy and consistency versus the golden result.")}</small>
          </span>
        </li>
      </ol>
    </aside>
  );
}

function HomePrinciples() {
  const { t } = useI18n();
  return (
    <div className="home-principles" aria-label={t("Benchmark principles")}>
      <HomePrinciple icon="◎" title={t("Accuracy scoring")} detail={t("Measure field-level accuracy against your golden schema.")} />
      <HomePrinciple icon="▥" title={t("Stability / consistency")} detail={t("Quantify variability across repeated runs to spot unreliable models.")} />
      <HomePrinciple icon="♙" title={t("Local-first privacy")} detail={t("Your documents and results stay on your device.")} />
    </div>
  );
}

function HomePrinciple({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <div className="home-principle">
      <span className="home-principle__icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}
