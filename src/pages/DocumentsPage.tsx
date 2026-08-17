import { useCallback, useEffect, useRef, useState } from "react";
import { PdfPreview } from "../documents/PdfPreview";
import { useDocuments } from "../documents/useDocuments";

type ActionStatus = { kind: "success" | "error"; text: string };

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
  const [activeBlob, setActiveBlob] = useState<{ id: string; blob: Blob | undefined } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<ActionStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      event.target.value = "";
      if (!file) {
        return;
      }
      setStatus(null);
      setUploading(true);
      void docs
        .upload(file, persist)
        .then(() => setStatus({ kind: "success", text: `✓ ${file.name} uploaded.` }))
        .catch((e: unknown) => {
          const message =
            e instanceof Error && "code" in e && (e as { code: string }).code === "invalid_type"
              ? `✗ ${file.name} isn't a PDF. Choose a PDF file.`
              : `✗ Upload failed: ${e instanceof Error ? e.message : String(e)}`;
          setStatus({ kind: "error", text: message });
        })
        .finally(() => setUploading(false));
    },
    [docs, persist],
  );

  const onDelete = useCallback(
    (id: string, name: string) => {
      setStatus(null);
      void docs
        .remove(id)
        .then(() => setStatus({ kind: "success", text: `✓ ${name} deleted.` }))
        .catch((e: unknown) => setStatus({ kind: "error", text: `✗ Delete failed: ${e instanceof Error ? e.message : String(e)}` }));
    },
    [docs],
  );

  const active = docs.documents.find((d) => d.id === docs.activeId);

  return (
    <section aria-labelledby="documents-title">
      <h2 id="documents-title">Documents</h2>
      <p>Upload and preview local PDFs. Default storage is session-only; nothing leaves this browser until a benchmark runs.</p>

      <div className="toolbar">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="visually-hidden"
          id="pdf-upload"
          aria-hidden="true"
          tabIndex={-1}
          onChange={onFilesChanged}
        />
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Upload PDF"}
        </button>
        <label className="checkbox">
          <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
          Save on this device
        </label>
      </div>

      {status ? (
        <p role={status.kind === "error" ? "alert" : "status"} className={status.kind === "error" ? "status-error" : "schema-ok"}>
          {status.text}
        </p>
      ) : null}

      {docs.error ? (
        <p role="alert" className="status-error">
          {docs.error}
        </p>
      ) : null}

      {docs.documents.length === 0 ? (
        <p className="empty-state">
          No documents yet. Upload the PDF you want to benchmark extraction accuracy against — it stays in this
          browser.
        </p>
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
              <button type="button" className="btn--danger" onClick={() => onDelete(doc.id, doc.name)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {active && activeBlob && activeBlob.id === active.id && activeBlob.blob ? (
        <div className="preview-panel">
          <h3>Preview — {active.name}</h3>
          <PdfPreview blob={activeBlob.blob} onPageCount={(n) => void docs.updatePageCount(active.id, n)} />
        </div>
      ) : null}
    </section>
  );
}
