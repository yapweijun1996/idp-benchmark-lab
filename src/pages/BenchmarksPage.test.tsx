import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BenchmarksPage } from "./BenchmarksPage";
import { RunFailure } from "../benchmarks/singleRun";
import { useDocuments, type UseDocumentsResult } from "../documents/useDocuments";
import { useProfiles, type UseProfilesResult } from "../profiles/useProfiles";
import { useProviderConfigs, type UseProviderConfigsResult } from "../providers/useProviderConfigs";
import { useGoldens, type UseGoldensResult } from "../golden/useGoldens";
import { useRunHistory } from "../benchmarks/useRunHistory";
import { adapterFor } from "../providers/registry";
import type { DocumentRecord, ExtractionProfile, ProviderConfig } from "../storage/types";

vi.mock("../documents/useDocuments", () => ({ useDocuments: vi.fn() }));
vi.mock("../profiles/useProfiles", () => ({ useProfiles: vi.fn() }));
vi.mock("../providers/useProviderConfigs", () => ({ useProviderConfigs: vi.fn() }));
vi.mock("../golden/useGoldens", () => ({ useGoldens: vi.fn() }));
vi.mock("../benchmarks/useRunHistory", () => ({ useRunHistory: vi.fn() }));
vi.mock("../providers/registry", () => ({ adapterFor: vi.fn() }));

const useDocumentsMock = vi.mocked(useDocuments);
const useProfilesMock = vi.mocked(useProfiles);
const useProviderConfigsMock = vi.mocked(useProviderConfigs);
const useGoldensMock = vi.mocked(useGoldens);
const useRunHistoryMock = vi.mocked(useRunHistory);

const document: DocumentRecord = {
  id: "doc-1",
  name: "po.pdf",
  mimeType: "application/pdf",
  size: 10,
  sha256: "d",
  createdAt: "2026-08-15T00:00:00.000Z",
  storageMode: "session",
};
const profile: ExtractionProfile = {
  id: "p-1",
  name: "PO",
  version: 1,
  basePrompt: "x",
  extractionContract: {},
  jsonSchema: {},
  promptSha256: "p",
  schemaSha256: "s",
  createdAt: "2026-08-15T00:00:00.000Z",
  updatedAt: "2026-08-15T00:00:00.000Z",
};
const config: ProviderConfig = { id: "c-1", kind: "gemini", name: "Gemini", model: "gemini-3-flash-lite", settings: {} };

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
function emptyProviders(): UseProviderConfigsResult {
  return {
    configs: [config],
    loading: false,
    error: null,
    refresh: vi.fn(() => Promise.resolve()),
    save: vi.fn(() => Promise.resolve(config)),
    remove: vi.fn(() => Promise.resolve()),
  };
}
function emptyGoldens(): UseGoldensResult {
  return {
    goldens: [],
    activeId: undefined,
    loading: false,
    error: null,
    refresh: vi.fn(() => Promise.resolve()),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(() => Promise.resolve()),
    select: vi.fn(),
  };
}

beforeEach(() => {
  vi.mocked(adapterFor).mockReturnValue({
    kind: "gemini",
    capabilities: () => ({
      nativePdf: true,
      imageInput: true,
      structuredOutput: true,
      tokenUsage: true,
      providerReportedCost: false,
      temperature: true,
      thinking: true,
    }),
    testConnection: async () => ({ ok: true, message: "ok" }),
    extract: async () => {
      throw new Error("not used");
    },
  } as never);
  useDocumentsMock.mockReturnValue(emptyDocuments());
  useProfilesMock.mockReturnValue(emptyProfiles());
  useProviderConfigsMock.mockReturnValue(emptyProviders());
  useGoldensMock.mockReturnValue(emptyGoldens());
  useRunHistoryMock.mockReturnValue({ suites: [], loading: false, refresh: vi.fn(() => Promise.resolve()) });
});

function fillForm() {
  fireEvent.change(screen.getByLabelText(/document/i), { target: { value: "doc-1" } });
  fireEvent.change(screen.getByLabelText(/extraction profile/i), { target: { value: "p-1" } });
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: "c-1" } });
}

describe("BenchmarksPage", () => {
  it("renders the single-run form", () => {
    render(<BenchmarksPage />);
    expect(screen.getByLabelText(/document/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/extraction profile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/provider/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run single extraction/i })).toBeInTheDocument();
  });

  it("requires document, profile, and provider", async () => {
    render(<BenchmarksPage />);
    fireEvent.click(screen.getByRole("button", { name: /run single extraction/i }));
    await vi.waitFor(() =>
      expect(screen.getByText(/select a document, profile, and provider/i)).toBeInTheDocument(),
    );
  });

  it("shows run evidence after a successful run", async () => {
    const runMock = vi.fn(() =>
      Promise.resolve({
        suite: { id: "s-1", status: "completed" },
        run: {
          id: "r-1",
          state: "succeeded",
          schemaValid: true,
          latencyMs: 123,
          costUsd: 0.0001,
          providerCalls: 1,
          usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
          safeRawResponse: '{"document_number":"0004131999"}',
          parsedJson: { document_number: "0004131999" },
          outputHash: "abcdef1234567890",
        },
        response: { raw: "x", json: {}, providerCalls: 1 },
      } as unknown as import("../benchmarks/singleRun").SingleRunResult),
    );
    render(<BenchmarksPage singleRunFactory={() => ({ run: runMock })} />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /run single extraction/i }));

    await vi.waitFor(() => expect(runMock).toHaveBeenCalled());
    expect(await screen.findByText(/succeeded/)).toBeInTheDocument();
    expect(screen.getByText(/latency 123 ms/)).toBeInTheDocument();
    expect(screen.getByText(/cost \$0\.000100/)).toBeInTheDocument();
    expect(screen.getAllByText(/0004131999/).length).toBeGreaterThan(0);
  });

  it("blocks submission for incompatible provider/mode combinations", async () => {
    vi.mocked(adapterFor).mockReturnValue({
      kind: "openai",
      capabilities: () => ({
        nativePdf: false,
        imageInput: true,
        structuredOutput: true,
        tokenUsage: true,
        providerReportedCost: false,
        temperature: true,
        thinking: false,
      }),
      testConnection: async () => ({ ok: true, message: "ok" }),
      extract: async () => {
        throw new Error("not used");
      },
    } as never);
    const openaiConfig: ProviderConfig = { ...config, id: "c-openai", kind: "openai", name: "OpenAI" };
    useProviderConfigsMock.mockReturnValue({ ...emptyProviders(), configs: [openaiConfig] });
    render(<BenchmarksPage />);
    fireEvent.change(screen.getByLabelText(/document/i), { target: { value: "doc-1" } });
    fireEvent.change(screen.getByLabelText(/extraction profile/i), { target: { value: "p-1" } });
    fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: "c-openai" } });
    // 默认 native_pdf 与 OpenAI 不兼容：按钮禁用且展示原因
    const button = screen.getByRole("button", { name: /run single extraction/i });
    expect(button).toBeDisabled();
    expect(screen.getAllByText(/配置不兼容.*canonical images/i).length).toBeGreaterThan(0);
  });

  it("shows normalized failures", async () => {
    const runMock = vi.fn(() =>
      Promise.reject(new RunFailure({ category: "rate_limit", message: "rate limit", retryable: true })),
    );
    render(<BenchmarksPage singleRunFactory={() => ({ run: runMock })} />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /run single extraction/i }));

    await vi.waitFor(() => expect(screen.getByText(/rate_limit: rate limit/)).toBeInTheDocument());
  });
});
