import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoldenAnswersPage } from "./GoldenAnswersPage";
import { useDocuments, type UseDocumentsResult } from "../documents/useDocuments";
import { useProfiles, type UseProfilesResult } from "../profiles/useProfiles";
import { useGoldens, type UseGoldensResult } from "../golden/useGoldens";
import type { DocumentRecord, ExtractionProfile, GoldenAnswer } from "../storage/types";

vi.mock("../documents/useDocuments", () => ({ useDocuments: vi.fn() }));
vi.mock("../profiles/useProfiles", () => ({ useProfiles: vi.fn() }));
vi.mock("../golden/useGoldens", () => ({ useGoldens: vi.fn() }));

const useDocumentsMock = vi.mocked(useDocuments);
const useProfilesMock = vi.mocked(useProfiles);
const useGoldensMock = vi.mocked(useGoldens);

const document: DocumentRecord = {
  id: "doc-1",
  name: "golden-po.pdf",
  mimeType: "application/pdf",
  size: 100,
  sha256: "dddd",
  createdAt: "2026-08-15T00:00:00.000Z",
  storageMode: "session",
};

const profile: ExtractionProfile = {
  id: "p-1",
  name: "PO reduced",
  version: 1,
  basePrompt: "x",
  extractionContract: {},
  jsonSchema: {
    type: "object",
    properties: { document_number: { type: ["string", "null"] } },
    required: ["document_number"],
    additionalProperties: false,
  },
  promptSha256: "p",
  schemaSha256: "s",
  createdAt: "2026-08-15T00:00:00.000Z",
  updatedAt: "2026-08-15T00:00:00.000Z",
};

const golden: GoldenAnswer = {
  id: "g-1",
  documentId: "doc-1",
  profileId: "p-1",
  profileVersion: 1,
  version: 1,
  json: { document_number: "0004131999" },
  sha256: "h",
  schemaValid: true,
  createdAt: "2026-08-15T00:00:00.000Z",
};

function emptyDocuments(): UseDocumentsResult {
  return {
    documents: [document],
    activeId: "doc-1",
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

function emptyProfiles(): UseProfilesResult {
  return {
    profiles: [profile],
    activeId: "p-1",
    loading: false,
    error: null,
    refresh: vi.fn(() => Promise.resolve()),
    create: vi.fn(() => Promise.resolve(profile)),
    update: vi.fn(() => Promise.resolve(profile)),
    remove: vi.fn(() => Promise.resolve()),
    select: vi.fn(),
  };
}

function emptyGoldens(): UseGoldensResult {
  return {
    goldens: [],
    activeId: undefined,
    loading: false,
    error: null,
    refresh: vi.fn(() => Promise.resolve()),
    create: vi.fn(() => Promise.resolve(golden)),
    update: vi.fn(() => Promise.resolve(golden)),
    remove: vi.fn(() => Promise.resolve()),
    select: vi.fn(),
  };
}

beforeEach(() => {
  useDocumentsMock.mockReturnValue(emptyDocuments());
  useProfilesMock.mockReturnValue(emptyProfiles());
  useGoldensMock.mockReturnValue(emptyGoldens());
});

describe("GoldenAnswersPage", () => {
  it("renders selectors and the empty list state", () => {
    render(<GoldenAnswersPage />);
    expect(screen.getByLabelText(/document/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/extraction profile/i)).toBeInTheDocument();
    expect(screen.getByText(/no golden answers yet/i)).toBeInTheDocument();
  });

  it("validates the JSON against the selected profile schema", () => {
    render(<GoldenAnswersPage />);
    fireEvent.change(screen.getByLabelText(/document/i), { target: { value: "doc-1" } });
    fireEvent.change(screen.getByLabelText(/extraction profile/i), { target: { value: "p-1" } });
    fireEvent.change(screen.getByLabelText(/golden json/i), {
      target: { value: '{"document_number":42}' },
    });
    expect(screen.getByRole("status").textContent).toMatch(/schema errors/i);
  });

  it("creates a golden when JSON is valid", async () => {
    const create = vi.fn(() => Promise.resolve(golden));
    useGoldensMock.mockReturnValue({ ...emptyGoldens(), create });
    render(<GoldenAnswersPage />);
    fireEvent.change(screen.getByLabelText(/document/i), { target: { value: "doc-1" } });
    fireEvent.change(screen.getByLabelText(/extraction profile/i), { target: { value: "p-1" } });
    fireEvent.change(screen.getByLabelText(/golden json/i), {
      target: { value: '{"document_number":"0004131999"}' },
    });
    fireEvent.click(screen.getByRole("button", { name: /save golden answer/i }));
    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith({
      documentId: "doc-1",
      profileId: "p-1",
      json: { document_number: "0004131999" },
    });
  });

  it("lists existing goldens with version chips", () => {
    useGoldensMock.mockReturnValue({ ...emptyGoldens(), goldens: [golden], activeId: "g-1" });
    render(<GoldenAnswersPage />);
    expect(screen.getAllByText(/^v1$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/sha h/)).toBeInTheDocument();
  });
});
