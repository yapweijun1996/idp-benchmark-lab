import { useRef, useState } from "react";
import { buildBackup, importBackup, BackupError } from "../export/backup";
import { readTextBlob } from "../documents/blob";
import { downloadText } from "../export/export";
import { getDb } from "../storage/db";
import { useI18n } from "../i18n";

type BackupStatus = { kind: "success" | "error"; text: string };

export function SettingsPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    setStatus(null);
    setBusy(true);
    try {
      const db = getDb();
      const bundle = await buildBackup(db);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadText("idp-benchmark-backup-" + stamp + ".json", JSON.stringify(bundle, null, 2), "application/json");
      setStatus({ kind: "success", text: `✓ ${t("Backup downloaded. It contains local data but never API keys.")}` });
    } catch (e) {
      setStatus({ kind: "error", text: `✗ ${t("Export failed")}: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
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
      setStatus({ kind: "success", text: `✓ ${t("Imported")} ${count} ${t("records. Reload the app to refresh all views.")}` });
    } catch (e) {
      if (e instanceof BackupError) {
        setStatus({ kind: "error", text: `✗ ${t("Import rejected")} (${e.code}): ${e.message}` });
      } else {
        setStatus({ kind: "error", text: `✗ ${t("Import failed")}: ${e instanceof Error ? e.message : String(e)}` });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="settings-backup-title">
      <div className="profile-form">
        <h2 id="settings-backup-title">{t("Backup & restore")}</h2>
        <p className="doc-card__meta">{t("Export or import your local data. API keys are memory-only and are never part of any backup.")}</p>
        <div className="toolbar">
          <button type="button" className="btn btn--primary" onClick={() => void exportBackup()} disabled={busy}>
            {busy ? t("Working…") : t("Export project backup (JSON)")}
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
            {t("Import backup (replaces current data)")}
          </button>
        </div>
        <p className="doc-card__meta">
          {t("Imports are validated before writing: structure, record ids, and secret-like fields are checked; invalid or poisoned backups are rejected without changing your data.")}
        </p>
        {status ? (
          <p role={status.kind === "error" ? "alert" : "status"} className={status.kind === "error" ? "status-error" : "schema-ok"}>
            {status.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
