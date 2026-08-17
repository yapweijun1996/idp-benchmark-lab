import { getDb, type IdpDatabase } from "./db";
import type { AppSettings } from "./types";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: "app",
  defaultConcurrency: 1,
  defaultInputMode: "native_pdf",
  defaultRunCount: 5,
  theme: "system",
  showSecretsWarning: true,
  updatedAt: "",
};

/** Returns stored settings merged over defaults (missing fields are back-filled). */
export async function getAppSettings(db: IdpDatabase = getDb()): Promise<AppSettings> {
  const stored = await db.appSettings.get("app");
  return { ...DEFAULT_APP_SETTINGS, ...stored };
}

export async function saveAppSettings(
  patch: Partial<Omit<AppSettings, "id" | "updatedAt">>,
  db: IdpDatabase = getDb(),
): Promise<AppSettings> {
  const current = await getAppSettings(db);
  const next: AppSettings = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.appSettings.put(next);
  return next;
}
