import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProvidersPage } from "./ProvidersPage";
import { useProviderConfigs, type UseProviderConfigsResult } from "../providers/useProviderConfigs";
import { clearApiKey, getApiKey } from "../providers/keys";
import { geminiAdapter } from "../providers/gemini";
import type { ProviderConfig } from "../storage/types";

vi.mock("../providers/useProviderConfigs", () => ({ useProviderConfigs: vi.fn() }));
vi.mock("../providers/gemini", () => ({
  geminiAdapter: {
    kind: "gemini",
    capabilities: vi.fn(() => ({ nativePdf: true, imageInput: true, structuredOutput: true, tokenUsage: true, providerReportedCost: false, temperature: true, thinking: true })),
    testConnection: vi.fn(),
    extract: vi.fn(),
  },
}));

const useProviderConfigsMock = vi.mocked(useProviderConfigs);

function emptyResult(): UseProviderConfigsResult {
  return {
    configs: [],
    loading: false,
    error: null,
    refresh: vi.fn(() => Promise.resolve()),
    save: vi.fn((input) => Promise.resolve({ ...input, id: "new-1" } as ProviderConfig)),
    remove: vi.fn(() => Promise.resolve()),
  };
}

beforeEach(() => {
  useProviderConfigsMock.mockReturnValue(emptyResult());
  clearApiKey("new-1");
  clearApiKey("cfg-1");
});

describe("ProvidersPage", () => {
  it("renders three provider cards with the BYOK warning", () => {
    render(<ProvidersPage />);
    expect(screen.getByRole("heading", { name: /^openai$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^gemini$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /custom openai-compatible/i })).toBeInTheDocument();
    expect(screen.getByText(/limited\/test key/i)).toBeInTheDocument();
  });

  it("saves a config and keeps the key in the tab only", async () => {
    render(<ProvidersPage />);
    // 第二张卡片是 Gemini
    const modelInputs = screen.getAllByLabelText(/model/i);
    fireEvent.change(modelInputs[1]!, { target: { value: "gemini-3-flash-lite" } });
    const keyInputs = screen.getAllByLabelText(/api key/i);
    fireEvent.change(keyInputs[1]!, { target: { value: "AIza-xyz" } });
    const saveButtons = screen.getAllByRole("button", { name: /save config/i });
    fireEvent.click(saveButtons[1]!);

    await vi.waitFor(() => expect(getApiKey("new-1")).toBe("AIza-xyz"));
  });

  it("runs a connection test through the adapter", async () => {
    const testConnection = vi.mocked(geminiAdapter.testConnection).mockResolvedValue({
      ok: true,
      message: "Gemini reachable; model and API key accepted.",
    });
    render(<ProvidersPage />);
    const keyInputs = screen.getAllByLabelText(/api key/i);
    fireEvent.change(keyInputs[1]!, { target: { value: "AIza-xyz" } });
    const testButtons = screen.getAllByRole("button", { name: /test connection/i });
    fireEvent.click(testButtons[1]!);

    await vi.waitFor(() => expect(testConnection).toHaveBeenCalled());
    expect((await screen.findAllByText(/gemini reachable/i)).length).toBeGreaterThan(0);
  });

  it("asks for a key before testing", async () => {
    render(<ProvidersPage />);
    const testButtons = screen.getAllByRole("button", { name: /test connection/i });
    fireEvent.click(testButtons[0]!);
    await vi.waitFor(() => expect(screen.getAllByText(/enter an api key first/i).length).toBeGreaterThan(0));
  });
});
