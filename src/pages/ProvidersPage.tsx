import { useState } from "react";
import { adapterFor } from "../providers/registry";
import { useProviderConfigs } from "../providers/useProviderConfigs";
import { clearApiKey, getApiKey, isKeyRememberedForTab, setApiKey } from "../providers/keys";
import type { ConnectionResult, ProviderContext } from "../providers/types";
import type { ProviderConfig, ProviderKind } from "../storage/types";
import { useI18n } from "../i18n";

interface CardForm {
  model: string;
  baseUrl: string;
  customHeaders: string;
  apiStyle: "chat_completions" | "responses";
  reasoningEffort: string;
  thinkingLevel: string;
}

const DEFAULTS: Record<ProviderKind, CardForm> = {
  openai: { model: "gpt-5.4-mini", baseUrl: "", customHeaders: "", apiStyle: "chat_completions", reasoningEffort: "", thinkingLevel: "" },
  gemini: { model: "gemini-3.5-flash-lite", baseUrl: "", customHeaders: "", apiStyle: "chat_completions", reasoningEffort: "", thinkingLevel: "" },
  openai_compatible: { model: "local-model", baseUrl: "", customHeaders: "", apiStyle: "chat_completions", reasoningEffort: "", thinkingLevel: "" },
};

const REASONING_EFFORT_OPTIONS = ["none", "low", "medium", "high", "xhigh", "max"] as const;
const THINKING_LEVEL_OPTIONS = ["minimal", "low", "medium", "high"] as const;

