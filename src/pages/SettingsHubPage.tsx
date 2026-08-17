import { useEffect, useRef, useState } from "react";
import { Tabs } from "../app/Tabs";
import { RUN_PRESETS, type RunPreset } from "../benchmarks/runner";
import { getDb, type IdpDatabase } from "../storage/db";
import { getAppSettings, saveAppSettings } from "../storage/settings";
import type { InputMode } from "../storage/types";
import { ProvidersPage } from "./ProvidersPage";
import { SettingsPage } from "./SettingsPage";

/** AI provider connections plus app-level settings (general, storage, backup, privacy, about). */
export function SettingsHubPage() {
  return (
    <section aria-labelledby="settings-hub-title">
      <h1 id="settings-hub-title">Settings</h1>

      <Tabs
        ariaLabel="Settings sections"
        idPrefix="settings-hub"
        tabs={[
          { id: "providers", label: "AI Providers", panel: <ProvidersPage /> },
          { id: "general", label: "General", panel: <GeneralPanel /> },
          { id: "storage", label: "Storage", panel: <StoragePanel /> },
          { id: "backup", label: "Backup & Restore", panel: <SettingsPage /> },
          { id: "privacy", label: "Privacy & Security", panel: <PrivacyPanel /> },
          { id: "about", label: "About", panel: <AboutPanel /> },
        ]}
      />
    </section>
  );
}

function GeneralPanel() {
  const [inputMode, setInputMode] = useState<InputMode>("native_pdf");
  const [runCount, setRunCount] = useState<number>(5);
  const touchedRef = useRef({ inputMode: false, runCount: false });

  useEffect(() => {
    void getAppSettings()
      .then((s) => {
        if (!touchedRef.current.inputMode) {
          setInputMode(s.defaultInputMode);
        }
        if (!touchedRef.current.runCount) {
          setRunCount(s.defaultRunCount);
        }
      })
      .catch(() => undefined);
  }, []);

  const changeMode = (mode: InputMode) => {
    touchedRef.current.inputMode = true;
    setInputMode(mode);
    void saveAppSettings({ defaultInputMode: mode }).catch(() => undefined);
  };

  const changeRunCount = (n: RunPreset) => {
    touchedRef.current.runCount = true;
    setRunCount(n);
    void saveAppSettings({ defaultRunCount: n }).catch(() => undefined);
  };

  return (
    <div>
      <h2>General</h2>
      <fieldset className="mode-picker">
        <legend>Default input mode for new benchmarks</legend>
        <label>
          <input
            type="radio"
            name="default-input-mode"
            checked={inputMode === "native_pdf"}
            onChange={() => changeMode("native_pdf")}
          />
          Send original PDF — best when the provider supports PDF input directly.
        </label>
        <label>
          <input
            type="radio"
            name="default-input-mode"
            checked={inputMode === "canonical_images"}
            onChange={() => changeMode("canonical_images")}
          />
          Render pages as images — recommended for fair cross-provider comparisons.
        </label>
      </fieldset>

      <fieldset className="mode-picker">
        <legend>Default run count for new benchmarks</legend>
        {RUN_PRESETS.map((n) => (
          <label key={n}>
            <input
              type="radio"
              name="default-run-count"
              checked={runCount === n}
              onChange={() => changeRunCount(n)}
            />
            {n}
          </label>
        ))}
        <p className="doc-card__meta">
          Applies to new benchmarks in the wizard. Benchmarks already in progress or already run are unaffected.
        </p>
      </fieldset>
    </div>
  );
}

const STORAGE_TABLES: { key: keyof IdpDatabase; label: string }[] = [
  { key: "documents", label: "Documents" },
  { key: "extractionProfiles", label: "Extraction templates" },
  { key: "goldenAnswers", label: "Expected results" },
  { key: "providerConfigs", label: "AI provider connections" },
  { key: "benchmarkSuites", label: "Benchmark suites" },
  { key: "benchmarkRuns", label: "Benchmark runs" },
];

function StoragePanel() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => {
    const db = getDb();
    void Promise.all(STORAGE_TABLES.map((t) => (db[t.key] as { count: () => Promise<number> }).count())).then(
      (values) => {
        const next: Record<string, number> = {};
        STORAGE_TABLES.forEach((t, i) => {
          next[t.key as string] = values[i] ?? 0;
        });
        setCounts(next);
      },
    );
  };

  useEffect(() => {
    refresh();
  }, []);

  const clearAll = async () => {
    const db = getDb();
    await Promise.all(db.tables.map((t) => t.clear()));
    setConfirming(false);
    setMessage("Local data cleared.");
    refresh();
  };

  return (
    <div>
      <h2>Storage</h2>
      <p className="doc-card__meta">Everything below lives only in this browser's IndexedDB.</p>
      {counts ? (
        <ul className="doc-list">
          {STORAGE_TABLES.map((t) => (
            <li key={t.key as string} className="doc-card">
              <span className="doc-card__name">{t.label}</span>
              <span className="doc-card__meta">{counts[t.key as string] ?? 0}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {message ? (
        <p role="status" className="schema-ok">
          {message}
        </p>
      ) : null}

      <div className="toolbar">
        {confirming ? (
          <>
            <span role="alert" className="status-error">
              This permanently deletes all documents, templates, expected results, provider connections, and
              benchmark history on this device.
            </span>
            <button type="button" className="btn btn--danger" onClick={() => void clearAll()}>
              Yes, clear everything
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--danger" onClick={() => setConfirming(true)}>
            Clear local data
          </button>
        )}
      </div>
    </div>
  );
}

function PrivacyPanel() {
  return (
    <div>
      <h2>Privacy & Security</h2>
      <p>
        This is a static PWA — there is no application backend. Requests to OpenAI, Gemini, or a custom
        OpenAI-compatible endpoint go directly from your browser to the provider using your own API key (BYOK).
      </p>
      <h3>API key handling</h3>
      <ul>
        <li>Keys are kept in memory only by default and are cleared when the tab closes.</li>
        <li>Opting in to "keep until this tab closes" stores the key in sessionStorage for that tab only.</li>
        <li>Keys are never written to IndexedDB, localStorage, exports, backups, the service-worker cache, or logs.</li>
      </ul>
      <p className="doc-card__meta">See SECURITY.md in the repository for the full threat model.</p>
    </div>
  );
}

function AboutPanel() {
  const version = typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "0.1.0";
  return (
    <div>
      <h2>About</h2>
      <p>IDP Benchmark Lab — a static, BYOK PWA for benchmarking document-extraction accuracy, stability, latency, and cost across AI providers.</p>
      <p className="doc-card__meta">Version {version}</p>
    </div>
  );
}
