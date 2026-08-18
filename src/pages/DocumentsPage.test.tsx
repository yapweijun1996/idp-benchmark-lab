import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentsPage } from "./DocumentsPage";
import { useDocuments, type UseDocumentsResult } from "../documents/useDocuments";
import type { DocumentRecord } from "../storage/types";

vi.mock("../documents/useDocuments", () => ({ useDocuments: vi.fn() }));

const useDocumentsMock = vi.mocked(useDocuments);

function emptyResult(): UseDocumentsResult {
  return {
    documents: [],
    activeId: undefined,
    loading: false,
    error: null,
    refresh: vi.fn(() => Promise.resolve()),
    upload: vi.fn(() => Promise.resolve(record)),
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
    expect(screen.getByText("Session only")).toBeInTheDocument();
    expect(screen.getByText("Previewing")).toBeInTheDocument();
  });

  it("deletes a document via the Delete button and shows confirmation", async () => {
    const remove = vi.fn(() => Promise.resolve());
    useDocumentsMock.mockReturnValue({ ...emptyResult(), documents: [record], remove });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DocumentsPage />);
    screen.getByRole("button", { name: /delete/i }).click();
    expect(confirm).toHaveBeenCalledWith("Delete golden-po.pdf from this browser?");
    expect(remove).toHaveBeenCalledWith("doc-1");
    expect(await screen.findByText(/✓ golden-po\.pdf deleted/i)).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("shows a success message after a successful upload", async () => {
    const upload = vi.fn(() => Promise.resolve({ ...record, id: "uploaded-invoice" }));
    useDocumentsMock.mockReturnValue({ ...emptyResult(), upload });
    render(<DocumentsPage />);
    const file = new File(["%PDF"], "invoice.pdf", { type: "application/pdf" });
    const input = document.querySelector("#pdf-upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText(/✓ invoice\.pdf uploaded/i)).toBeInTheDocument();
  });

  it("shows an actionable error when the uploaded file isn't a PDF", async () => {
    const invalidTypeError = Object.assign(new Error("Expected application/pdf, got text/plain"), {
      code: "invalid_type",
    });
    const upload = vi.fn(() => Promise.reject(invalidTypeError));
    useDocumentsMock.mockReturnValue({ ...emptyResult(), upload });
    render(<DocumentsPage />);
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const input = document.querySelector("#pdf-upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't a pdf/i);
  });
});
