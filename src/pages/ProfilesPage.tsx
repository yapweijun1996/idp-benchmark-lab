import { useMemo, useState } from "react";
import { useProfiles } from "../profiles/useProfiles";
import { validateJsonSchema } from "../profiles/schema";
import type { ExtractionProfile } from "../storage/types";
import { useI18n } from "../i18n";

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…`;
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

interface FormState {
  name: string;
  description: string;
  basePrompt: string;
  contractText: string;
  schemaText: string;
  trimWhitespace: boolean;
  normalizeLineEndings: boolean;
}

function formFromProfile(p: ExtractionProfile): FormState {
  return {
    name: p.name,
    description: p.description ?? "",
    basePrompt: p.basePrompt,
    contractText: JSON.stringify(p.extractionContract, null, 2),
    schemaText: JSON.stringify(p.jsonSchema, null, 2),
    trimWhitespace: p.normalizationPolicy?.trimOuterWhitespace ?? false,
    normalizeLineEndings: p.normalizationPolicy?.normalizeLineEndings ?? false,
  };
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  basePrompt: "",
  contractText: "",
  schemaText: "",
  trimWhitespace: false,
  normalizeLineEndings: false,
};

export function ProfilesPage() {
  const { t } = useI18n();
  const profiles = useProfiles();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const schemaCheck = useMemo(() => {
    const parsed = parseJson(form.schemaText);
    if (!parsed.ok) {
      return { valid: false as const, errors: [parsed.error] };
    }
    return validateJsonSchema(parsed.value);
  }, [form.schemaText]);

  const startCreate = () => {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setFormError(null);
    setSavedMessage(null);
  };

  const startEdit = (profile: ExtractionProfile) => {
    setEditingId(profile.id);
    setForm(formFromProfile(profile));
    setFormError(null);
    setSavedMessage(null);
  };

  const cancel = () => {
    setEditingId(null);
    setFormError(null);
  };

  const save = async () => {
    const contract = parseJson(form.contractText || "{}");
    if (!contract.ok) {
      setFormError(`${t("Extraction contract JSON")}: ${contract.error}`);
      return;
    }
    const schema = parseJson(form.schemaText);
    if (!schema.ok) {
      setFormError(`${t("JSON schema")}: ${schema.error}`);
      return;
    }
    const check = validateJsonSchema(schema.value);
    if (!check.valid) {
      setFormError(`${t("JSON schema invalid")}: ${check.errors.join("; ")}`);
      return;
    }
    const input = {
      name: form.name,
      description: form.description || undefined,
      basePrompt: form.basePrompt,
      extractionContract: contract.value,
      jsonSchema: schema.value,
      normalizationPolicy: {
        trimOuterWhitespace: form.trimWhitespace,
        normalizeLineEndings: form.normalizeLineEndings,
      },
    };
    try {
      const saved = editingId === "new" ? await profiles.create(input) : editingId ? await profiles.update(editingId, input) : null;
      setEditingId(null);
      setFormError(null);
      setSavedMessage(saved ? `✓ ${t("Extraction Template saved as version")} ${saved.version}` : null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  const editing = editingId === "new" ? null : profiles.profiles.find((p) => p.id === editingId);

  return (
    <section aria-labelledby="profiles-title">
      <h2 id="profiles-title">{t("Extraction Templates")}</h2>
      <p>{t("Modular templates: base prompt + extraction contract + JSON schema + normalization policy. Each save creates a new version.")}</p>

      {profiles.error ? (
        <p role="alert" className="status-error">
          {profiles.error}
        </p>
      ) : null}

      {editingId === null && savedMessage ? (
        <p role="status" className="schema-ok">
          {savedMessage}
        </p>
      ) : null}

      {editingId === null ? (
        <>
          <button type="button" className="btn btn--primary" onClick={startCreate}>
            {t("New template")}
          </button>
          {profiles.profiles.length === 0 ? (
            <p className="empty-state">
              {t("No extraction templates yet. A template tells the AI what information to extract from a document — create one to use it in a benchmark.")}
            </p>
          ) : (
            <ul className="doc-list">
              {profiles.profiles.map((p) => (
                <li key={p.id} className="doc-card">
                  <button type="button" className="doc-card__main" onClick={() => startEdit(p)}>
                    <span className="doc-card__name">
                    {p.name} <span className="chip chip--todo">v{p.version}</span>
                    </span>
                    <span className="doc-card__meta">
                    {t("prompt")} {shortHash(p.promptSha256)} · {t("schema")} {shortHash(p.schemaSha256)}
                    </span>
                  </button>
                  <button type="button" onClick={() => startEdit(p)}>
                    {t("Edit")}
                  </button>
                  <button type="button" className="btn--danger" onClick={() => void profiles.remove(p.id)}>
                    {t("Delete")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="profile-form">
          <h3>{editing ? `${t("Edit")} ${editing.name}` : t("New template")}</h3>
          {editing ? (
            <p className="doc-card__meta">
              {t("Saving creates version")} {editing.version + 1} {t("of this template.")}
            </p>
          ) : null}

          <label className="field">
            <span>{t("Name")}</span>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label className="field">
            <span>{t("Description (optional)")}</span>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <label className="field">
            <span>{t("Base prompt")}</span>
            <textarea
              rows={6}
              value={form.basePrompt}
              onChange={(e) => setForm({ ...form, basePrompt: e.target.value })}
            />
          </label>

          <label className="field">
            <span>{t("Extraction contract (JSON)")}</span>
            <textarea
              rows={6}
              className="mono-input"
              value={form.contractText}
              onChange={(e) => setForm({ ...form, contractText: e.target.value })}
            />
          </label>

          <label className="field">
            <span>{t("JSON schema (draft-07)")}</span>
            <textarea
              rows={10}
              className="mono-input"
              value={form.schemaText}
              onChange={(e) => setForm({ ...form, schemaText: e.target.value })}
            />
          </label>
          <p className={schemaCheck.valid ? "schema-ok" : "schema-bad"} role="status">
            {schemaCheck.valid
              ? t("Schema: valid draft-07")
              : `${t("Schema")}: ${schemaCheck.errors[0] ?? t("invalid")}`}
          </p>

          <fieldset className="mode-picker">
            <legend>{t("Normalization policy (conservative only)")}</legend>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.trimWhitespace}
                onChange={(e) => setForm({ ...form, trimWhitespace: e.target.checked })}
              />
              {t("Trim outer whitespace")}
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.normalizeLineEndings}
                onChange={(e) => setForm({ ...form, normalizeLineEndings: e.target.checked })}
              />
              {t("Normalize line endings")}
            </label>
          </fieldset>

          {formError ? (
            <p role="alert" className="status-error">
              {formError}
            </p>
          ) : null}

          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={() => void save()}>
              {editing ? t("Save new version") : t("Create template")}
            </button>
            <button type="button" className="btn" onClick={cancel}>
              {t("Cancel")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
