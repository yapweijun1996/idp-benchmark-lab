import { describe, expect, it } from "vitest";
import { checkModeSupport } from "./capabilityGate";
import type { ProviderAdapter } from "./types";
import type { ProviderConfig } from "../storage/types";

const adapter: ProviderAdapter = {
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
};

const config: ProviderConfig = { id: "c-1", kind: "openai", name: "OpenAI", model: "gpt-4o-mini", settings: {} };

describe("checkModeSupport", () => {
  it("rejects native PDF when the adapter lacks nativePdf", () => {
    const result = checkModeSupport(adapter, config, "native_pdf");
    expect(result.supported).toBe(false);
    expect(result.reason).toMatch(/canonical images/i);
  });

  it("accepts canonical images when imageInput is available", () => {
    expect(checkModeSupport(adapter, config, "canonical_images")).toEqual({ supported: true });
  });

  it("rejects canonical images when imageInput is disabled", () => {
    const noImages: ProviderAdapter = {
      ...adapter,
      capabilities: () => ({
        nativePdf: true,
        imageInput: false,
        structuredOutput: true,
        tokenUsage: true,
        providerReportedCost: false,
        temperature: true,
        thinking: false,
      }),
    };
    const result = checkModeSupport(noImages, config, "canonical_images");
    expect(result.supported).toBe(false);
    expect(result.reason).toMatch(/native pdf/i);
  });

  it("accepts native PDF for nativePdf-capable adapters", () => {
    const nativeAdapter: ProviderAdapter = {
      ...adapter,
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
    };
    expect(checkModeSupport(nativeAdapter, { ...config, kind: "gemini" }, "native_pdf").supported).toBe(true);
  });
});
