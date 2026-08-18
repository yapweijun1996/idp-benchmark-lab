import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { checkModeSupport } from "../providers/capabilityGate";
import { adapterFor } from "../providers/registry";
import { RunFailure, SingleRunService, type SingleRunResult } from "../benchmarks/singleRun";
import { browserExecuteDeps } from "../documents/runtimeDeps";
import { PdfPreview } from "../documents/PdfPreview";
import { useDocuments } from "../documents/useDocuments";
import { useGoldens } from "../golden/useGoldens";
import { useProfiles } from "../profiles/useProfiles";
import { useProviderConfigs } from "../providers/useProviderConfigs";
import { getAppSettings } from "../storage/settings";
import { validateJsonSchema } from "../profiles/schema";
import { describeVisualSchema, updateVisualSchema, type VisualFieldType, type VisualSchemaAction } from "../profiles/visualSchema";
import type { InputMode } from "../storage/types";
import { RepeatedBenchmarkSection, type BenchmarkFactory } from "./RepeatedBenchmarkSection";
import {
  DEMO_DOCUMENT_ID,
  DEMO_PROFILE_ID,
  DEMO_PROVIDER_CONFIG_ID,
  NEXABYTE_DOCUMENT_ID,
  seedDemoFixture,
} from "../demo/seedDemoFixture";
import { useI18n } from "../i18n";

interface NewBenchmarkWizardProps {
  /** Test seam: supplies a runner without touching the real service. */
  singleRunFactory?: () => Pick<SingleRunService, "run">;
  /** Test seam for the repeated benchmark runner. */
  benchmarkFactory?: BenchmarkFactory;
}

const STEP_LABELS = ["Document", "What to Extract", "Expected Result", "Choose AI", "Run Settings", "Review & Run"] as const;

