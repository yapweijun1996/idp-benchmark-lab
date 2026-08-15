import { useEffect, useMemo, useState } from "react";
import { PdfPreview } from "../documents/PdfPreview";
import { useDocuments } from "../documents/useDocuments";
import { useGoldens } from "../golden/useGoldens";
import { useProfiles } from "../profiles/useProfiles";
import { validateData } from "../profiles/schema";

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function GoldenAnswersPage() {
  const documents = useDocuments();
  const profiles = useProfiles();
  const goldens = useGoldens();

  const [documentId, setDocumentId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const profile = profiles.profiles.find((p) => p.id === profileId);
  const activeDocument = documents.documents.find((d) => d.id === documentId);

  const validation = useMemo(() => {
    if (!profile) {
      return null;
    }
    const parsed = parseJson(jsonText);
    if (!parsed.ok) {
      return { valid: false as const, errors: [parsed.error] };
    }
    return validateData(parsed.value, profile.jsonSchema);
  }, [jsonText, profile]);

  const startEdit = (id: string) => {
    const golden = goldens.goldens.find((g) => g.id === id);
    if (!golden) {
      return;
    }
    setDocumentId(golden.documentId);
    setProfileId(golden.profileId);
    setJsonText(JSON.stringify(golden.json, null, 2));
    setFormError(null);
  };

  const save = async () => {
    if (!documentId) {
      setFormError("Select a document first.");
      return;
    }
    if (!profileId) {
      setFormError("Select an extraction profile first.");
      return;
    }
    const parsed = parseJson(jsonText);
    if (!parsed.ok) {
      setFormError(`JSON parse error: ${parsed.error}`);
      return;
    }
    if (!validation?.valid) {
      setFormError(`Schema validation failed: ${validation?.errors.join("; ") ?? "unknown"}`);
      return;
    }
    try {
      const active = goldens.goldens.find((g) => g.id === goldens.activeId);
      if (active && active.profileId === profileId && active.documentId === documentId) {
        await goldens.update(active.id, parsed.value);
      } else {
        await goldens.create({ documentId, profileId, json: parsed.value });
      }
      setFormError(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section aria-labelledby="golden-title">
      <h1 id="golden-title">Golden Answers</h1>
      <p>The expected correct JSON. Every save is validated against the active profile schema and versioned; nothing is auto-rewritten.</p>

      <div className="golden-grid">
        <div className="profile-form">
          <label className="field">
            <span>Document</span>
            <select value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
              <option value="">— select document —</option>
              {documents.documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Extraction profile</span>
            <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              <option value="">— select profile —</option>
              {profiles.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (v{p.version})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Golden JSON</span>
            <textarea
              rows={14}
              className="mono-input"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </label>

          {validation ? (
            <p className={validation.valid ? "schema-ok" : "schema-bad"} role="status">
              {validation.valid ? "Valid against profile schema" : `Schema errors: ${validation.errors[0] ?? "invalid"}`}
            </p>
          ) : (
            <p className="schema-bad" role="status">
              Select a profile to validate against its schema.
            </p>
          )}

          {formError ? (
            <p role="alert" className="status-error">
              {formError}
            </p>
          ) : null}

          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={() => void save()}>
              {goldens.activeId ? "Save new version" : "Save Golden Answer"}
            </button>
          </div>
        </div>

        <div>
          {activeDocument ? (
            <div className="preview-panel">
              <h2>Preview — {activeDocument.name}</h2>
              <DocumentPreview documentId={activeDocument.id} />
            </div>
          ) : (
            <p className="empty-state">Select a document to preview it.</p>
          )}
        </div>
      </div>

      {goldens.goldens.length === 0 ? (
        <p className="empty-state">No Golden Answers yet.</p>
      ) : (
        <ul className="doc-list">
          {goldens.goldens.map((g) => (
            <li key={g.id} className="doc-card">
              <button type="button" className="doc-card__main" onClick={() => startEdit(g.id)}>
                <span className="doc-card__name">
                  Golden <span className="chip chip--todo">v{g.version}</span>
                </span>
                <span className="doc-card__meta">
                  profile {g.profileId.slice(0, 8)}… · document {g.documentId.slice(0, 8)}… · sha {g.sha256.slice(0, 10)}…
                </span>
              </button>
              <button type="button" onClick={() => startEdit(g.id)}>
                Edit
              </button>
              <button type="button" className="btn--danger" onClick={() => void goldens.remove(g.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Fetches the document blob and renders the PDF preview. */
function DocumentPreview({ documentId }: { documentId: string }) {
  const { getBlob } = useDocuments();
  const [loaded, setLoaded] = useState<{ id: string; blob: Blob | undefined } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBlob(documentId).then((blob) => {
      if (!cancelled) {
        setLoaded({ id: documentId, blob });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [documentId, getBlob]);

  const blob = loaded && loaded.id === documentId ? loaded.blob : undefined;
  if (!blob) {
    return <p className="empty-state">Loading preview…</p>;
  }
  return <PdfPreview blob={blob} />;
}
