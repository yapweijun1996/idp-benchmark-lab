# PROVIDERS — Multi-Provider Design

## Current implementation status

Provider requests remain direct browser BYOK calls with isolated adapters and no proxy. Local contracts are covered by mocked request/response tests. Real model availability, billing and CORS from the user-published Pages origin remain external acceptance gates.

## MVP provider types

1. OpenAI
2. Gemini
3. Custom OpenAI-compatible

## Adapter rule

Benchmark code must not contain provider API details outside adapters.

```ts
interface ProviderAdapter {
  kind: ProviderKind;
  capabilities(config: ProviderConfig): ProviderCapabilities;
  testConnection(ctx: ProviderContext): Promise<ConnectionResult>;
  extract(request: NormalizedExtractionRequest, ctx: ProviderContext): Promise<NormalizedExtractionResponse>;
}
```

This is the single adapter contract; `docs/PROVIDER_ADAPTER.md` is the canonical reference.

## Capabilities

Track native PDF, image input, structured output, token usage, provider-reported cost, temperature, and thinking/reasoning support.

UI must hide/disable unsupported controls rather than pretending feature parity.

The current UI exposes editable model IDs, provider connection tests, OpenAI reasoning effort, Gemini thinking level, and the Custom endpoint/API style. New OpenAI and Gemini forms currently start with `gpt-5.4-mini` and `gemini-3.5-flash-lite`, respectively. Defaults and model lists are editable suggestions, not an authoritative compatibility registry; provider contracts can change independently of this repository.

## OpenAI

The adapter calls `POST /v1/chat/completions`, sends canonical rendered page images, requests `json_object`, and normalizes token usage. Native PDF is not supported by this adapter. A configured or per-run reasoning value maps to `reasoning_effort`; actual support depends on the selected model.

## Gemini

The adapter calls `generateContent`, supports native PDF and canonical images, requests JSON MIME output, and normalizes token usage. A configured or per-run thinking value maps to `generationConfig.thinkingConfig.thinkingLevel`; actual support depends on the selected model.

## Custom OpenAI-compatible

Implemented config:
- base URL
- API key
- model
- optional custom headers
- `chat_completions` or `responses` API style
- internal capability overrides when already present in settings

The current UI exposes a dated pricing editor but not all capability overrides. Custom extraction uses canonical images; do not advertise native PDF support from a capability flag alone.

Keys default to memory with optional tab storage. All arbitrary custom headers are memory-only and may override the generated Authorization header. Persistent configuration contains no header values; recursive redaction protects raw/parsed/error evidence and exports.

## LM Studio/local endpoints

GitHub Pages can call a local/custom endpoint only if browser networking and CORS permit it. Show explicit CORS/network diagnostics. Never use an untrusted public proxy to bypass CORS.

## Pricing

Pricing is configuration owned by the cost module. Provider edits preserve matching pricing associations; changing model clears the association. The pricing editor creates fresh records, and suite snapshots preserve the applied values. See [cost rules](docs/COST_AND_PRICING.md).

## Provider acceptance boundary

Mocked adapter tests prove request/response mapping only. Production acceptance additionally requires restricted test credentials, the deployed Pages origin, current provider/model combinations, native/canonical input modes, structured JSON behavior, usage capture, error handling, and CORS to be recorded under TASK-068.