export function NewBenchmarkWizard({ singleRunFactory, benchmarkFactory }: NewBenchmarkWizardProps) {
  const { t } = useI18n();
  const documents = useDocuments();
  const profiles = useProfiles();
  const providers = useProviderConfigs();
  const goldens = useGoldens();
  const refreshDocuments = documents.refresh;
  const refreshProfiles = profiles.refresh;
  const refreshProviders = providers.refresh;
  const refreshGoldens = goldens.refresh;

  const [step, setStep] = useState(0);
  const [documentId, setDocumentId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [promptOverride, setPromptOverride] = useState<string | undefined>(undefined);
  const [schemaDraft, setSchemaDraft] = useState<string | undefined>(undefined);
  const [goldenId, setGoldenId] = useState("");
  const autoSelectedGoldenRef = useRef(false);
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

  useEffect(() => {
    let cancelled = false;
    void seedDemoFixture()
      .then(() => {
        if (!cancelled) {
          void Promise.all([refreshDocuments(), refreshProfiles(), refreshProviders(), refreshGoldens()]);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refreshDocuments, refreshGoldens, refreshProfiles, refreshProviders]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SingleRunResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Prefer the document service's active document so the bundled/demo PDF is
  // immediately visible when the wizard opens, while still allowing the user
  // to switch documents with the radio list.
  const selectedDocumentId = documentId || documents.activeId || "";
  const autoSelectedProfileId = useMemo(() => {
    if (profileId || selectedDocumentId !== DEMO_DOCUMENT_ID) return "";
    return profiles.profiles.some((profile) => profile.id === DEMO_PROFILE_ID) ? DEMO_PROFILE_ID : "";
  }, [profileId, profiles.profiles, selectedDocumentId]);
  const effectiveProfileId = profileId || autoSelectedProfileId;
  const autoSelectedProviderId = useMemo(() => {
    const isBundledDocument = selectedDocumentId === DEMO_DOCUMENT_ID || selectedDocumentId === NEXABYTE_DOCUMENT_ID;
    if (providerConfigId || !isBundledDocument) return "";
    return providers.configs.some((config) => config.id === DEMO_PROVIDER_CONFIG_ID) ? DEMO_PROVIDER_CONFIG_ID : "";
  }, [providerConfigId, providers.configs, selectedDocumentId]);
  const effectiveProviderConfigId = providerConfigId || autoSelectedProviderId;
  const documentReady = selectedDocumentId !== "";
  const templateReady = effectiveProfileId !== "";
  const providerReady = effectiveProviderConfigId !== "";

  const maxReachable = useMemo(() => {
    if (!documentReady) return 0;
    if (!templateReady) return 1;
    if (!providerReady) return 3; // step 2 (Expected Result) is optional, so provider gate applies once past it
    return 5;
  }, [documentReady, templateReady, providerReady]);

  const eligibleGoldens = goldens.goldens.filter((g) => g.documentId === selectedDocumentId && g.profileId === effectiveProfileId);

  useEffect(() => {
    if (autoSelectedGoldenRef.current || goldenId || eligibleGoldens.length !== 1) return;
    autoSelectedGoldenRef.current = true;
    setGoldenId(eligibleGoldens[0]!.id);
  }, [eligibleGoldens, goldenId]);

  const selectedProvider = providers.configs.find((c) => c.id === effectiveProviderConfigId);
  const modeSupport = selectedProvider
    ? checkModeSupport(adapterFor(selectedProvider.kind), selectedProvider, mode)
    : null;

  const goTo = (target: number) => {
    if (target <= maxReachable) {
      setStep(target);
    }
  };

  const selectedDocument = documents.documents.find((d) => d.id === selectedDocumentId);
  const selectedProfile = profiles.profiles.find((p) => p.id === effectiveProfileId);
  const selectedGolden = goldens.goldens.find((g) => g.id === goldenId);
  const effectivePrompt = promptOverride ?? selectedProfile?.basePrompt ?? "";
  const parsedSchemaDraft = parseSchemaDraft(schemaDraft, selectedProfile?.jsonSchema);
  const effectiveSchema = parsedSchemaDraft.value;
  const schemaErrors = parsedSchemaDraft.errors;
  const schemaError = schemaErrors[0] ?? null;
  const schemaText = schemaDraft ?? JSON.stringify(selectedProfile?.jsonSchema ?? {}, null, 2);

  const selectProfile = (id: string) => {
    setProfileId(id);
    setGoldenId("");
    autoSelectedGoldenRef.current = false;
    setPromptOverride(undefined);
    setSchemaDraft(undefined);
  };

  const runQuick = async () => {
    setResult(null);
    setFailure(null);
    if (!selectedDocumentId || !effectiveProfileId || !effectiveProviderConfigId) {
      setFailure(t("Select a document, extraction template, and AI provider before running."));
      return;
    }
    if (!effectivePrompt.trim()) {
      setFailure(t("The extraction prompt cannot be empty."));
      return;
    }
    if (schemaError) {
      setFailure(schemaError);
      return;
    }
    if (schemaDraft !== undefined) {
      const schemaCheck = validateJsonSchema(effectiveSchema);
      if (!schemaCheck.valid) {
        setFailure(`${t("Invalid JSON Schema")}: ${schemaCheck.errors.join("; ")}`);
        return;
      }
    }
    if (modeSupport && !modeSupport.supported) {
      setFailure(`${t("Incompatible configuration")}: ${modeSupport.reason ?? t("The selected provider does not support this input mode.")}`);
      return;
    }
    setRunning(true);
    try {
      const service = singleRunFactory ? singleRunFactory() : new SingleRunService(browserExecuteDeps());
      const outcome = await service.run({
        documentId: selectedDocumentId,
        profileId: effectiveProfileId,
        promptOverride,
        schemaOverride: schemaDraft === undefined ? undefined : effectiveSchema,
        providerConfigId: effectiveProviderConfigId,
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
      <h1 id="new-benchmark-title">{t("New Benchmark")}</h1>
      <p>{t("Upload a document, tell the AI what to extract, and see how accurate, stable, fast, and cheap it is.")}</p>

      <ol className="wizard-stepper" aria-label={t("Benchmark setup steps")}>
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
                <span className="wizard-step__label">{t(label)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="wizard-readiness" role="status">
        <span className={documentReady ? "wizard-check wizard-check--ok" : "wizard-check"}>
          {documentReady ? "✓" : "○"} {t("Document")}
        </span>
        <span className={templateReady ? "wizard-check wizard-check--ok" : "wizard-check"}>
          {templateReady ? "✓" : "○"} {t("Extraction template")}
        </span>
        <span className={goldenId ? "wizard-check wizard-check--ok" : "wizard-check wizard-check--optional"}>
          {goldenId ? "✓" : "○"} {t("Expected result (recommended)")}
        </span>
        <span className={providerReady ? "wizard-check wizard-check--ok" : "wizard-check"}>
          {providerReady ? "✓" : "○"} {t("AI provider")}
        </span>
      </div>

      <div className="toolbar wizard-nav wizard-nav--top">
        <button type="button" className="btn" onClick={() => goTo(step - 1)} disabled={step === 0}>
          {t("Back")}
        </button>
        {step < 5 ? (
          <button type="button" className="btn btn--primary" onClick={() => goTo(step + 1)} disabled={step + 1 > maxReachable}>
            {t("Continue")} →
          </button>
        ) : null}
      </div>

      <div className="profile-form wizard-panel">
        {step === 0 ? (
          <DocumentStep
            documents={documents.documents}
            documentId={selectedDocumentId}
            onUpload={async (file) => {
              const uploaded = await documents.upload(file, false);
              setDocumentId(uploaded.id);
            }}
            getBlob={documents.getBlob}
            updatePageCount={documents.updatePageCount}
            error={documents.error}
          />
        ) : null}

        {step === 1 ? (
          <TemplateStep
            profiles={profiles.profiles}
            profileId={effectiveProfileId}
            onSelect={selectProfile}
            prompt={effectivePrompt}
            onPromptChange={setPromptOverride}
            jsonSchema={effectiveSchema}
            schemaText={schemaText}
            schemaErrors={schemaErrors}
            onSchemaChange={setSchemaDraft}
            onSchemaReset={() => setSchemaDraft(undefined)}
          />
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
            providerConfigId={effectiveProviderConfigId}
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
                    documentId: selectedDocumentId,
                    profileId: effectiveProfileId,
                    promptOverride,
                    schemaOverride: schemaDraft === undefined ? undefined : effectiveSchema,
                    providerConfigId: effectiveProviderConfigId,
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

    </section>
  );
}

function DocumentStep({
  documents,
  documentId,
  onUpload,
  getBlob,
  updatePageCount,
  error,
}: {
  documents: { id: string; name: string; pageCount?: number; size: number }[];
  documentId: string;
  onUpload: (file: File) => void | Promise<void>;
  getBlob: (id: string) => Promise<Blob | undefined>;
  updatePageCount: (id: string, pageCount: number) => Promise<void>;
  error: string | null;
}) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<{ id: string; blob: Blob } | null>(null);
  const [previewError, setPreviewError] = useState<{ id: string; message: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let cancelled = false;
    void getBlob(documentId)
      .then((blob) => {
        if (cancelled) return;
        setPreviewError(null);
        if (!blob) {
          setPreview(null);
          setPreviewError({
            id: documentId,
            message: t("This document preview is unavailable in the current browser session."),
          });
          return;
        }
        setPreview({ id: documentId, blob });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setPreview(null);
          setPreviewError({ id: documentId, message: e instanceof Error ? e.message : String(e) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, getBlob, t]);

  const selectedDocument = documents.find((d) => d.id === documentId);

  return (
    <div className="wizard-document-workspace">
      <input
        ref={fileInputRef}
        id="wizard-document-upload"
        type="file"
        accept="application/pdf"
        aria-label={t("Replace document PDF")}
        className="visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onUpload(file);
          e.target.value = "";
        }}
      />
      <div className="wizard-document-workspace__header">
        <div>
          <h2>{t("Test document")}</h2>
          <p className="wizard-document-helper">{t("This PDF will be sent to the selected provider.")}</p>
        </div>
        <a className="wizard-document-library" href="#/library">
          {t("Manage library")}
        </a>
      </div>
      {error ? (
        <p role="alert" className="status-error">
          {error}
        </p>
      ) : null}
      {!selectedDocument ? (
        <div className="wizard-document-empty">
          <p className="empty-state">{t("No document selected. Choose a PDF to begin.")}</p>
          <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
            {t("Choose PDF")}
          </button>
        </div>
      ) : (
        <>
          <div className="wizard-document-file-row">
            <span className="wizard-document-file-icon" aria-hidden="true"><DocumentIcon /></span>
            <div className="wizard-document-file-info">
              <div className="wizard-document-file-name">
                <strong>{selectedDocument.name}</strong>
                {selectedDocument.id === DEMO_DOCUMENT_ID ? <span className="chip chip--demo">{t("Demo document")}</span> : null}
              </div>
              <span className="wizard-document-file-meta">
                PDF <span aria-hidden="true">•</span> {(selectedDocument.size / 1024).toFixed(1)} KB <span aria-hidden="true">•</span>{" "}
                {selectedDocument.pageCount ? `${selectedDocument.pageCount} ${selectedDocument.pageCount === 1 ? t("page") : t("pages")}` : t("Page count loading")}
              </span>
            </div>
            <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
              {t("Replace")}
            </button>
          </div>

          <div className="wizard-document-preview-area">
            <div className="wizard-document-preview-toolbar">
              <h3>{t("Preview")}</h3>
              <div className="wizard-document-preview-controls">
                <span className="wizard-document-page-count" aria-label={t("Preview page count")}>
                  {selectedDocument.pageCount ? `${selectedDocument.pageCount} / ${selectedDocument.pageCount}` : "— / —"}
                </span>
                <button type="button" className="btn wizard-document-fit" aria-pressed="true">
                  {t("Fit width")}
                </button>
                {preview?.id === selectedDocument.id ? (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setPreviewOpen(true)}
                    aria-label={t("Open full-screen PDF preview")}
                    title={t("Open full-screen PDF preview")}
                  >
                    <FullscreenIcon />
                  </button>
                ) : null}
              </div>
            </div>
            {previewError?.id === selectedDocument.id ? (
              <p role="alert" className="pdf-preview__status pdf-preview__status--error">
                {t("Failed to load PDF preview")}: {previewError.message}
              </p>
            ) : preview?.id !== selectedDocument.id ? (
              <p role="status" className="pdf-preview__status">
                {t("Loading PDF preview…")}
              </p>
            ) : (
              <PdfPreview blob={preview.blob} scale={1.15} onPageCount={(count) => void updatePageCount(selectedDocument.id, count)} />
            )}
          </div>
          {previewOpen && preview?.id === selectedDocument.id ? (
            <PdfPreviewModal blob={preview.blob} documentName={selectedDocument.name} onClose={() => setPreviewOpen(false)} />
          ) : null}
        </>
      )}
    </div>
  );
}

function PdfPreviewModal({ blob, documentName, onClose }: { blob: Blob; documentName: string; onClose: () => void }) {
  const { t } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="pdf-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="pdf-preview-modal__content">
        <div className="pdf-preview-modal__heading">
          <div>
            <h2 id="pdf-preview-modal-title">{t("PDF preview")}</h2>
            <p>{documentName}</p>
          </div>
          <button ref={closeButtonRef} type="button" className="btn pdf-preview-modal__close" onClick={onClose} aria-label={t("Close full-screen PDF preview")}>
            {t("Close")} <CloseIcon />
          </button>
        </div>
        <div className="pdf-preview-modal__body">
          <PdfPreview blob={blob} scale={1.5} />
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="ui-icon ui-icon--document" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg aria-hidden="true" className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" />
    </svg>
  );
}

function TemplateStep({
  profiles,
  profileId,
  onSelect,
  prompt,
  onPromptChange,
  jsonSchema,
  schemaText,
  schemaErrors,
  onSchemaChange,
  onSchemaReset,
}: {
  profiles: {
    id: string;
    name: string;
    version: number;
    description?: string;
    basePrompt: string;
    jsonSchema: unknown;
  }[];
  profileId: string;
  onSelect: (id: string) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  jsonSchema: unknown;
  schemaText: string;
  schemaErrors: string[];
  onSchemaChange: (schema: string) => void;
  onSchemaReset: () => void;
}) {
  const { t } = useI18n();
  const visualSchema = describeVisualSchema(jsonSchema);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const canEditVisually = schemaErrors.length === 0 && visualSchema.supported;

  const applyVisualChange = (action: VisualSchemaAction) => {
    if (!canEditVisually) return;
    onSchemaChange(JSON.stringify(updateVisualSchema(jsonSchema, action), null, 2));
  };

  const formatSchema = () => {
    if (schemaErrors.length === 0) onSchemaChange(JSON.stringify(jsonSchema, null, 2));
  };

  return (
    <div>
      <h2>{t("What should the AI extract?")}</h2>
      <p className="doc-card__meta">{t("An extraction template defines which fields the AI should return.")}</p>
      {profiles.length === 0 ? (
        <p className="empty-state">
          {t("No extraction templates yet.")} <a href="#/library">{t("Create one in Library")}</a>, {t("then come back.")}
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
      {profileId ? (
        <>
          <label className="field wizard-prompt-editor">
            <span>{t("Extraction prompt")}</span>
            <textarea
              rows={10}
              value={prompt}
              aria-describedby="wizard-prompt-help"
              onChange={(e) => onPromptChange(e.target.value)}
            />
            <small id="wizard-prompt-help">
              {t("Edit this prompt for this benchmark.")}
            </small>
          </label>

          <section className="wizard-field-map" aria-labelledby="wizard-field-map-title">
            <div className="wizard-field-map__heading">
              <div>
                <h3 id="wizard-field-map-title">{t("Requested output fields")}</h3>
                <p>{t("Define what the AI should return.")}</p>
              </div>
              <span className="chip chip--session">{t("Benchmark only")}</span>
            </div>
            {schemaErrors.length > 0 ? (
              <p className="schema-bad wizard-schema-warning" role="alert">
                {t("Visual Builder is paused until Advanced JSON Schema is valid.")}
              </p>
            ) : null}
            {!visualSchema.supported && schemaErrors.length === 0 ? (
              <p className="schema-bad wizard-schema-warning" role="alert">
                {t("This schema contains structures the Visual Builder cannot safely edit. Use Advanced JSON Schema to preserve all fields and keywords.")}
              </p>
            ) : null}
            {canEditVisually ? (
              <div className="wizard-visual-builder">
                {visualSchema.sections.map((section, index) => (
                  <VisualSectionEditor key={index} section={section} onAction={applyVisualChange} />
                ))}
                <button type="button" className="btn wizard-add-section" onClick={() => applyVisualChange({ type: "addSection" })}>
                  + {t("Add section")}
                </button>
              </div>
            ) : null}
            <details
              className="wizard-schema-details"
              open={advancedOpen}
              onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
            >
              <summary>
                <span>{t("Advanced JSON Schema")}</span>
                {schemaErrors.length === 0 ? (
                  <span className="schema-status schema-status--ok">✓ {t("Valid JSON Schema")}</span>
                ) : (
                  <span className="schema-status schema-status--bad">{t("Schema has")} {schemaErrors.length} {schemaErrors.length === 1 ? t("error") : t("errors")}</span>
                )}
              </summary>
              <textarea
                className="mono-input wizard-schema-editor"
                rows={14}
                value={schemaText}
                aria-label={t("JSON schema for this benchmark")}
                aria-describedby="wizard-schema-help"
                onChange={(e) => onSchemaChange(e.target.value)}
              />
              <div className="wizard-schema-actions">
                <button type="button" className="btn" onClick={formatSchema} disabled={schemaErrors.length > 0}>
                  {t("Format JSON")}
                </button>
                <button type="button" className="btn" onClick={onSchemaReset}>
                  {t("Reset")}
                </button>
              </div>
              {schemaErrors.length > 0 ? (
                <div id="wizard-schema-help" role="alert" className="schema-bad wizard-schema-errors">
                  {schemaErrors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : (
                <small id="wizard-schema-help">{t("Advanced mode is an escape hatch for schema features not exposed in the Visual Builder.")}</small>
              )}
            </details>
            <small className="wizard-benchmark-only-help">{t("Changes here don't modify the saved Library template.")}</small>
          </section>
        </>
      ) : null}
      <p className="doc-card__meta">
        {t("Manage or duplicate templates in")} <a href="#/library">{t("Library")}</a>.
      </p>
    </div>
  );
}

function VisualSectionEditor({
  section,
  onAction,
}: {
  section: import("../profiles/visualSchema").VisualSection;
  onAction: (action: VisualSchemaAction) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="visual-section" aria-labelledby={`visual-section-${section.name}`}>
      <div className="visual-section__heading">
        <div>
          <h4 id={`visual-section-${section.name}`}>{section.label}</h4>
          <code>{section.name}{section.repeating ? "[]" : ""}</code>
        </div>
        {section.repeating ? <span className="wizard-field-group__badge">{t("Repeating rows")}</span> : null}
      </div>
      <div className="visual-section__controls">
        <label className="visual-section__name">
          <span>{t("Section key")}</span>
          <input
            type="text"
            value={section.name}
            aria-label={`${t("Section key for")} ${section.label}`}
            onChange={(event) => onAction({ type: "renameSection", section: section.name, name: event.target.value })}
          />
        </label>
        <label className="checkbox visual-section__repeat">
          <input
            type="checkbox"
            checked={section.repeating}
            aria-label={`${t("Repeating rows for")} ${section.label}`}
            onChange={(event) => onAction({ type: "setSectionRepeating", section: section.name, repeating: event.target.checked })}
          />
          {t("Repeating rows")}
        </label>
        <button type="button" className="icon-btn" aria-label={`${t("Delete section")} ${section.label}`} title={t("Delete section")} onClick={() => onAction({ type: "deleteSection", section: section.name })}>
          ⋮
        </button>
      </div>
      <div className="visual-field-list">
        {section.fields.map((field, index) => (
          <div className="visual-field-row" key={index}>
            <input
              type="text"
              value={field.name}
              aria-label={`${t("Field name")} ${section.name}.${field.name}`}
              onChange={(event) => onAction({ type: "renameField", section: section.name, field: field.name, name: event.target.value })}
            />
            <select
              value={field.type}
              aria-label={`${t("Field type")} ${section.name}.${field.name}`}
              onChange={(event) => onAction({ type: "setFieldType", section: section.name, field: field.name, value: event.target.value as VisualFieldType })}
            >
              <option value="text">{t("Text")}</option>
              <option value="number">{t("Number")}</option>
              <option value="date">{t("Date")}</option>
              <option value="boolean">{t("Boolean")}</option>
            </select>
            <select
              value={field.required ? "required" : "optional"}
              aria-label={`${t("Required status")} ${section.name}.${field.name}`}
              onChange={(event) => onAction({ type: "setFieldRequired", section: section.name, field: field.name, required: event.target.value === "required" })}
            >
              <option value="required">{t("Required")}</option>
              <option value="optional">{t("Optional")}</option>
            </select>
            <button type="button" className="icon-btn" aria-label={`${t("Delete field")} ${section.name}.${field.name}`} title={t("Delete field")} onClick={() => onAction({ type: "deleteField", section: section.name, field: field.name })}>
              ⋮
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn--text wizard-add-field" onClick={() => onAction({ type: "addField", section: section.name })}>
        + {t("Add field")}
      </button>
    </section>
  );
}

function parseSchemaDraft(draft: string | undefined, fallback: unknown): { value: unknown; errors: string[] } {
  if (draft === undefined) {
    const validation = validateJsonSchema(fallback);
    return { value: fallback, errors: validation.valid ? [] : validation.errors };
  }
  try {
    const value = JSON.parse(draft) as unknown;
    const validation = validateJsonSchema(value);
    return { value, errors: validation.valid ? [] : validation.errors };
  } catch (e) {
    return { value: fallback, errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`] };
  }
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
  const { t } = useI18n();
  return (
    <div>
      <h2>{t("Expected Result")}</h2>
      <p className="doc-card__meta">
        {t("Also known as Ground Truth / Golden Answer. Enter the correct result so the benchmark can measure extraction accuracy. Optional, but strongly recommended.")}
      </p>
      <p className="doc-card__meta">
        {t("For")} <strong>{documentName ?? t("the selected document")}</strong> {t("with")} <strong>{templateName ?? t("the selected template")}</strong>:
      </p>
      {goldens.length === 0 ? (
        <p className="empty-state">
          {t("No expected result for this document + template yet.")} <a href="#/library">{t("Add one in Library")}</a>, {t("or skip — you can still run without accuracy scoring.")}
        </p>
      ) : (
        <ul className="doc-list">
          <li className="doc-card">
            <label className="doc-card__main">
              <input type="radio" name="wizard-golden" checked={goldenId === ""} onChange={() => onSelect("")} />
              <span className="doc-card__name">{t("None — skip accuracy scoring")}</span>
            </label>
          </li>
          {goldens.map((g) => (
            <li key={g.id} className="doc-card">
              <label className="doc-card__main">
                <input type="radio" name="wizard-golden" checked={goldenId === g.id} onChange={() => onSelect(g.id)} />
                <span className="doc-card__name">{t("Expected result")} v{g.version}</span>
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
  const { t } = useI18n();
  return (
    <div>
      <h2>{t("Choose AI")}</h2>
      {configs.length === 0 ? (
        <p className="empty-state">
          {t("No AI providers connected yet.")} <a href="#/settings">{t("Connect one in Settings")}</a>, {t("then come back.")}
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
          {t("Incompatible configuration")}: {modeSupport.reason}
        </p>
      ) : null}
      <p className="doc-card__meta">
        {t("Manage connections in")} <a href="#/settings">{t("Settings")}</a>.
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
  const { t } = useI18n();
  return (
    <div>
      <h2>{t("Run Settings")}</h2>
      <fieldset className="mode-picker">
        <legend>{t("Test type")}</legend>
        <label>
          <input type="radio" name="wizard-runtype" checked={runType === "quick"} onChange={() => onRunType("quick")} />
          {t("Quick Test — run once to verify the setup.")}
        </label>
        <label>
          <input type="radio" name="wizard-runtype" checked={runType === "benchmark"} onChange={() => onRunType("benchmark")} />
          {t("Benchmark — repeat the same configuration to measure accuracy and consistency.")}
        </label>
      </fieldset>

      <fieldset className="mode-picker">
        <legend>{t("Input mode")}</legend>
        <label>
          <input type="radio" name="wizard-mode" checked={mode === "native_pdf"} onChange={() => onMode("native_pdf")} />
          {t("Send original PDF — best when the provider supports PDF input directly.")}
        </label>
        <label>
          <input type="radio" name="wizard-mode" checked={mode === "canonical_images"} onChange={() => onMode("canonical_images")} />
          {t("Render pages as images — recommended for fair cross-provider comparisons.")}
        </label>
      </fieldset>

      <details open={advancedOpen} onToggle={(e) => onAdvancedOpen(e.currentTarget.open)}>
        <summary>{t("Advanced settings")}</summary>
        <label className="field">
          <span>{t("Temperature (optional)")}</span>
          <input type="number" step="0.1" value={temperature} onChange={(e) => onTemperature(e.target.value)} />
        </label>
        <label className="field">
          <span>{t("Reasoning effort (optional, Gemini)")}</span>
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
  const { t } = useI18n();
  const blocked = modeSupport ? !modeSupport.supported : false;
  return (
    <div>
      <h2>{t("Ready to benchmark")}</h2>
      <table className="summary-table">
        <tbody>
          <tr>
            <th>{t("Document")}</th>
            <td>{documentName ?? "—"}</td>
          </tr>
          <tr>
            <th>{t("Extraction template")}</th>
            <td>{templateName ?? "—"}</td>
          </tr>
          <tr>
            <th>{t("Expected result")}</th>
            <td>{goldenVersion !== undefined ? `v${goldenVersion}` : t("none — accuracy scoring skipped")}</td>
          </tr>
          <tr>
            <th>{t("AI provider")}</th>
            <td>{providerName ?? "—"}</td>
          </tr>
          <tr>
            <th>{t("Input")}</th>
            <td>{mode === "native_pdf" ? t("Send original PDF") : t("Render pages as images")}</td>
          </tr>
          <tr>
            <th>{t("Estimated cost")}</th>
            <td>{t("Unknown until the first run completes — set a budget cap below to limit spend.")}</td>
          </tr>
        </tbody>
      </table>

      {blocked ? (
        <p role="status" className="schema-bad">
          {t("Incompatible configuration")}: {modeSupport?.reason}
        </p>
      ) : null}

      {runType === "quick" ? (
        <>
          {running ? (
            <p role="status" className="schema-ok">
              {t("Running…")}
            </p>
          ) : failure ? (
            <p role="alert" className="status-error">
              ✗ {t("Quick Test failed")}: {failure}
            </p>
          ) : result ? (
            <p role="status" className={result.run.state === "succeeded" ? "schema-ok" : "schema-bad"}>
              {result.run.state === "succeeded" ? `✓ ${t("Quick Test completed")}` : t("Quick Test finished with issues")}
            </p>
          ) : null}
          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={onRunQuick} disabled={running || blocked}>
              {running ? t("Running…") : result || failure ? t("Run again") : t("Run Quick Test")}
            </button>
          </div>
          {result ? (
            <>
              <RunResultPanel result={result} />
              <p className="doc-card__meta">
                <a href="#/runs">{t("View this run in Runs & Results")}</a>
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
  const { t } = useI18n();
  const run = result.run;
  const usage = run.usage as UsageLike | undefined;
  const costText = run.costUsd !== undefined ? "$" + run.costUsd.toFixed(6) : "unknown";
  const accuracyText = run.leafAccuracy === undefined ? "—" : `${(run.leafAccuracy * 100).toFixed(1)}%`;
  const hasAccuracy = run.leafAccuracy !== undefined || run.exactMatch !== undefined;
  return (
    <div className="profile-form" role="region" aria-label={t("Run result")}>
      <h2>
        {t("Run result")}{" "}
        <span className={"chip " + (run.state === "succeeded" ? "chip--ok" : "chip--bad")}>{run.state}</span>
      </h2>
      <p className="doc-card__meta">
        {t("latency")} {run.latencyMs ?? "—"} ms · {t("cost")} {costText} · {t("output hash")} {run.outputHash?.slice(0, 12)}… · {t("provider calls")} {run.providerCalls}
      </p>
      {usage ? (
        <p className="doc-card__meta">
          {t("usage")}: {t("input")} {usage.inputTokens ?? "?"} · {t("output")} {usage.outputTokens ?? "?"} · {t("total")}{" "}
          {usage.totalTokens ?? "?"}
        </p>
      ) : null}
      <section className="run-result-accuracy" aria-label={t("Accuracy")}>
        <div>
          <span>{t("Field accuracy")}</span>
          <strong>{hasAccuracy ? accuracyText : t("Not scored")}</strong>
        </div>
        <div>
          <span>{t("Exact match")}</span>
          <strong>{run.exactMatch === undefined ? "—" : run.exactMatch ? `✓ ${t("Pass")}` : `× ${t("No match")}`}</strong>
        </div>
        <div>
          <span>{t("Schema valid")}</span>
          <strong>{run.schemaValid === undefined ? "—" : run.schemaValid ? `✓ ${t("Valid")}` : `× ${t("Invalid")}`}</strong>
        </div>
      </section>
      <details>
        <summary>{t("Raw provider response")}</summary>
        <pre className="raw-pre">{run.safeRawResponse ?? `(${t("none")})`}</pre>
      </details>
      <details open>
        <summary>{t("Parsed JSON")}</summary>
        <pre className="raw-pre">{JSON.stringify(run.parsedJson, null, 2)}</pre>
      </details>
    </div>
  );
}
