import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./SettingsPage";
import { buildBackup, importBackup, BackupError } from "../export/backup";
import { downloadText } from "../export/export";

vi.mock("../export/backup", () => ({
  buildBackup: vi.fn(),
  importBackup: vi.fn(),
  BackupError: class BackupError extends Error {
    constructor(readonly code: string, message: string) {
      super(message);
      this.name = "BackupError";
    }
  },
}));
vi.mock("../export/export", () => ({ downloadText: vi.fn() }));

describe("SettingsPage", () => {
  it("exports a project backup", async () => {
    vi.mocked(buildBackup).mockResolvedValue({ formatVersion: 1, entities: {} } as never);
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /export project backup/i }));
    await vi.waitFor(() => expect(vi.mocked(downloadText)).toHaveBeenCalled());
    expect(vi.mocked(downloadText).mock.calls[0]?.[0]).toMatch(/backup-.*\.json/);
    expect(screen.getByText(/never api keys/i)).toBeInTheDocument();
  });

  it("imports a validated backup file", async () => {
    vi.mocked(importBackup).mockResolvedValue(42);
    render(<SettingsPage />);
    const file = new File(['{"formatVersion":1,"entities":{}}'], "backup.json", { type: "application/json" });
    const input = document.getElementById("backup-import") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await vi.waitFor(() => expect(screen.getByText(/imported 42 records/i)).toBeInTheDocument());
  });

  it("reports rejected backups without changing data", async () => {
    vi.mocked(importBackup).mockRejectedValue(new BackupError("secret_found", "no secrets allowed"));
    render(<SettingsPage />);
    const file = new File(['{"x":1}'], "bad.json", { type: "application/json" });
    const input = document.getElementById("backup-import") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await vi.waitFor(() => expect(screen.getByText(/import rejected \(secret_found\)/i)).toBeInTheDocument());
  });
});
