import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdpDatabase } from "./db";
import { DEFAULT_APP_SETTINGS, getAppSettings, saveAppSettings } from "./settings";

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
});
