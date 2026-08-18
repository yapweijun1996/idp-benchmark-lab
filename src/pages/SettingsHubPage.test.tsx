import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsHubPage } from "./SettingsHubPage";
import { getDb } from "../storage/db";

vi.mock("../demo/seedDemoFixture", () => ({
  seedDemoFixture: vi.fn(async (db: ReturnType<typeof getDb>) => {
    await db.documents.put({
      id: "demo-document-popular-po",
      name: "popular-po-demo.pdf",
      mimeType: "application/pdf",
      size: 1,
      sha256: "demo",
      createdAt: "2026-01-01T00:00:00.000Z",
      storageMode: "indexeddb",
    });
    await db.extractionProfiles.put({
      id: "demo-profile-popular-po",
      name: "Demo: Popular Purchase Order",
      version: 1,
      basePrompt: "demo",
      extractionContract: [],
      jsonSchema: {},
      promptSha256: "demo",
      schemaSha256: "demo",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await db.goldenAnswers.put({
      id: "demo-golden-popular-po",
      documentId: "demo-document-popular-po",
      profileId: "demo-profile-popular-po",
      profileVersion: 1,
      version: 1,
      json: {},
      sha256: "demo",
      schemaValid: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    return {
      documentId: "demo-document-popular-po",
      profileId: "demo-profile-popular-po",
      goldenId: "demo-golden-popular-po",
    };
  }),
}));

beforeEach(async () => {
  const db = getDb();
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("SettingsHubPage", () => {
  it("defaults to the AI Providers tab", () => {
    render(<SettingsHubPage />);
    expect(screen.getByRole("tab", { name: /ai providers/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /^ai providers$/i })).toBeInTheDocument();
  });

  it("General tab persists the default input mode", async () => {
    render(<SettingsHubPage />);
    fireEvent.click(screen.getByRole("tab", { name: /general/i }));
    fireEvent.click(screen.getByRole("radio", { name: /render pages as images/i }));

    await vi.waitFor(async () => {
      const { getAppSettings } = await import("../storage/settings");
      const settings = await getAppSettings();
      expect(settings.defaultInputMode).toBe("canonical_images");
    });
  });

  it("General tab persists the default run count", async () => {
    render(<SettingsHubPage />);
    fireEvent.click(screen.getByRole("tab", { name: /general/i }));
    expect(screen.getByRole("radio", { name: "5" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "20" }));

    await vi.waitFor(async () => {
      const { getAppSettings } = await import("../storage/settings");
      const settings = await getAppSettings();
      expect(settings.defaultRunCount).toBe(20);
    });
    expect(screen.getByRole("radio", { name: "20" })).toBeChecked();
  });

  it("Storage tab shows record counts and restores the bundled demo after clearing user data", async () => {
    const db = getDb();
    await db.documents.put({
      id: "d-1",
      name: "a.pdf",
      mimeType: "application/pdf",
      size: 1,
      sha256: "x",
      createdAt: "2026-08-15T00:00:00.000Z",
      storageMode: "session",
    });

    render(<SettingsHubPage />);
    fireEvent.click(screen.getByRole("tab", { name: /storage/i }));
    await vi.waitFor(() => expect(screen.getAllByText("1").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: /clear local data/i }));
    expect(screen.getByRole("button", { name: /yes, clear everything/i })).toBeInTheDocument();
    expect(await db.documents.count()).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /yes, clear everything/i }));
    await vi.waitFor(async () => {
      expect(await db.documents.get("d-1")).toBeUndefined();
      expect(await db.documents.get("demo-document-popular-po")).toBeDefined();
      expect(await db.extractionProfiles.get("demo-profile-popular-po")).toBeDefined();
      expect(await db.goldenAnswers.get("demo-golden-popular-po")).toBeDefined();
      expect(await db.providerConfigs.get("demo-provider-gpt-gateway")).toBeUndefined();
    });
    await vi.waitFor(() => expect(screen.getByText(/bundled demo fixture was restored/i)).toBeInTheDocument());
  });

  it("Storage tab clear can be cancelled without deleting data", async () => {
    const db = getDb();
    await db.documents.put({
      id: "d-1",
      name: "a.pdf",
      mimeType: "application/pdf",
      size: 1,
      sha256: "x",
      createdAt: "2026-08-15T00:00:00.000Z",
      storageMode: "session",
    });

    render(<SettingsHubPage />);
    fireEvent.click(screen.getByRole("tab", { name: /storage/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear local data/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByRole("button", { name: /clear local data/i })).toBeInTheDocument();
    expect(await db.documents.count()).toBe(1);
  });

  it("Privacy & Security and About tabs render static guidance", () => {
    render(<SettingsHubPage />);
    fireEvent.click(screen.getByRole("tab", { name: /privacy/i }));
    expect(screen.getByText(/memory only by default/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /about/i }));
    expect(screen.getByText(/version/i)).toBeInTheDocument();
  });
});
