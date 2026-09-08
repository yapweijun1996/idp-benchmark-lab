import { openaiAdapter } from "./openai";
import { geminiAdapter } from "./gemini";
import { customAdapter } from "./openai-compatible";
import type { ProviderAdapter, ProviderKind } from "./types";
import type { ProviderConfig } from "./types";

export function effectiveProviderConfig(config: ProviderConfig): ProviderConfig {
  return { ...config, baseUrl: config.kind === "openai" ? "https://api.openai.com/v1" : config.kind === "gemini" ? "https://generativelanguage.googleapis.com/v1beta" : config.baseUrl?.replace(/\/+$/, "") };
}

const ADAPTERS: Record<ProviderKind, ProviderAdapter> = {
  openai: openaiAdapter,
  gemini: geminiAdapter,
  openai_compatible: customAdapter,
};

export function adapterFor(kind: ProviderKind): ProviderAdapter {
  return ADAPTERS[kind];
}

export const ALL_ADAPTERS: readonly ProviderAdapter[] = [openaiAdapter, geminiAdapter, customAdapter];
