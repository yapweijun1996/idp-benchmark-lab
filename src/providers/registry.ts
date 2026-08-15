import { openaiAdapter } from "./openai";
import { geminiAdapter } from "./gemini";
import { customAdapter } from "./openai-compatible";
import type { ProviderAdapter, ProviderKind } from "./types";

const ADAPTERS: Record<ProviderKind, ProviderAdapter> = {
  openai: openaiAdapter,
  gemini: geminiAdapter,
  openai_compatible: customAdapter,
};

export function adapterFor(kind: ProviderKind): ProviderAdapter {
  return ADAPTERS[kind];
}

export const ALL_ADAPTERS: readonly ProviderAdapter[] = [openaiAdapter, geminiAdapter, customAdapter];
