# PROVIDERS — Multi-Provider Design

## Current implementation status

The provider boundary is implemented, but production acceptance is **NO-GO**. All requests are sent directly from the browser; no application proxy or built-in demo gateway exists. Provider/model availability and CORS from the deployed Pages origin remain unverified. Credential and pricing defects are tracked in TASK-058/064/068.

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

The current UI does not expose capability overrides or a pricing editor. The adapter accepts canonical images only in its extraction path even though settings can contain capability overrides; do not advertise native-PDF compatibility without implementing and testing it.

The dedicated API key is memory-only by default, with optional `sessionStorage` for the current tab. However, arbitrary `settings.customHeaders` are persisted in IndexedDB and copied to backups, can override `Authorization`, and are not recursively rejected on import. Raw/parsed provider content and error text are also not credential-redacted at the evidence boundary. Do not put secrets in custom headers or treat current exports as secret-free; TASK-058 must move secret headers to ephemeral storage, redact evidence, and clear ephemeral keys when providers/local data are removed.

## LM Studio/local endpoints

GitHub Pages can call a local/custom endpoint only if browser networking and CORS permit it. Show explicit CORS/network diagnostics. Never use an untrusted public proxy to bypass CORS.

## Pricing

Pricing is configuration, not provider logic. `ProviderConfig.pricingSnapshotId` and pricing records exist, but the Settings UI does not manage them reliably, saving a provider can drop an existing association, and execution resolves pricing again for each response. The suite does not retain the applied basis. TASK-064 must preserve provider pricing configuration and freeze a secret-free pricing snapshot at suite creation so later edits affect only future suites.

## Provider acceptance boundary

Mocked adapter tests prove request/response mapping only. Production acceptance additionally requires restricted test credentials, the deployed Pages origin, current provider/model combinations, native/canonical input modes, structured JSON behavior, usage capture, error handling, and CORS to be recorded under TASK-068.
