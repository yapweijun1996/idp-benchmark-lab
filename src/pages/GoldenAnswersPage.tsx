import { useEffect, useMemo, useState } from "react";
import { PdfPreview } from "../documents/PdfPreview";
import { useDocuments } from "../documents/useDocuments";
import { useGoldens } from "../golden/useGoldens";
import { useProfiles } from "../profiles/useProfiles";
import { validateData } from "../profiles/schema";
import type { GoldenAnswer } from "../storage/types";
import { useI18n } from "../i18n";

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function GoldenAnswersPage() {
  const { t } = useI18n();
  const documents = useDocuments();
  const profiles = useProfiles();
  const goldens = useGoldens();

  const [documentId, setDocumentId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const profile = profiles.profiles.find((p) => p.id === profileId);
  const activeDocument = documents.documents.find((d) => d.id === documentId);

  const goldenFor = (selectedDocumentId: string, selectedProfileId: string) =>
    goldens.goldens.find((g) => g.documentId === selectedDocumentId && g.profileId === selectedProfileId);

  const selectDocument = (nextDocumentId: string) => {
    setDocumentId(nextDocumentId);
    const existing = goldenFor(nextDocumentId, profileId);
    goldens.select(existing?.id);
    setJsonText(existing ? JSON.stringify(existing.json, null, 2) : "");
    setFormError(null);
    setSaved(false);
  };

  const selectProfile = (nextProfileId: string) => {
    setProfileId(nextProfileId);
    const existing = goldenFor(documentId, nextProfileId);
    goldens.select(existing?.id);
    setJsonText(existing ? JSON.stringify(existing.json, null, 2) : "");
    setFormError(null);
    setSaved(false);
  };

  const goldenCases = profileId
    ? documents.documents.map((document) => ({
        document,
        golden: goldenFor(document.id, profileId),
      }))
    : [];
  const readyCases = goldenCases.filter((testCase) => testCase.golden).length;

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
    goldens.select(golden.id);
    setFormError(null);
    setSaved(false);
  };

  const save = async () => {
    setSaved(false);
    if (!documentId) {
      setFormError(t("Select a document first."));
      return;
    }
    if (!profileId) {
      setFormError(t("Select an extraction template first."));
      return;
    }
    const parsed = parseJson(jsonText);
    if (!parsed.ok) {
      setFormError(`${t("JSON parse error")}: ${parsed.error}`);
      return;
    }
    if (!validation?.valid) {
      setFormError(`${t("Schema validation failed")}: ${validation?.errors.join("; ") ?? t("unknown")}`);
      return;
    }
    try {
      const active = goldens.goldens.find((g) => g.id === goldens.activeId);
      let savedGolden: GoldenAnswer;
      if (active && active.profileId === profileId && active.documentId === documentId) {
        savedGolden = await goldens.update(active.id, parsed.value);
      } else {
        savedGolden = await goldens.create({ documentId, profileId, json: parsed.value });
      }
      goldens.select(savedGolden.id);
      setFormError(null);
      setSaved(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section aria-labelledby="golden-title">
      <h2 id="golden-title">{t("Expected Results")}</h2>
      <p>{t("The expected correct JSON. Every save is validated against the active template's schema and versioned; nothing is auto-rewritten.")}</p>

      <div className="golden-grid">
        <div className="profile-form">
          <label className="field">
            <span>{t("Document")}</span>
            <select value={documentId} onChange={(e) => selectDocument(e.target.value)}>
              <option value="">— {t("select document")} —</option>
              {documents.documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("Extraction template")}</span>
            <select value={profileId} onChange={(e) => selectProfile(e.target.value)}>
              <option value="">— {t("select template")} —</option>
              {profiles.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (v{p.version})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("Expected Result JSON")}</span>
            <textarea
              rows={14}
              className="mono-input"
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setSaved(false);
              }}
            />
          </label>

          {validation ? (
            <p className={validation.valid ? "schema-ok" : "schema-bad"} role="status">
              {validation.valid ? t("Valid against template schema") : `${t("Schema errors")}: ${validation.errors[0] ?? t("invalid")}`}
            </p>
          ) : (
            <p className="doc-card__meta" role="status">
              {t("Select a template to validate against its schema.")}
            </p>
          )}

          {saved && !formError ? (
            <p role="status" className="schema-ok">
              ✓ {t("Expected Result is valid and saved")}
            </p>
          ) : null}

          {formError ? (
            <p role="alert" className="status-error">
              {formError}
            </p>
          ) : null}

          <div className="toolbar">
            <button type="button" className="btn btn--primary" onClick={() => void save()}>
              {goldens.activeId ? t("Save new version") : t("Save Expected Result")}
            </button>
          </div>
        </div>

        <div>
          {activeDocument ? (
            <div className="preview-panel">
              <h3>{t("Preview")} — {activeDocument.name}</h3>
              <DocumentPreview documentId={activeDocument.id} />
            </div>
          ) : (
            <p className="empty-state">{t("Select a document to preview it.")}</p>
          )}
        </div>
      </div>

      <section className="golden-test-set" aria-labelledby="golden-test-set-title">
        <div className="golden-test-set__heading">
          <div>
            <h3 id="golden-test-set-title">{t("Golden test set")}</h3>
            <p>{t("Each PDF is a separate test case. Add an Expected Result for every preset you want to compare.")}</p>
          </div>
          {profileId ? (
            <span className={readyCases === goldenCases.length ? "chip chip--ok" : "chip chip--todo"}>
              {readyCases} / {goldenCases.length} {t("ready")}
            </span>
          ) : null}
        </div>
        {!profileId ? (
          <p className="empty-state">{t("Select an extraction template to see its PDF test cases.")}</p>
        ) : goldenCases.length === 0 ? (
          <p className="empty-state">{t("Add PDFs in Documents to build a multi-document golden test.")}</p>
        ) : (
          <ul className="golden-case-list">
            {goldenCases.map(({ document, golden }) => (
              <li key={document.id} className="golden-case">
                <div className="golden-case__info">
                  <strong>{document.name}</strong>
                  <span className="doc-card__meta">
                    PDF · {Math.max(1, document.pageCount ?? 1)} {document.pageCount === 1 ? t("page") : t("pages")}
                  </span>
                </div>
                {golden ? (
                  <span className="chip chip--ok">{t("Ready")} · v{golden.version}</span>
                ) : (
                  <span className="chip chip--todo">{t("Expected Result missing")}</span>
                )}
                <button type="button" onClick={() => (golden ? startEdit(golden.id) : selectDocument(document.id))}>
                  {golden ? t("Edit") : t("Add Expected Result")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {goldens.goldens.length === 0 ? (
        <p className="empty-state">
          {t("No Expected Results yet. An Expected Result is the correct extracted JSON for a document — save one above so benchmarks can score accuracy against it.")}
        </p>
      ) : (
        <>
          <h3>{t("Saved expected results")}</h3>
          <ul className="doc-list">
            {goldens.goldens.map((g) => (
              <li key={g.id} className="doc-card">
                <button type="button" className="doc-card__main" onClick={() => startEdit(g.id)}>
                  <span className="doc-card__name">
                    {documents.documents.find((d) => d.id === g.documentId)?.name ?? t("Expected Result")}{" "}
                    <span className="chip chip--todo">v{g.version}</span>
                  </span>
                  <span className="doc-card__meta">
                    {t("template")} {g.profileId.slice(0, 8)}… · {t("document")} {g.documentId.slice(0, 8)}… · sha {g.sha256.slice(0, 10)}…
                  </span>
                </button>
                <button type="button" onClick={() => startEdit(g.id)}>
                  {t("Edit")}
                </button>
                <button type="button" className="btn--danger" onClick={() => void goldens.remove(g.id)}>
                  {t("Delete")}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Fetches the document blob and renders the PDF preview. */
function DocumentPreview({ documentId }: { documentId: string }) {
  const { t } = useI18n();
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
    return <p className="empty-state">{t("Loading preview…")}</p>;
  }
  return <PdfPreview blob={blob} />;
}
