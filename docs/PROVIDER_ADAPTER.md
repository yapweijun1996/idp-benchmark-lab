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
| Custom OpenAI-compatible (`settings.endpointProfile: "gateway_demo"`) | `POST /demo/v1/responses` on the configured Pages-origin gateway | canonical PNG/JPEG/WebP page images, at most four per request | gateway strict JSON object contract; AJV remains the final local validator | streamed Responses SSE with `store:false`; default low effort, per-run override from the wizard |

All three return a normalized raw string, parsed JSON when available, optional token usage, and provider-call count. Malformed or failed responses retain a redacted envelope for the execution layer to persist. They do not send a provider-native translated JSON Schema: the extraction contract is carried in the prompt and validation is local. Capability overrides exist in Custom provider settings but are not exposed as a complete user-facing configuration surface. Generic Custom currently declares `thinking: false`; its Responses request path forwards a supplied per-run value, while its Chat Completions path ignores it. The Gateway Demo endpoint profile is the explicit exception and validates the documented `minimal`/`low`/`medium`/`high`/`xhigh` reasoning values.

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
  requestGate?: {
    beforeRequest(meta: { phase: "map" | "reduce"; index: number; total: number; pageFrom?: number; pageTo?: number }): Promise<{ settle(costUsd?: number): void }>;
    afterResponse(lease: { settle(costUsd?: number): void } | undefined, response?: NormalizedExtractionResponse, error?: unknown): { costUsd?: number; costSource: "provider_reported" | "usage_snapshot" | "flat" | "unknown" } | void;
  };
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

## Gateway Demo profile

The browser preset keeps the existing `openai_compatible` adapter boundary and sets
`endpointProfile: "gateway_demo"`, the public gateway origin, `/demo/session`,
`project_id: "github-pages"`, model `demo-fast`, and Responses format. The browser
first obtains a short-lived origin-bound `dmo_…` session; it is held only in the
memory credential store and is never included in provider configuration, snapshots,
IndexedDB, backups, exports, cache storage, or evidence.

If the gateway deployment enables Turnstile, a browser challenge token may be supplied to
the session call through the adapter's optional runtime argument. The static preset does
not persist or bundle a Turnstile credential; the current registered Pages project is
accepted without that challenge.

Canonical pages are packed in original order with a maximum of four images, 4 MiB
per image, 8 MiB total images, and a 12 MiB serialized request body. A document with
more pages uses sequential map requests followed by a text-only model reducer on the
same route. Each map/reduce request invokes the execution Stop and budget gate and
contributes its usage, latency, cost estimate/source, and redacted call evidence.
The per-request accounting is retained with the nested attempt. A failure
after any successful child call is retained as partial evidence and is not replayed by
the adapter. The gateway's session, quota, output-token, and emergency-disable limits
remain authoritative; this profile does not promise unlimited document processing.
The gateway may route the public `demo-fast` alias across eligible healthy providers;
the browser treats that routing as gateway-owned and records the alias plus per-request
usage/evidence.

The extraction prompt normally contains readable, pretty-printed contract and schema
JSON. Before a Gateway Demo image request, the adapter compacts only valid JSON blocks
inside those fences, preserving the instructions and schema while staying below the
gateway's input-token safety bound. If a custom prompt and image still exceed that
bound, the adapter fails with a stable `DEMO_INPUT_TOO_LARGE` message instead of
retrying the request or exposing gateway detail.
