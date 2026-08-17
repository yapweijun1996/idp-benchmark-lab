import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsHubPage } from "./SettingsHubPage";
import { getDb } from "../storage/db";

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

  it("Storage tab shows record counts and requires two clicks to clear data", async () => {
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
    await vi.waitFor(async () => expect(await db.documents.count()).toBe(0));
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