const MODEL_OPTIONS: Record<ProviderKind, readonly string[]> = {
  openai: ["gpt-5.6", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.4-mini", "gpt-4o-mini", "gpt-4o"],
  gemini: [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3-flash-lite",
    "gemini-3-pro",
  ],
  openai_compatible: ["local-model"],
};

export function ProvidersPage() {
  const { t } = useI18n();
  const providers = useProviderConfigs();
  const [testResults, setTestResults] = useState<Record<string, ConnectionResult | undefined>>({});

  return (
    <section aria-labelledby="providers-title">
      <h2 id="providers-title">{t("AI Providers")}</h2>
      <p className="warning-banner">
        {t("This static PWA sends requests directly from your browser to the selected provider. Your BYOK API key is available to your browser runtime. Use a limited/test key where possible and do not use a high-privilege production key for this demo.")}
      </p>

      {providers.error ? (
        <p role="alert" className="status-error">
          {providers.error}
        </p>
      ) : null}

      <div className="provider-grid">
        {(["openai", "gemini", "openai_compatible"] as const).map((kind) => (
          <ProviderCard
            key={kind}
            kind={kind}
            existing={providers.configs.find((c) => c.kind === kind)}
            onSave={(input) => providers.save(input)}
            onRemove={(id) => providers.remove(id)}
            testResult={testResults[kind]}
            onTestResult={(r) => setTestResults((prev) => ({ ...prev, [kind]: r }))}
          />
        ))}
      </div>
    </section>
  );
}

interface ProviderCardProps {
  kind: ProviderKind;
  existing: ProviderConfig | undefined;
  onSave: (input: Omit<ProviderConfig, "id"> & { id?: string }) => Promise<ProviderConfig>;
  onRemove: (id: string) => Promise<void>;
  testResult: ConnectionResult | undefined;
  onTestResult: (r: ConnectionResult) => void;
}

function ProviderCard({ kind, existing, onSave, onRemove, testResult, onTestResult }: ProviderCardProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<CardForm>(() =>
    existing
      ? {
          model: existing.model,
          baseUrl: existing.baseUrl ?? DEFAULTS[kind].baseUrl,
          customHeaders: existing.settings.customHeaders ? JSON.stringify(existing.settings.customHeaders) : "",
          apiStyle: existing.settings.apiStyle === "responses" ? "responses" : "chat_completions",
          reasoningEffort: typeof existing.settings.reasoningEffort === "string" ? existing.settings.reasoningEffort : "",
          thinkingLevel: typeof existing.settings.thinkingLevel === "string" ? existing.settings.thinkingLevel : "",
        }
      : DEFAULTS[kind],
  );
  const [apiKey, setApiKeyState] = useState<string>(() => getApiKey(existing?.id ?? "") ?? "");
  const [remember, setRemember] = useState<boolean>(() => isKeyRememberedForTab(existing?.id ?? ""));
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const buildSettings = (customHeaders: Record<string, string>): Record<string, unknown> => {
    const settings: Record<string, unknown> = { ...existing?.settings, customHeaders };
    if (kind === "openai") {
      if (form.reasoningEffort) settings.reasoningEffort = form.reasoningEffort;
      else delete settings.reasoningEffort;
      delete settings.thinkingLevel;
    } else if (kind === "gemini") {
      if (form.thinkingLevel) settings.thinkingLevel = form.thinkingLevel;
      else delete settings.thinkingLevel;
      delete settings.reasoningEffort;
    } else {
      settings.apiStyle = form.apiStyle;
    }
    return settings;
  };
  const save = async () => {
    let customHeaders: Record<string, string> = {};
    if (form.customHeaders.trim()) {
      try {
        customHeaders = JSON.parse(form.customHeaders) as Record<string, string>;
      } catch (e) {
        setMessage(`${t("Custom headers JSON invalid")}: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
    }
    try {
      const saved = await onSave({
        id: existing?.id,
        kind,
        name: kind === "openai" ? "OpenAI" : kind === "gemini" ? "Gemini" : "Custom OpenAI-compatible",
        baseUrl: kind === "openai_compatible" ? form.baseUrl.trim() || undefined : undefined,
        model: form.model.trim(),
        settings: buildSettings(customHeaders),
      });
      if (apiKey.trim()) {
        setApiKey(saved.id, apiKey.trim(), { rememberForTab: remember });
      } else {
        clearApiKey(saved.id);
      }
      setMessage(`${t("Saved. The API key stays in this browser tab only")}${remember ? ` (${t("kept until this tab closes")})` : ` (${t("memory only")})`}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const test = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const key = apiKey.trim() || getApiKey(existing?.id ?? "");
      if (!key) {
        setMessage(t("Enter an API key first."));
        return;
      }
      if (!form.model.trim()) {
        setMessage(t("Enter a model id first."));
        return;
      }
      const config: ProviderConfig = {
        id: existing?.id ?? "unsaved",
        kind,
        name: kind,
        model: form.model.trim(),
        baseUrl: kind === "openai_compatible" ? form.baseUrl.trim() || undefined : undefined,
        settings: buildSettings({}),
      };
      const ctx: ProviderContext = { config, apiKey: key ?? "" };
      const result = await adapterFor(kind).testConnection(ctx);
      onTestResult(result);
      setMessage(result.message);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setMessage(message);
    } finally {
      setBusy(false);
    }
  };

  const caps = adapterFor(kind).capabilities(existing ?? {
    id: "preview",
    kind,
    name: kind,
    model: form.model || DEFAULTS[kind].model,
    settings: {},
  });
  const providerLabel = kind === "openai"
    ? "OpenAI"
    : kind === "gemini"
      ? "Gemini"
      : t("Custom OpenAI-compatible");
  const removeProvider = () => {
    if (!existing) return;
    if (window.confirm(`${t("Remove the")} ${providerLabel} ${t("provider configuration from this browser?")}`)) {
      void onRemove(existing.id);
    }
  };

  return (
    <article className="profile-form provider-card">
      <h3>{providerLabel}</h3>

      <label className="field">
        <span>{t("Model")}</span>
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="false"
          aria-controls={`provider-model-options-${kind}`}
          list={`provider-model-options-${kind}`}
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
        />
        <datalist id={`provider-model-options-${kind}`}>
          {MODEL_OPTIONS[kind].map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </label>

      {kind === "openai" ? (
        <label className="field">
          <span>{t("Reasoning effort")}</span>
          <select value={form.reasoningEffort} onChange={(e) => setForm({ ...form, reasoningEffort: e.target.value })}>
            <option value="">{t("Provider default")}</option>
            {REASONING_EFFORT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ) : null}

      {kind === "gemini" ? (
        <label className="field">
          <span>{t("Thinking level")}</span>
          <select value={form.thinkingLevel} onChange={(e) => setForm({ ...form, thinkingLevel: e.target.value })}>
            <option value="">{t("Provider default")}</option>
            {THINKING_LEVEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ) : null}

      {kind === "openai_compatible" ? (
        <label className="field">
          <span>{t("Base URL")}</span>
          <input
            type="text"
            placeholder="https://api.example.com/v1"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
        </label>
      ) : null}

      {kind === "openai_compatible" ? (
        <>
          <label className="field">
          <span>{t("API format")}</span>
            <select value={form.apiStyle} onChange={(e) => setForm({ ...form, apiStyle: e.target.value as CardForm["apiStyle"] })}>
              <option value="responses">{t("OpenAI Responses API")}</option>
              <option value="chat_completions">{t("Chat Completions API")}</option>
            </select>
          </label>
          <p className="doc-card__meta provider-preset-help">
            {t("Configure an OpenAI-compatible endpoint; the API key remains runtime-only and is never saved in app data.")}
          </p>
        </>
      ) : null}

      <label className="field">
        <span>{t("API key (memory-only by default)")}</span>
        <span className="key-row">
          <input
            type={reveal ? "text" : "password"}
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
          />
          <button type="button" className="btn" onClick={() => setReveal((v) => !v)}>
            {reveal ? t("Hide") : t("Reveal")}
          </button>
        </span>
        <label className="checkbox">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          {t("Keep until this tab closes")}
        </label>
      </label>

      {kind === "openai_compatible" ? (
        <label className="field">
          <span>{t("Custom headers (JSON, optional)")}</span>
          <textarea
            rows={3}
            className="mono-input"
            value={form.customHeaders}
            onChange={(e) => setForm({ ...form, customHeaders: e.target.value })}
          />
        </label>
      ) : null}

      <p className="doc-card__meta">
        {t("Capabilities")}: {caps.nativePdf ? t("native PDF") : t("images only")} · {t("structured output")} {caps.structuredOutput ? t("yes") : t("no")} · {t("usage")} {caps.tokenUsage ? t("yes") : t("no")}
      </p>
      {!caps.nativePdf ? (
        <p className="schema-bad">{t("This adapter doesn't support native PDF input — for benchmarks, choose Render pages as images instead.")}</p>
      ) : null}

      <div className="toolbar">
        <button type="button" className="btn btn--primary" onClick={() => void save()}>
          {t("Save config")}
        </button>
        <button type="button" className="btn" onClick={() => void test()} disabled={busy}>
          {busy ? t("Testing…") : t("Test connection")}
        </button>
      </div>

      {existing ? (
        <div className="provider-card__danger-zone">
          <div>
            <strong>{t("Remove provider configuration")}</strong>
            <span>{t("Clears this provider from the current browser.")}</span>
          </div>
          <button type="button" className="btn btn--danger" onClick={removeProvider} aria-label={`Remove ${providerLabel} provider`}>
            <span aria-hidden="true">×</span>
            {t("Remove")}
          </button>
        </div>
      ) : null}

      {testResult ? (
        <p className={testResult.ok ? "schema-ok" : "schema-bad"} role="status">
          {testResult.ok ? "✓ " : "✗ "}
          {testResult.message}
        </p>
      ) : null}
      {message ? <p className="status-error">{message}</p> : null}
    </article>
  );
}
