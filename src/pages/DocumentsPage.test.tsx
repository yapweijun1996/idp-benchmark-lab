import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentsPage } from "./DocumentsPage";
import { useDocuments, type UseDocumentsResult } from "../documents/useDocuments";
import { getAppSettings, saveAppSettings } from "../storage/settings";
import type { DocumentRecord } from "../storage/types";

vi.mock("../documents/useDocuments", () => ({ useDocuments: vi.fn() }));
vi.mock("../storage/settings", () => ({ getAppSettings: vi.fn(), saveAppSettings: vi.fn() }));

const useDocumentsMock = vi.mocked(useDocuments);
const getAppSettingsMock = vi.mocked(getAppSettings);

function emptyResult(): UseDocumentsResult {
  return {
    documents: [],
    activeId: undefined,
    loading: false,
    error: null,
    refresh: vi.fn(() => Promise.resolve()),
    upload: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    setPersistence: vi.fn(() => Promise.resolve()),
    select: vi.fn(),
    getBlob: vi.fn(() => Promise.resolve(undefined)),
    updatePageCount: vi.fn(() => Promise.resolve()),
  };
}

const record: DocumentRecord = {
  id: "doc-1",
  name: "golden-po.pdf",
  mimeType: "application/pdf",
  size: 2048,
  sha256: "abcdef0123456789abcdef",
  createdAt: "2026-08-15T00:00:00.000Z",
  storageMode: "session",
};

beforeEach(() => {
  getAppSettingsMock.mockResolvedValue({
    id: "app",
    defaultConcurrency: 1,
    defaultInputMode: "native_pdf",
    theme: "system",
    showSecretsWarning: true,
    updatedAt: "",
  });
});

describe("DocumentsPage", () => {
  it("renders the empty state with an upload control", () => {
    useDocumentsMock.mockReturnValue(emptyResult());
    render(<DocumentsPage />);
    expect(screen.getByRole("heading", { name: /documents/i })).toBeInTheDocument();
    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload pdf/i })).toBeInTheDocument();
  });

  it("lists documents with fingerprint and storage chip", () => {
    useDocumentsMock.mockReturnValue({ ...emptyResult(), documents: [record], activeId: "doc-1" });
    render(<DocumentsPage />);
    expect(screen.getByText("golden-po.pdf")).toBeInTheDocument();
    expect(screen.getByText(/abcdef0123…/)).toBeInTheDocument();
    expect(screen.getByText("session")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("deletes a document via the Delete button", () => {
    const remove = vi.fn(() => Promise.resolve());
    useDocumentsMock.mockReturnValue({ ...emptyResult(), documents: [record], remove });
    render(<DocumentsPage />);
    screen.getByRole("button", { name: /delete/i }).click();
    expect(remove).toHaveBeenCalledWith("doc-1");
  });

  it("persists the selected input mode to settings", async () => {
    const saveMock = vi.mocked(saveAppSettings).mockResolvedValue({
      id: "app",
      defaultConcurrency: 1,
      defaultInputMode: "canonical_images",
      theme: "system",
      showSecretsWarning: true,
      updatedAt: "",
    });
    useDocumentsMock.mockReturnValue(emptyResult());
    render(<DocumentsPage />);
    screen.getByRole("radio", { name: /canonical rendered images/i }).click();
    expect(saveMock).toHaveBeenCalledWith({ defaultInputMode: "canonical_images" });
  });
});
