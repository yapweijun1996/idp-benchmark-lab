import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewBenchmarkWizard } from "./NewBenchmarkWizard";
import { RunFailure } from "../benchmarks/singleRun";
import { useDocuments, type UseDocumentsResult } from "../documents/useDocuments";
import { useProfiles, type UseProfilesResult } from "../profiles/useProfiles";
import { useProviderConfigs, type UseProviderConfigsResult } from "../providers/useProviderConfigs";
import { useGoldens, type UseGoldensResult } from "../golden/useGoldens";
import { adapterFor } from "../providers/registry";
import type { DocumentRecord, ExtractionProfile, ProviderConfig } from "../storage/types";

vi.mock("../documents/useDocuments", () => ({ useDocuments: vi.fn() }));
vi.mock("../profiles/useProfiles", () => ({ useProfiles: vi.fn() }));
vi.mock("../providers/useProviderConfigs", () => ({ useProviderConfigs: vi.fn() }));
vi.mock("../golden/useGoldens", () => ({ useGoldens: vi.fn() }));
vi.mock("../providers/registry", () => ({ adapterFor: vi.fn() }));

const useDocumentsMock = vi.mocked(useDocuments);
const useProfilesMock = vi.mocked(useProfiles);
const useProviderConfigsMock = vi.mocked(useProviderConfigs);
const useGoldensMock = vi.mocked(useGoldens);

const document: DocumentRecord = {
  id: "doc-1",
  name: "po.pdf",
  mimeType: "application/pdf",
  size: 10240,
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

function docsResult(): UseDocumentsResult {
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
function profilesResult(): UseProfilesResult {
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
function providersResult(configs: ProviderConfig[] = [config]): UseProviderConfigsResult {
  return {
    configs,
    loading: false,
    error: null,
    refresh: vi.fn(() => Promise.resolve()),
    save: vi.fn(() => Promise.resolve(config)),
    remove: vi.fn(() => Promise.resolve()),
  };
}
function goldensResult(): UseGoldensResult {
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

const geminiAdapter = {
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
};

beforeEach(() => {
  vi.mocked(adapterFor).mockReturnValue(geminiAdapter as never);
  useDocumentsMock.mockReturnValue(docsResult());
  useProfilesMock.mockReturnValue(profilesResult());
  useProviderConfigsMock.mockReturnValue(providersResult());
  useGoldensMock.mockReturnValue(goldensResult());
});

/** Drives the wizard from step 0 through step 3 (Choose AI), selecting the fixture doc/template/provider. */
function advanceToRunSettings() {
  fireEvent.click(screen.getByRole("radio", { name: /po\.pdf/i }));
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));

  fireEvent.click(screen.getByRole("radio", { name: /PO \(v1\)/i }));
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));

  // Expected Result step is optional — just continue.
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));

  fireEvent.click(screen.getByRole("radio", { name: /gemini/i }));
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
}

function advanceToReview() {
  advanceToRunSettings();
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
}

describe("NewBenchmarkWizard", () => {
  it("renders the first step with document choices", () => {
    render(<NewBenchmarkWizard />);
    expect(screen.getByRole("heading", { name: /choose a document to test/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /po\.pdf/i })).toBeInTheDocument();
  });

  it("cannot continue or jump ahead without a document, template, or provider", () => {
    render(<NewBenchmarkWizard />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    // Stepper buttons past the current one are disabled until their prerequisite is met.
    expect(screen.getByRole("button", { name: /what to extract/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /choose ai/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /po\.pdf/i }));
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });

  it("preserves selections when navigating back and forward", () => {
    render(<NewBenchmarkWizard />);
    fireEvent.click(screen.getByRole("radio", { name: /po\.pdf/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("heading", { name: /what should the ai extract/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("heading", { name: /choose a document to test/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /po\.pdf/i })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("heading", { name: /what should the ai extract/i })).toBeInTheDocument();
  });

  it("reaches Review & Run and shows evidence after a successful Quick Test", async () => {
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
    render(<NewBenchmarkWizard singleRunFactory={() => ({ run: runMock })} />);
    advanceToReview();

    expect(screen.getByRole("heading", { name: /ready to benchmark/i })).toBeInTheDocument();
    expect(screen.getByText(/po\.pdf/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /run quick test/i }));
    await vi.waitFor(() => expect(runMock).toHaveBeenCalled());
    expect(await screen.findByText(/succeeded/)).toBeInTheDocument();
    expect(screen.getByText(/latency 123 ms/)).toBeInTheDocument();
    expect(screen.getAllByText(/0004131999/).length).toBeGreaterThan(0);
    expect(screen.getByText(/✓ quick test completed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run again/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view this run in runs & results/i })).toHaveAttribute("href", "#/runs");
  });

  it("blocks Quick Test for incompatible provider/mode combinations", () => {
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
    useProviderConfigsMock.mockReturnValue(providersResult([openaiConfig]));

    render(<NewBenchmarkWizard />);
    fireEvent.click(screen.getByRole("radio", { name: /po\.pdf/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("radio", { name: /PO \(v1\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i })); // skip expected result
    fireEvent.click(screen.getByRole("radio", { name: /openai/i }));
    // 默认 native_pdf 与 OpenAI 不兼容
    expect(screen.getAllByText(/incompatible configuration.*render pages as images/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i })); // run settings -> review

    expect(screen.getByRole("button", { name: /run quick test/i })).toBeDisabled();
    expect(screen.getAllByText(/incompatible configuration.*render pages as images/i).length).toBeGreaterThan(0);
  });

  it("shows normalized failures from a failed Quick Test", async () => {
    const runMock = vi.fn(() =>
      Promise.reject(new RunFailure({ category: "rate_limit", message: "rate limit", retryable: true })),
    );
    render(<NewBenchmarkWizard singleRunFactory={() => ({ run: runMock })} />);
    advanceToReview();
    fireEvent.click(screen.getByRole("button", { name: /run quick test/i }));

    await vi.waitFor(() => expect(screen.getByText(/rate_limit: rate limit/)).toBeInTheDocument());
  });
});
