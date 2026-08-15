# PROVIDERS — Multi-Provider Design

## MVP provider types

1. OpenAI
2. Gemini
3. Custom OpenAI-compatible

## Adapter rule

Benchmark code must not contain provider API details outside adapters.

```ts
interface ProviderAdapter {
  kind: string;
  getCapabilities(config: ProviderConfig): ProviderCapabilities;
  testConnection(ctx: ProviderContext): Promise<ConnectionResult>;
  runExtraction(request: NormalizedExtractionRequest, ctx: ProviderContext): Promise<NormalizedExtractionResponse>;
}
```

## Capabilities

Track native PDF, image input, structured output, token usage, provider-reported cost, temperature, and thinking/reasoning support.

UI must hide/disable unsupported controls rather than pretending feature parity.

## OpenAI

At implementation time, follow current official API/model contracts. Support the appropriate document/image path, structured JSON where available, usage capture, and secret redaction.

## Gemini

At implementation time, follow current official API/model contracts. Support native PDF and image mode where available, structured output, usage normalization, and thinking-level recording.

## Custom OpenAI-compatible

MVP config:
- base URL
- API key
- model
- optional custom headers
- capability flags
- pricing

Must clearly report unsupported features.

## LM Studio/local endpoints

GitHub Pages can call a local/custom endpoint only if browser networking and CORS permit it. Show explicit CORS/network diagnostics. Never use an untrusted public proxy to bypass CORS.

## Pricing

Pricing is configuration, not provider logic. Save a pricing snapshot with each benchmark and do not silently reprice historical runs.
