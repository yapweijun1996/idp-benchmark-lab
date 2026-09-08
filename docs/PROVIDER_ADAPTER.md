# Provider Adapter Contract

Adapters own HTTP request/response translation only. Malformed extraction JSON returns parseError with raw/envelope/usage; HTTP errors retain evidence. The execution layer redacts before hashing, evaluation or persistence.

Adapter owns endpoint/request/auth format, PDF/image mapping, structured-output dialect, provider settings, response parsing, usage parsing, and provider error normalization.

Adapter does not own Golden comparison, benchmark scheduling, cost policy, canonical hashing, or UI metrics.

## Current adapters

| Provider | Endpoint/request style | Accepted input | Structured JSON request | Current reasoning control |
|---|---|---|---|---|
| OpenAI | `/v1/chat/completions` | canonical page images only | `response_format: { type: "json_object" }` | request `thinking` maps to `reasoning_effort` |
| Gemini | `v1beta/models/{model}:generateContent` | native PDF or canonical page images | `responseMimeType: "application/json"` | request `thinking` maps to `thinkingConfig.thinkingLevel` |
| Custom OpenAI-compatible | configured base URL with `chat/completions` or `responses` | canonical page images only | JSON-object mode for chat completions unless disabled; no translated JSON Schema | Responses style maps `thinking` to `reasoning.effort`; chat style currently does not |

All three return a normalized raw string, parsed JSON when available, optional token usage, and provider-call count. Malformed or failed responses retain a redacted envelope for the execution layer to persist. They do not send a provider-native translated JSON Schema: the extraction contract is carried in the prompt and validation is local. Capability overrides exist in Custom provider settings but are not exposed as a complete user-facing configuration surface. Custom currently declares `thinking: false`; nevertheless its Responses request path forwards a supplied per-run value, while its Chat Completions path ignores it. The UI/capability contract must be reconciled before advertising Custom reasoning support.

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
records. Dedicated API keys and all custom header values are entered at runtime and stored separately in the ephemeral credential store.

Runtime custom headers are applied after generated Authorization and can override it. All values live in the ephemeral credential store; persistent settings retain an empty customHeaders object.
