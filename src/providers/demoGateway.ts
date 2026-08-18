/** Public demo endpoint preset. It intentionally contains no credential. */
import type { ProviderConfig } from "../storage/types";
import type { NormalizedExtractionRequest, NormalizedExtractionResponse, ProviderError } from "./types";
import { DEMO_GOLDEN, NEXABYTE_GOLDEN } from "../demo/fixture";

export const DEMO_GATEWAY_BASE_URL = "https://gpt.yapweijun1996.com/v1";
export const DEMO_GATEWAY_MODEL = "gpt-5.4-mini";

/**
 * The bundled demo must be runnable by every user of the static PWA. It is
 * deliberately a local, deterministic fixture and never contains a gateway
 * credential. A real gateway remains available through a separately saved
 * custom provider configuration.
 */
export const DEMO_GATEWAY_SETTINGS = { apiStyle: "responses", demoMode: true } as const;

export function isDemoGatewayConfig(config: Pick<ProviderConfig, "id" | "settings">): boolean {
  return config.settings.demoMode === true || config.id === "demo-provider-gpt-gateway";
}

export function runOfflineDemoGateway(request: NormalizedExtractionRequest): NormalizedExtractionResponse {
  const json = request.documentName === "popular-po-demo.pdf" ? DEMO_GOLDEN : request.documentName === "nexabyte-purchase-order.pdf" ? NEXABYTE_GOLDEN : undefined;
  if (json === undefined) {
    throw {
      category: "unsupported",
      message: "The offline demo provider only supports the bundled purchase-order PDFs. Choose a real provider for your own document.",
      retryable: false,
    } satisfies ProviderError;
  }

  return {
    raw: JSON.stringify(json, null, 2),
    json,
    providerCalls: 0,
  };
}
