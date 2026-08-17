import { useEffect, useMemo, useState, type ReactNode } from "react";
import { checkModeSupport } from "../providers/capabilityGate";
import { adapterFor } from "../providers/registry";
import { RunFailure, SingleRunService, type SingleRunResult } from "../benchmarks/singleRun";
import { browserExecuteDeps } from "../documents/runtimeDeps";
import { useDocuments } from "../documents/useDocuments";
import { useGoldens } from "../golden/useGoldens";
import { useProfiles } from "../profiles/useProfiles";
import { useProviderConfigs } from "../providers/useProviderConfigs";
import { getAppSettings } from "../storage/settings";
import type { InputMode } from "../storage/types";
import { RepeatedBenchmarkSection, type BenchmarkFactory } from "./RepeatedBenchmarkSection";

interface NewBenchmarkWizardProps {
  /** Test seam: supplies a runner without touching the real service. */
  singleRunFactory?: () => Pick<SingleRunService, "run">;
  /** Test seam for the repeated benchmark runner. */
  benchmarkFactory?: BenchmarkFactory;
}

const STEP_LABELS = ["Document", "What to Extract", "Expected Result", "Choose AI", "Run Settings", "Review & Run"] as const;

export function NewBenchmarkWizard({ singleRunFactory, benchmarkFactory }: NewBenchmarkWizardProps) {
  const documents = useDocuments();
  const profiles = useProfiles();
  const providers = useProviderConfigs();
  const goldens = useGoldens();

  const [step, setStep] = useState(0);
  const [documentId, setDocumentId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [goldenId, setGoldenId] = useState("");
  const [providerConfigId, setProviderConfigId] = useState("");
  const [mode, setMode] = useState<InputMode>("native_pdf");
  const [runType, setRunType] = useState<"quick" | "benchmark">("quick");
  const [temperature, setTemperature] = useState("");
  const [thinking, setThinking] = useState("");

  useEffect(() => {
    void getAppSettings()
      .then((s) => setMode(s.defaultInputMode))
      .catch(() => undefined);
  }, []);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SingleRunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const documentReady = documentId !== "";
  const templateReady = profileId !== "";
  const providerReady = providerConfigId !== "";

  const maxReachable = useMemo(() => {
    if (!documentReady) return 0;
    if (!templateReady) return 1;
    if (!providerReady) return 3; // step 2 (Expected Result) is optional, so provider gate applies once past it
    return 5;
  }, [documentReady, templateReady, providerReady]);

  const eligibleGoldens = goldens.goldens.filter((g) => g.documentId === documentId && g.profileId === profileId);

  const selectedProvider = providers.configs.find((c) => c.id === providerConfigId);
  const modeSupport = selectedProvider
    ? checkModeSupport(adapterFor(selectedProvider.kind), selectedProvider, mode)
    : null;

  const goTo = (target: number) => {
    if (target <= maxReachable) {
      setStep(target);
    }
  };

  const selectedDocument = documents.documents.find((d) => d.id === documentId);
  const selectedProfile = profiles.profiles.find((p) => p.id === profileId);
  const selectedGolden = goldens.goldens.find((g) => g.id === goldenId);

  const runQuick = async () => {
    setResult(null);
    setFailure(null);
    if (!documentId || !profileId || !providerConfigId) {
      setFailure("Select a document, extraction template, and AI provider before running.");
      return;
    }
    if (modeSupport && !modeSupport.supported) {
      setFailure("Incompatible configuration: " + (modeSupport.reason ?? "The selected provider does not support this input mode."));
      return;
    }
    setRunning(true);
    try {
      const service = singleRunFactory ? singleRunFactory() : new SingleRunService(browserExecuteDeps());
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
    } catch (e) {
      if (e instanceof RunFailure) {
        setFailure(e.error.category + ": " + e.error.message);
      } else {
        setFailure(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <section aria-labelledby="new-benchmark-title">
      <h1 id="new-benchmark-title">New Benchmark</h1>
      <p>Upload a document, tell the AI what to extract, and see how accurate, stable, fast, and cheap it is.</p>

      <ol className="wizard-stepper" aria-label="Benchmark setup steps">
        {STEP_LABELS.map((label, i) => {
          const state = i === step ? "current" : i < step ? "done" : "todo";
          return (
            <li key={label}>
              <button
                type="button"
                className={"wizard-step wizard-step--" + state}
                aria-current={i === step ? "step" : undefined}
                disabled={i > maxReachable}
                onClick={() => goTo(i)}
              >
                <span className="wizard-step__index">{i < step ? "✓" : i + 1}</span>
                <span className="wizard-step__label">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="wizard-readiness" role="status">
        <span className={documentReady ? "wizard-check wizard-check--ok" : "wizard-check"}>
          {documentReady ? "✓" : "○"} Document
        </span>
        <span className={templateReady ? "wizard-check wizard-check--ok" : "wizard-check"}>
          {templateReady ? "✓" : "○"} Extraction template
        </span>
        <span className={goldenId ? "wizard-check wizard-check--ok" : "wizard-check wizard-check--optional"}>
          {goldenId ? "✓" : "○"} Expected result (recommended)
        </span>
        <span className={providerReady ? "wizard-check wizard-check--ok" : "wizard-check"}>
          {providerReady ? "✓" : "○"} AI provider
        </span>
      </div>

      <div className="profile-form wizard-panel">
        {step === 0 ? (
          <DocumentStep
            documents={documents.documents}
            documentId={documentId}
            onSelect={setDocumentId}
            onUpload={(file) => void documents.upload(file, false)}
            error={documents.error}
          />
        ) : null}

        {step === 1 ? (
          <TemplateStep profiles={profiles.profiles} profileId={profileId} onSelect={setProfileId} />
        ) : null}

        {step === 2 ? (
          <ExpectedResultStep
            documentName={selectedDocument?.name}
            templateName={selectedProfile ? `${selectedProfile.name} (v${selectedProfile.version})` : undefined}
            goldens={eligibleGoldens}
            goldenId={goldenId}
            onSelect={setGoldenId}
          />
        ) : null}

        {step === 3 ? (
          <ProviderStep
            configs={providers.configs}
            providerConfigId={providerConfigId}
            onSelect={setProviderConfigId}
            modeSupport={modeSupport}
          />
        ) : null}

        {step === 4 ? (
          <RunSettingsStep
            runType={runType}
            onRunType={setRunType}
            mode={mode}
            onMode={setMode}
            advancedOpen={advancedOpen}
            onAdvancedOpen={setAdvancedOpen}
            temperature={temperature}
            onTemperature={setTemperature}
            thinking={thinking}
            onThinking={setThinking}
          />
        ) : null}

        {step === 5 ? (
          <ReviewStep
            documentName={selectedDocument?.name}
            templateName={selectedProfile ? `${selectedProfile.name} (v${selectedProfile.version})` : undefined}
            goldenVersion={selectedGolden?.version}
            providerName={selectedProvider ? `${selectedProvider.name} · ${selectedProvider.model}` : undefined}
            mode={mode}
            runType={runType}
            modeSupport={modeSupport}
            running={running}
            result={result}
            failure={failure}
            onRunQuick={() => void runQuick()}
            benchmarkSection={
              runType === "benchmark" ? (
                <RepeatedBenchmarkSection
                  benchmarkFactory={benchmarkFactory}
                  unsupportedReason={modeSupport && !modeSupport.supported ? modeSupport.reason : undefined}
                  selection={{
                    documentId,
                    profileId,
                    providerConfigId,
                    goldenId: goldenId || undefined,
                    mode,
                    temperature: temperature.trim() === "" ? undefined : Number(temperature),
                    thinking: thinking.trim() || undefined,
                  }}
                />
              ) : null
            }
          />
        ) : null}
      </div>

      <div className="toolbar wizard-nav">
        <button type="button" className="btn" onClick={() => goTo(step - 1)} disabled={step === 0}>
          Back
        </button>
        {step < 5 ? (
          <button type="button" className="btn btn--primary" onClick={() => goTo(step + 1)} disabled={step + 1 > maxReachable}>
            Continue →
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DocumentStep({
  documents,
  documentId,
  onSelect,
  onUpload,
  error,
}: {
  documents: { id: string; name: string; pageCount?: number; size: number }[];
  documentId: string;
  onSelect: (id: string) => void;
  onUpload: (file: File) => void;
  error: string | null;
}) {
  return (
    <div>
      <h2>Choose a document to test</h2>
      <div className="toolbar">
        <label className="btn btn--primary" style={{ cursor: "pointer" }}>
          Browse files
          <input
            type="file"
            accept="application/pdf"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="status-error">
          {error}
        </p>
      ) : null}
      {documents.length === 0 ? (
        <p className="empty-state">No documents yet. Upload a PDF to begin.</p>
      ) : (
        <ul className="doc-list">
          {documents.map((d) => (
            <li key={d.id} className="doc-card">
              <label className="doc-card__main">
                <input type="radio" name="wizard-document" checked={documentId === d.id} onChange={() => onSelect(d.id)} />
                <span className="doc-card__name">{d.name}</span>
                <span className="doc-card__meta">
                  {(d.size / 1024).toFixed(1)} KB{d.pageCount ? ` · ${d.pageCount} pages` : ""}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="doc-card__meta">
        Need more document management (preview, delete, keep on this device)? Use <a href="#/library">Library</a>.
      </p>
    </div>
  );
}

function TemplateStep({
  profiles,
  profileId,
  onSelect,
}: {
  profiles: { id: string; name: string; version: number; description?: string }[];
  profileId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2>What should the AI extract?</h2>
      <p className="doc-card__meta">An extraction template defines which fields the AI should return.</p>
      {profiles.length === 0 ? (
        <p className="empty-state">
          No extraction templates yet. <a href="#/library">Create one in Library</a>, then come back.
        </p>
      ) : (
        <ul className="doc-list">
          {profiles.map((p) => (
            <li key={p.id} className="doc-card">
              <label className="doc-card__main">
                <input type="radio" name="wizard-template" checked={profileId === p.id} onChange={() => onSelect(p.id)} />
                <span className="doc-card__name">
                  {p.name} (v{p.version})
                </span>
                {p.description ? <span className="doc-card__meta">{p.description}</span> : null}
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="doc-card__meta">
        Manage or duplicate templates in <a href="#/library">Library</a>.
      </p>
    </div>
  );
}

function ExpectedResultStep({
  documentName,
  templateName,
  goldens,
  goldenId,
  onSelect,
}: {
  documentName: string | undefined;
  templateName: string | undefined;
  goldens: { id: string; version: number }[];
  goldenId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2>Expected Result</h2>
      <p className="doc-card__meta">
        Also known as Ground Truth / Golden Answer. Enter the correct result so the benchmark can measure extraction
        accuracy. Optional, but strongly recommended.
      </p>
      <p className="doc-card__meta">
        For <strong>{documentName ?? "the selected document"}</strong> with{" "}
        <strong>{templateName ?? "the selected template"}</strong>:
      </p>
      {goldens.length === 0 ? (
        <p className="empty-state">
          No expected result for this document + template yet.{" "}
          <a href="#/library">Add one in Library</a>, or skip — you can still run without accuracy scoring.
        </p>
      ) : (
        <ul className="doc-list">
          <li className="doc-card">
            <label className="doc-card__main">
              <input type="radio" name="wizard-golden" checked={goldenId === ""} onChange={() => onSelect("")} />
              <span className="doc-card__name">None — skip accuracy scoring</span>
            </label>
          </li>
          {goldens.map((g) => (
            <li key={g.id} className="doc-card">
              <label className="doc-card__main">
                <input type="radio" name="wizard-golden" checked={goldenId === g.id} onChange={() => onSelect(g.id)} />
                <span className="doc-card__name">Expected result v{g.version}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProviderStep({
  configs,
  providerConfigId,
  onSelect,
  modeSupport,
}: {
  configs: { id: string; name: string; model: string }[];
  providerConfigId: string;
  onSelect: (id: string) => void;
  modeSupport: { supported: boolean; reason?: string } | null;
}) {
  return (
    <div>
      <h2>Choose AI</h2>
      {configs.length === 0 ? (
        <p className="empty-state">
          No AI providers connected yet. <a href="#/settings">Connect one in Settings</a>, then come back.
        </p>
      ) : (
        <ul className="doc-list">
          {configs.map((c) => (
            <li key={c.id} className="doc-card">
              <label className="doc-card__main">
                <input type="radio" name="wizard-provider" checked={providerConfigId === c.id} onChange={() => onSelect(c.id)} />
                <span className="doc-card__name">{c.name}</span>
                <span className="doc-card__meta">{c.model}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {modeSupport && !modeSupport.supported ? (
        <p role="status" className="schema-bad">
          Incompatible configuration: {modeSupport.reason}
        </p>
      ) : null}
      <p className="doc-card__meta">
        Manage connections in <a href="#/settings">Settings</a>.
      </p>
    </div>
  );
}

function RunSettingsStep({
  runType,
  onRunType,
  mode,
  onMode,
  advancedOpen,
  onAdvancedOpen,
  temperature,
  onTemperature,
  thinking,
  onThinking,
}: {
  runType: "quick" | "benchmark";
  onRunType: (v: "quick" | "benchmark") => void;
  mode: InputMode;
  onMode: (m: InputMode) => void;
  advancedOpen: boolean;
  onAdvancedOpen: (v: boolean) => void;
  temperature: string;
  onTemperature: (v: string) => void;
  thinking: string;
  onThinking: (v: string) => void;
}) {
  return (
    <div>
      <h2>Run Settings</h2>
      <fieldset className="mode-picker">
        <legend>Test type</legend>
        <label>
          <input type="radio" name="wizard-runtype" checked={runType === "quick"} onChange={() => onRunType("quick")} />
          Quick Test — run once to verify the setup.
        </label>
        <label>
          <input type="radio" name="wizard-runtype" checked={runType === "benchmark"} onChange={() => onRunType("benchmark")} />
          Benchmark — repeat the same configuration to measure accuracy and consistency.
        </label>
      </fieldset>

      <fieldset className="mode-picker">
        <legend>Input mode</legend>
        <label>
          <input type="radio" name="wizard-mode" checked={mode === "native_pdf"} onChange={() => onMode("native_pdf")} />
          Send original PDF — best when the provider supports PDF input directly.
        </label>
        <label>
          <input type="radio" name="wizard-mode" checked={mode === "canonical_images"} onChange={() => onMode("canonical_images")} />
          Render pages as images — recommended for fair cross-provider comparisons.
        </label>
      </fieldset>

      <details open={advancedOpen} onToggle={(e) => onAdvancedOpen(e.currentTarget.open)}>
        <summary>Advanced settings</summary>
        <label className="field">
          <span>Temperature (optional)</span>
          <input type="number" step="0.1" value={temperature} onChange={(e) => onTemperature(e.target.value)} />
        </label>
        <label className="field">
          <span>Reasoning effort (optional, Gemini)</span>
          <input type="text" value={thinking} onChange={(e) => onThinking(e.target.value)} />
        </label>
      </details>
    </div>
  );
}

function ReviewStep({
  documentName,
  templateName,
  goldenVersion,
  providerName,
  mode,
  runType,
  modeSupport,
  running,
  result,
  failure,
  onRunQuick,
  benchmarkSection,
}: {
  documentName: string | undefined;
  templateName: string | undefined;
  goldenVersion: number | undefined;
  providerName: string | undefined;
  mode: InputMode;
  runType: "quick" | "benchmark";
  modeSupport: { supported: boolean; reason?: string } | null;
  running: boolean;
  result: SingleRunResult | null;
  failure: string | null;
  onRunQuick: () => void;
  benchmarkSection: ReactNode;
}) {
  const blocked = modeSupport ? !modeSupport.supported : false;
  return (
    <div>
      <h2>Ready to benchmark</h2>
      <table className="summary-table">
        <tbody>
          <tr>
            <th>Document</th>
            <td>{documentName ?? "—"}</td>
          </tr>
          <tr>
            <th>Extraction template</th>
            <td>{templateName ?? "—"}</td>
          </tr>
          <tr>
            <th>Expected result</th>
            <td>{goldenVersion !== undefined ? `v${goldenVersion}` : "none — accuracy scoring skipped"}</td>
          </tr>
          <tr>
            <th>AI provider</th>
            <td>{providerName ?? "—"}</td>
          </tr>
          <tr>
            <th>Input</th>
            <td>{mode === "native_pdf" ? "Send original PDF" : "Render pages as images"}</td>
          </tr>
          <tr>
            <th>Estimated cost</th>
            <td>Unknown until the first run completes — set a budget cap below to limit spend.</td>
          </tr>
        </tbody>
      </table>

      {blocked ? (
        <p role="status" className="schema-bad">
          Incompatible configuration: {modeSupport?.reason}
        </p>
      ) : null}

      {runType === "quick" ? (
        <>
          {running ? (
            <p role="status" className="schema-ok">
              Running…
            </p>
          ) : failure ? (
            <p role="alert" className="status-error">
              ✗ Quick Test failed: {failure}
            </p>
          ) : result ? (
            <p role="status" className={result.run.state === "succeeded" ? "schema-ok" : "schema-bad"}>
              {result.run.state === "succeeded" ? "✓ Quick Test completed" : "Quick Test finished with issues"}
            </p>
          ) : null}
          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={onRunQuick} disabled={running || blocked}>
              {running ? "Running…" : result || failure ? "Run again" : "Run Quick Test"}
            </button>
          </div>
          {result ? (
            <>
              <RunResultPanel result={result} />
              <p className="doc-card__meta">
                <a href="#/runs">View this run in Runs &amp; Results</a>
              </p>
            </>
          ) : null}
        </>
      ) : (
        benchmarkSection
      )}
    </div>
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
