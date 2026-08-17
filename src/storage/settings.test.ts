import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdpDatabase } from "./db";
import { DEFAULT_APP_SETTINGS, getAppSettings, saveAppSettings } from "./settings";
import type { AppSettings } from "./types";

let db: IdpDatabase;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-settings-test-${counter}`);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("app settings", () => {
  it("returns defaults when nothing is stored", async () => {
    await expect(getAppSettings(db)).resolves.toEqual(DEFAULT_APP_SETTINGS);
  });

  it("persists and merges patches over defaults", async () => {
    await saveAppSettings({ defaultInputMode: "canonical_images" }, db);
    const loaded = await getAppSettings(db);
    expect(loaded.defaultInputMode).toBe("canonical_images");
    expect(loaded.defaultConcurrency).toBe(1);
    expect(loaded.updatedAt).not.toBe("");
  });

  it("defaults defaultRunCount to 5 and persists a chosen preset", async () => {
    expect((await getAppSettings(db)).defaultRunCount).toBe(5);
    await saveAppSettings({ defaultRunCount: 20 }, db);
    expect((await getAppSettings(db)).defaultRunCount).toBe(20);
  });

  it("back-fills defaultRunCount for settings records saved before the field existed", async () => {
    await db.appSettings.put({
      id: "app",
      defaultConcurrency: 1,
      defaultInputMode: "native_pdf",
      theme: "system",
      showSecretsWarning: true,
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as unknown as AppSettings);
    expect((await getAppSettings(db)).defaultRunCount).toBe(5);
  });
});
