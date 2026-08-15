import { useRef, useState } from "react";
import { buildBackup, importBackup, BackupError } from "../export/backup";
import { readTextBlob } from "../documents/blob";
import { downloadText } from "../export/export";
import { getDb } from "../storage/db";

export function SettingsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const db = getDb();
      const bundle = await buildBackup(db);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadText("idp-benchmark-backup-" + stamp + ".json", JSON.stringify(bundle, null, 2), "application/json");
      setMessage("Backup downloaded. It contains local data but never API keys.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const text = await readTextBlob(file);
      const db = getDb();
      const count = await importBackup(db, text, "replace");
      setMessage("Imported " + count + " records. Reload the app to refresh all views.");
    } catch (e) {
      if (e instanceof BackupError) {
        setMessage("Import rejected (" + e.code + "): " + e.message);
      } else {
        setMessage(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="settings-title">
      <h1 id="settings-title">Settings</h1>
      <p>App settings, data backup, and import. API keys are memory-only and are never part of any backup.</p>

      <div className="profile-form">
        <h2>Backup & restore</h2>
        <div className="toolbar">
          <button type="button" className="btn btn--primary" onClick={() => void exportBackup()} disabled={busy}>
            {busy ? "Working…" : "Export project backup (JSON)"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="visually-hidden"
            id="backup-import"
            onChange={onImportFile}
          />
          <button type="button" className="btn" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            Import backup (replaces current data)
          </button>
        </div>
        <p className="doc-card__meta">
          Imports are validated before writing: structure, record ids, and secret-like fields are checked; invalid or
          poisoned backups are rejected without changing your data.
        </p>
        {message ? (
          <p role="status" className="status-error">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
