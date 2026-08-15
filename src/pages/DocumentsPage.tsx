import { useCallback, useEffect, useRef, useState } from "react";
import { PdfPreview } from "../documents/PdfPreview";
import { useDocuments } from "../documents/useDocuments";
import { getAppSettings, saveAppSettings } from "../storage/settings";
import type { InputMode } from "../storage/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…`;
}

export function DocumentsPage() {
  const docs = useDocuments();
  const [persist, setPersist] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("native_pdf");
  const [activeBlob, setActiveBlob] = useState<{ id: string; blob: Blob | undefined } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getAppSettings()
      .then((s) => setInputMode(s.defaultInputMode))
      .catch(() => undefined);
  }, []);

  const { activeId, getBlob } = docs;

  useEffect(() => {
    let cancelled = false;
    if (activeId) {
      void getBlob(activeId).then((blob) => {
        if (!cancelled) {
          setActiveBlob({ id: activeId, blob });
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [activeId, getBlob]);

  const onFilesChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void docs.upload(file, persist);
      }
      event.target.value = "";
    },
    [docs, persist],
  );

  const changeMode = useCallback((mode: InputMode) => {
    setInputMode(mode);
    void saveAppSettings({ defaultInputMode: mode }).catch(() => undefined);
  }, []);

  const active = docs.documents.find((d) => d.id === docs.activeId);

  return (
    <section aria-labelledby="documents-title">
      <h1 id="documents-title">Documents</h1>
      <p>Upload and preview local PDFs. Default storage is session-only; nothing leaves this browser until a benchmark runs.</p>

      <div className="toolbar">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="visually-hidden"
          id="pdf-upload"
          onChange={onFilesChanged}
        />
        <button type="button" className="btn btn--primary" onClick={() => fileInputRef.current?.click()}>
          Upload PDF
        </button>
        <label className="checkbox">
          <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
          Keep in browser storage (IndexedDB)
        </label>
      </div>

      <fieldset className="mode-picker">
        <legend>Default input mode</legend>
        <label>
          <input
            type="radio"
            name="input-mode"
            value="native_pdf"
            checked={inputMode === "native_pdf"}
            onChange={() => changeMode("native_pdf")}
          />
          Native PDF
        </label>
        <label>
          <input
            type="radio"
            name="input-mode"
            value="canonical_images"
            checked={inputMode === "canonical_images"}
            onChange={() => changeMode("canonical_images")}
          />
          Canonical rendered images
        </label>
      </fieldset>

      {docs.error ? (
        <p role="alert" className="status-error">
          {docs.error}
        </p>
      ) : null}

      {docs.documents.length === 0 ? (
        <p className="empty-state">No documents yet. Upload a PDF to begin.</p>
      ) : (
        <ul className="doc-list">
          {docs.documents.map((doc) => (
            <li key={doc.id} className="doc-card">
              <button type="button" className="doc-card__main" onClick={() => docs.select(doc.id)}>
                <span className="doc-card__name">{doc.name}</span>
                <span className="doc-card__meta">
                  {formatBytes(doc.size)} · sha256 {shortHash(doc.sha256)}
                  {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
                </span>
              </button>
              <span className={`chip ${doc.storageMode === "indexeddb" ? "chip--ok" : "chip--session"}`}>
                {doc.storageMode === "indexeddb" ? "persisted" : "session"}
              </span>
              {doc.id === docs.activeId ? <span className="chip chip--active">active</span> : null}
              <button
                type="button"
                onClick={() => void docs.setPersistence(doc.id, doc.storageMode !== "indexeddb")}
              >
                {doc.storageMode === "indexeddb" ? "Make session-only" : "Persist"}
              </button>
              <button type="button" className="btn--danger" onClick={() => void docs.remove(doc.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {active && activeBlob && activeBlob.id === active.id && activeBlob.blob ? (
        <div className="preview-panel">
          <h2>Preview — {active.name}</h2>
          <PdfPreview blob={activeBlob.blob} onPageCount={(n) => void docs.updatePageCount(active.id, n)} />
        </div>
      ) : null}
    </section>
  );
}
