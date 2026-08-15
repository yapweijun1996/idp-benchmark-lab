import { useMemo, useState } from "react";
import { useProfiles } from "../profiles/useProfiles";
import { validateJsonSchema } from "../profiles/schema";
import type { ExtractionProfile } from "../storage/types";

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
  const profiles = useProfiles();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

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
  };

  const startEdit = (profile: ExtractionProfile) => {
    setEditingId(profile.id);
    setForm(formFromProfile(profile));
    setFormError(null);
  };

  const cancel = () => {
    setEditingId(null);
    setFormError(null);
  };

  const save = async () => {
    const contract = parseJson(form.contractText || "{}");
    if (!contract.ok) {
      setFormError(`Extraction contract JSON: ${contract.error}`);
      return;
    }
    const schema = parseJson(form.schemaText);
    if (!schema.ok) {
      setFormError(`JSON schema: ${schema.error}`);
      return;
    }
    const check = validateJsonSchema(schema.value);
    if (!check.valid) {
      setFormError(`JSON schema invalid: ${check.errors.join("; ")}`);
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
      if (editingId === "new") {
        await profiles.create(input);
      } else if (editingId) {
        await profiles.update(editingId, input);
      }
      setEditingId(null);
      setFormError(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  const editing = editingId === "new" ? null : profiles.profiles.find((p) => p.id === editingId);

  return (
    <section aria-labelledby="profiles-title">
      <h1 id="profiles-title">Extraction Profiles</h1>
      <p>Modular profiles: base prompt + extraction contract + JSON schema + normalization policy. Each save creates a new version.</p>

      {profiles.error ? (
        <p role="alert" className="status-error">
          {profiles.error}
        </p>
      ) : null}

      {editingId === null ? (
        <>
          <button type="button" className="btn btn--primary" onClick={startCreate}>
            New profile
          </button>
          {profiles.profiles.length === 0 ? (
            <p className="empty-state">No profiles yet.</p>
          ) : (
            <ul className="doc-list">
              {profiles.profiles.map((p) => (
                <li key={p.id} className="doc-card">
                  <button type="button" className="doc-card__main" onClick={() => startEdit(p)}>
                    <span className="doc-card__name">
                      {p.name} <span className="chip chip--todo">v{p.version}</span>
                    </span>
                    <span className="doc-card__meta">
                      prompt {shortHash(p.promptSha256)} · schema {shortHash(p.schemaSha256)}
                    </span>
                  </button>
                  <button type="button" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button type="button" className="btn--danger" onClick={() => void profiles.remove(p.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="profile-form">
          <h2>{editing ? `Edit ${editing.name}` : "New profile"}</h2>
          {editing ? (
            <p className="doc-card__meta">
              Saving creates version {editing.version + 1} of this profile.
            </p>
          ) : null}

          <label className="field">
            <span>Name</span>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label className="field">
            <span>Description (optional)</span>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Base prompt</span>
            <textarea
              rows={6}
              value={form.basePrompt}
              onChange={(e) => setForm({ ...form, basePrompt: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Extraction contract (JSON)</span>
            <textarea
              rows={6}
              className="mono-input"
              value={form.contractText}
              onChange={(e) => setForm({ ...form, contractText: e.target.value })}
            />
          </label>

          <label className="field">
            <span>JSON schema (draft-07)</span>
            <textarea
              rows={10}
              className="mono-input"
              value={form.schemaText}
              onChange={(e) => setForm({ ...form, schemaText: e.target.value })}
            />
          </label>
          <p className={schemaCheck.valid ? "schema-ok" : "schema-bad"} role="status">
            {schemaCheck.valid
              ? "Schema: valid draft-07"
              : `Schema: ${schemaCheck.errors[0] ?? "invalid"}`}
          </p>

          <fieldset className="mode-picker">
            <legend>Normalization policy (conservative only)</legend>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.trimWhitespace}
                onChange={(e) => setForm({ ...form, trimWhitespace: e.target.checked })}
              />
              Trim outer whitespace
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.normalizeLineEndings}
                onChange={(e) => setForm({ ...form, normalizeLineEndings: e.target.checked })}
              />
              Normalize line endings
            </label>
          </fieldset>

          {formError ? (
            <p role="alert" className="status-error">
              {formError}
            </p>
          ) : null}

          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={() => void save()}>
              {editing ? "Save new version" : "Create profile"}
            </button>
            <button type="button" className="btn" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
