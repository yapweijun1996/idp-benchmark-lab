# Provider Adapter Contract

This describes the required adapter boundary. Current malformed-output handling throws a generic provider error before returning raw text/usage; failed evidence preservation needs TASK-063. Credential-safe persistence is also incomplete (TASK-058). See the [review](reviews/2026-09-08-production-readiness.md).

Adapter owns endpoint/request/auth format, PDF/image mapping, structured-output dialect, provider settings, response parsing, usage parsing, and provider error normalization.

Adapter does not own Golden comparison, benchmark scheduling, cost policy, canonical hashing, or UI metrics.

## Current adapters

| Provider | Endpoint/request style | Accepted input | Structured JSON request | Current reasoning control |
|---|---|---|---|---|
| OpenAI | `/v1/chat/completions` | canonical page images only | `response_format: { type: "json_object" }` | request `thinking` maps to `reasoning_effort` |
| Gemini | `v1beta/models/{model}:generateContent` | native PDF or canonical page images | `responseMimeType: "application/json"` | request `thinking` maps to `thinkingConfig.thinkingLevel` |
| Custom OpenAI-compatible | configured base URL with `chat/completions` or `responses` | canonical page images only | JSON-object mode for chat completions unless disabled; no translated JSON Schema | Responses style maps `thinking` to `reasoning.effort`; chat style currently does not |

All three return a normalized raw string, parsed JSON, optional token usage, and provider-call count on success. They do not send a provider-native translated JSON Schema: the extraction contract is carried in the prompt and validation is local. Capability overrides exist in Custom provider settings but are not exposed as a complete user-facing configuration surface. Custom currently declares `thinking: false`; nevertheless its Responses request path forwards a supplied per-run value, while its Chat Completions path ignores it. The UI/capability contract must be reconciled before advertising Custom reasoning support.

Suggested interface:

```ts
interface ProviderAdapter {
  kind: ProviderKind;
  capabilities(config: ProviderConfig): ProviderCapabilities;
  testConnection(ctx: ProviderContext): Promise<ConnectionResult>;
  extract(request: NormalizedExtractionRequest, ctx: ProviderContext): Promise<NormalizedExtractionResponse>;
}
```

Supporting types:

```ts
type ProviderKind = "openai" | "gemini" | "openai_compatible";

type ProviderContext = {
  config: ProviderConfig;
  apiKey: string; // memory-only; never persisted, logged, cached, or exported
  signal?: AbortSignal;
};
```

Normalized errors:

```ts
type ProviderError = {
  category: "auth" | "rate_limit" | "network" | "cors" | "invalid_request" | "unsupported" | "provider" | "unknown";
  message: string;
  status?: number;
  retryable: boolean;
};
```

Runner decides retry policy. Adapter must not retry indefinitely.

The Custom OpenAI-compatible adapter supports both `chat_completions` and
`responses` request styles. Custom endpoints are configured as regular provider
records. The dedicated API key is entered at runtime and stored separately. However, custom auth headers currently remain inside persisted/exported settings; they must be separated into ephemeral credential storage before this contract's non-persistence guarantee holds.

`settings.customHeaders` are applied after the generated bearer header and can therefore replace `Authorization`. Until TASK-058 is complete, use that field only for non-secret headers and do not treat provider records or backups as credential-safe.
