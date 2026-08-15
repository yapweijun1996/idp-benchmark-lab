import { useState } from "react";
import { adapterFor } from "../providers/registry";
import { useProviderConfigs } from "../providers/useProviderConfigs";
import { clearApiKey, getApiKey, isKeyRememberedForTab, setApiKey } from "../providers/keys";
import type { ConnectionResult, ProviderContext } from "../providers/types";
import type { ProviderConfig, ProviderKind } from "../storage/types";

interface CardForm {
  model: string;
  baseUrl: string;
  customHeaders: string;
}

const DEFAULTS: Record<ProviderKind, CardForm> = {
  openai: { model: "gpt-4o-mini", baseUrl: "", customHeaders: "" },
  gemini: { model: "gemini-3-flash-lite", baseUrl: "", customHeaders: "" },
  openai_compatible: { model: "local-model", baseUrl: "", customHeaders: "" },
};

export function ProvidersPage() {
  const providers = useProviderConfigs();
  const [testResults, setTestResults] = useState<Record<string, ConnectionResult | undefined>>({});

  return (
    <section aria-labelledby="providers-title">
      <h1 id="providers-title">Providers</h1>
      <p className="warning-banner">
        This static PWA sends requests directly from your browser to the selected provider. Your BYOK API key is
        available to your browser runtime. Use a limited/test key where possible and do not use a high-privilege
        production key for this demo.
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
  const [form, setForm] = useState<CardForm>(() =>
    existing
      ? {
          model: existing.model,
          baseUrl: existing.baseUrl ?? DEFAULTS[kind].baseUrl,
          customHeaders: existing.settings.customHeaders ? JSON.stringify(existing.settings.customHeaders) : "",
        }
      : DEFAULTS[kind],
  );
  const [apiKey, setApiKeyState] = useState<string>(() => getApiKey(existing?.id ?? "") ?? "");
  const [remember, setRemember] = useState<boolean>(() => isKeyRememberedForTab(existing?.id ?? ""));
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    let customHeaders: Record<string, string> = {};
    if (form.customHeaders.trim()) {
      try {
        customHeaders = JSON.parse(form.customHeaders) as Record<string, string>;
      } catch (e) {
        setMessage(`Custom headers JSON invalid: ${e instanceof Error ? e.message : String(e)}`);
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
        settings: { customHeaders },
      });
      if (apiKey.trim()) {
        setApiKey(saved.id, apiKey.trim(), { rememberForTab: remember });
      } else {
        clearApiKey(saved.id);
      }
      setMessage("Saved. The API key stays in this browser tab only" + (remember ? " (session storage)" : " (memory)") + ".");
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
        setMessage("Enter an API key first.");
        return;
      }
      if (!form.model.trim()) {
        setMessage("Enter a model id first.");
        return;
      }
      const config: ProviderConfig = {
        id: existing?.id ?? "unsaved",
        kind,
        name: kind,
        model: form.model.trim(),
        baseUrl: kind === "openai_compatible" ? form.baseUrl.trim() || undefined : undefined,
        settings: {},
      };
      const ctx: ProviderContext = { config, apiKey: key };
      const result = await adapterFor(kind).testConnection(ctx);
      onTestResult(result);
      setMessage(result.ok ? result.message : result.message);
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

  return (
    <article className="profile-form provider-card">
      <h2>{kind === "openai" ? "OpenAI" : kind === "gemini" ? "Gemini" : "Custom OpenAI-compatible"}</h2>

      <label className="field">
        <span>Model</span>
        <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
      </label>

      {kind === "openai_compatible" ? (
        <label className="field">
          <span>Base URL</span>
          <input
            type="text"
            placeholder="https://api.example.com/v1"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
        </label>
      ) : null}

      <label className="field">
        <span>API key (memory-only by default)</span>
        <span className="key-row">
          <input
            type={reveal ? "text" : "password"}
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
          />
          <button type="button" className="btn" onClick={() => setReveal((v) => !v)}>
            {reveal ? "Hide" : "Reveal"}
          </button>
        </span>
        <label className="checkbox">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember for this tab (sessionStorage opt-in)
        </label>
      </label>

      {kind === "openai_compatible" ? (
        <label className="field">
          <span>Custom headers (JSON, optional)</span>
          <textarea
            rows={3}
            className="mono-input"
            value={form.customHeaders}
            onChange={(e) => setForm({ ...form, customHeaders: e.target.value })}
          />
        </label>
      ) : null}

      <p className="doc-card__meta">
        Capabilities: {caps.nativePdf ? "native PDF" : "images only"} · structured output{" "}
        {caps.structuredOutput ? "yes" : "no"} · usage {caps.tokenUsage ? "yes" : "no"}
      </p>

      <div className="toolbar">
        <button type="button" className="btn btn--primary" onClick={() => void save()}>
          Save config
        </button>
        <button type="button" className="btn" onClick={() => void test()} disabled={busy}>
          {busy ? "Testing…" : "Test connection"}
        </button>
        {existing ? (
          <button type="button" className="btn--danger" onClick={() => void onRemove(existing.id)}>
            Remove
          </button>
        ) : null}
      </div>

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
