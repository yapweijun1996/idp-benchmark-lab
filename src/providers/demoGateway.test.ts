import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireGatewayDemoSession,
  compactGatewayPrompt,
  extractGatewayDemo,
  forgetGatewayDemoSession,
  gatewayDemoMessageKey,
  gatewayDemoDefaults,
  gatewayDemoSession,
  planGatewayImageBatches,
  rememberGatewayDemoSession,
  testGatewayDemoConnection,
} from "./demoGateway";
import { clearAllKeys, getApiKey } from "./keys";
import type { GatewayRequestMeta, ProviderContext } from "./types";
import type { ProviderConfig } from "../storage/types";
import { AttemptBudget } from "../benchmarks/budget";
import { composePrompt } from "../profiles/composePrompt";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const image = { mimeType: "image/png" as const, dataUrl: png };

function streamResponse(text: string, status = 200): Response {
  return new Response(text, { status, headers: { "Content-Type": "text/event-stream", "Access-Control-Allow-Origin": "https://yapweijun1996.github.io" } });
}

function sse(value: unknown, usage = { input_tokens: 2, output_tokens: 1, total_tokens: 3 }): string {
  const json = JSON.stringify(value);
  return [
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: json })}`,
    `data: ${JSON.stringify({ type: "response.completed", response: { usage } })}`,
    "data: [DONE]",
    "",
  ].join("\n\n");
}

const config: ProviderConfig = {
  id: "demo-config",
  kind: "openai_compatible",
  name: "Gateway Demo",
  baseUrl: "https://gpt.yapweijun1996.com/demo/v1",
  model: "demo-fast",
  settings: { endpointProfile: "gateway_demo", gatewayOrigin: "https://gpt.yapweijun1996.com" },
};

function ctx(gate?: ProviderContext["requestGate"], apiKey = "dmo_test_session"): ProviderContext {
  return { config, apiKey, requestGate: gate };
}

describe("Gateway Demo contract", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    rememberGatewayDemoSession(config.id, { token: "dmo_test_session", expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
  });
  afterEach(() => {
    clearAllKeys();
    forgetGatewayDemoSession(config.id);
    vi.unstubAllGlobals();
  });

  it("uses the configured public defaults and packs pages into groups of four", () => {
    expect(gatewayDemoDefaults()).toMatchObject({ model: "demo-fast", projectId: "github-pages", sessionPath: "/demo/session" });
    const batches = planGatewayImageBatches([image, image, image, image, image], "Extract JSON.");
    expect(batches.map((batch) => batch.images.length)).toEqual([4, 1]);
    expect(batches.map((batch) => [batch.pageFrom, batch.pageTo])).toEqual([[1, 4], [5, 5]]);
  });

  it("compacts pretty JSON prompt blocks before image requests", () => {
    const prompt = [
      "Read only the printed page.",
      "OUTPUT JSON SCHEMA:",
      "```json",
      JSON.stringify({ type: "object", properties: { total: { type: ["string", "null"] } } }, null, 2),
      "```",
    ].join("\n");
    const compact = compactGatewayPrompt(prompt);
    expect(compact).toContain('```json\n{"type":"object","properties":{"total":{"type":["string","null"]}}}\n```');
    expect(compact.length).toBeLessThan(prompt.length);
    expect(compactGatewayPrompt("```json\nnot JSON\n```")).toContain("not JSON");
  });

  it("sends the compacted prompt with the Gateway Demo image map request", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(streamResponse(sse({ ok: true })));
    const prompt = composePrompt("Extract the printed total.", ["total"], {
      type: "object",
      properties: { total: { type: ["string", "null"] } },
      required: ["total"],
      additionalProperties: false,
    });
    await extractGatewayDemo({ mode: "canonical_images", images: [image], prompt }, ctx());
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(init?.body)) as { input: Array<{ content: Array<{ text?: string }> }> };
    expect(body.input[0]?.content[0]?.text).toContain('```json\n{"type":"object","properties":{"total":{"type":["string","null"]}}');
  });

  it("validates the short-lived session response without persisting the token", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ token: "dmo_short_lived", expires_at: new Date(Date.now() + 60_000).toISOString() }), { status: 201 }));
    const session = await acquireGatewayDemoSession();
    expect(session.token).toBe("dmo_short_lived");
    expect(Date.parse(session.expiresAt)).toBeGreaterThan(Date.now());
    expect(JSON.stringify(vi.mocked(fetch).mock.calls)).toContain("project_id");
  });

  it("automatically acquires and stores a session when extraction starts without a token", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "dmo_auto_session" }), { status: 201 }))
      .mockResolvedValueOnce(streamResponse(sse({ ok: true })));
    const result = await extractGatewayDemo({ mode: "canonical_images", images: [image], prompt: "Extract JSON." }, ctx(undefined, ""));
    expect(result.json).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getApiKey(config.id)).toBe("dmo_auto_session");
    expect(gatewayDemoSession(config.id)).toBeDefined();
  });

  it("expires session metadata after fifteen minutes and rejects malformed expiry", () => {
    const configId = "expiry-test";
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    rememberGatewayDemoSession(configId, { token: "dmo_expiry", expiresAt });
    expect(gatewayDemoSession(configId)?.expiresAt).toBe(expiresAt);
    forgetGatewayDemoSession(configId);
    rememberGatewayDemoSession(configId, { token: "dmo_expiry", expiresAt: "not-a-date" });
    expect(gatewayDemoSession(configId)).toBeUndefined();
    forgetGatewayDemoSession(configId);
  });

  it("maps session failures and rejects an image over the gateway limit", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { message: "origin rejected" } }), { status: 403 }));
    await expect(acquireGatewayDemoSession()).rejects.toMatchObject({ category: "auth", status: 403, message: expect.stringMatching(/Origin/i) });
    const oversized = { mimeType: "image/png" as const, dataUrl: `data:image/png;base64,${"A".repeat(5_600_000)}` };
    expect(() => planGatewayImageBatches([oversized], "Extract JSON.")).toThrow(/4 MiB/i);
  });

  it.each([
    [401, "auth", false],
    [429, "rate_limit", true],
    [503, "unsupported", false],
  ] as const)("maps Gateway status %s to %s with retry=%s", async (status, category, retryable) => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { message: "safe detail" } }), { status }));
    await expect(acquireGatewayDemoSession()).rejects.toMatchObject({ category, retryable, status });
  });

  it("maps the latest router error codes without exposing upstream detail", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { code: "DEMO_ROUTER_DISABLED", message: "router disabled" } }), { status: 503 }));
    await expect(acquireGatewayDemoSession()).rejects.toMatchObject({ category: "unsupported", retryable: false, message: "Gateway Demo router is disabled by the gateway." });
    expect(gatewayDemoMessageKey({ status: 503, message: "Gateway Demo router is disabled by the gateway." })).toBe("Gateway Demo router is disabled by the gateway.");
  });

  it("maps the gateway token safety error to a stable localized message key", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { code: "DEMO_INPUT_TOO_LARGE", message: "demo input exceeds the token safety bound" } }), { status: 400 }));
    await expect(acquireGatewayDemoSession()).rejects.toMatchObject({
      category: "invalid_request",
      retryable: false,
      message: "Gateway Demo prompt and image input exceed the gateway token safety bound. Shorten the prompt/schema or reduce rendered image detail.",
    });
    expect(gatewayDemoMessageKey({ status: 400, message: "Gateway Demo prompt and image input exceed the gateway token safety bound. Shorten the prompt/schema or reduce rendered image detail." })).toBe("Gateway Demo prompt and image input exceed the gateway token safety bound. Shorten the prompt/schema or reduce rendered image detail.");
  });

  it("normalizes a model-route network/CORS failure", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "dmo_connection_session" }), { status: 201 }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const result = await testGatewayDemoConnection(ctx(undefined, ""));
    expect(result).toMatchObject({ ok: false, error: { category: "network", retryable: true }, message: expect.stringMatching(/network\/CORS/i) });
  });

  it("omits output-token parameters from the connection probe", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "demo-fast" }] })))
      .mockResolvedValueOnce(streamResponse(sse({ ok: true })));
    expect(await testGatewayDemoConnection(ctx())).toMatchObject({ ok: true });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[1]?.[1]?.body));
    expect(body).not.toHaveProperty("max_output_tokens");
    expect(body).not.toHaveProperty("max_completion_tokens");
    expect(body).not.toHaveProperty("max_tokens");
  });

  it("streams one batch directly and calls two maps plus one reducer for five pages", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(streamResponse(sse({ page: 1 })))
      .mockResolvedValueOnce(streamResponse(sse({ page: 5 })))
      .mockResolvedValueOnce(streamResponse(sse({ merged: true })));
    const before = vi.fn(async (meta: GatewayRequestMeta) => { void meta; return { settle: vi.fn() }; });
    const after = vi.fn(() => ({ costUsd: 0.005, costSource: "usage_snapshot" as const }));
    const result = await extractGatewayDemo({ mode: "canonical_images", images: [image, image, image, image, image], prompt: "Extract JSON." }, ctx({ beforeRequest: before, afterResponse: after }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, init] of fetchMock.mock.calls) {
      const body = JSON.parse(String(init?.body));
      expect(body).not.toHaveProperty("max_output_tokens");
      expect(body).not.toHaveProperty("max_completion_tokens");
      expect(body).not.toHaveProperty("max_tokens");
    }
    expect(before.mock.calls.map(([meta]) => meta.phase)).toEqual(["map", "map", "reduce"]);
    expect(result.json).toEqual({ merged: true });
    expect(result.providerCalls).toBe(3);
    expect(result.providerAttempts).toHaveLength(3);
    expect(result.providerAttempts?.every((attempt) => attempt.costSource === "usage_snapshot" && attempt.costUsd === 0.005)).toBe(true);
    expect(result.usage?.totalTokens).toBe(9);
  });

  it("extracts message text from a completed Responses event without reasoning summaries", async () => {
    const reasoning = { type: "response.reasoning_summary_text.delta", delta: "The answer is straightforward." };
    const completed = {
      type: "response.completed",
      response: {
        output: [
          { type: "reasoning", summary: [{ type: "summary_text", text: "Do not parse this as JSON." }] },
          { type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] },
        ],
        usage: { input_tokens: 2, output_tokens: 1, total_tokens: 3 },
      },
    };
    vi.mocked(fetch).mockResolvedValue(streamResponse([
      `data: ${JSON.stringify(reasoning)}`,
      `data: ${JSON.stringify(completed)}`,
      "data: [DONE]",
      "",
    ].join("\n\n")));
    const result = await extractGatewayDemo({ mode: "canonical_images", images: [image], prompt: "Extract JSON." }, ctx());
    expect(result.json).toEqual({ ok: true });
  });

  it("retains a redacted SSE error envelope", async () => {
    vi.mocked(fetch).mockResolvedValue(streamResponse(`data: ${JSON.stringify({ type: "response.error", error: { message: "expired dmo_test_session" } })}\n\ndata: [DONE]\n\n`));
    await expect(extractGatewayDemo({ mode: "canonical_images", images: [image], prompt: "Extract JSON." }, ctx())).rejects.toMatchObject({ message: expect.stringMatching(/SSE error/i), evidence: { providerAttempts: [{ raw: expect.stringContaining("[REDACTED]") }] } });
  });

  it.each([true, false])("retains truncated output and usage without retrying (stream=%s)", async (stream) => {
    const output = '{"reference":"dmo_test_session","rows":[';
    const response = {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [{ type: "message", content: [{ type: "output_text", text: output }] }],
      usage: { input_tokens: 3555, output_tokens: 800, total_tokens: 4355 },
    };
    vi.mocked(fetch).mockResolvedValue(stream
      ? streamResponse(`data: ${JSON.stringify({ type: "response.output_text.delta", delta: output })}\n\ndata: ${JSON.stringify({ type: "response.incomplete", response })}\n\n`)
      : new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } }));
    const failure = await extractGatewayDemo({ mode: "canonical_images", images: [image], prompt: "Extract JSON." }, ctx()).catch((error: unknown) => error);
    expect(failure).toMatchObject({
      category: "provider", status: 200, retryable: false,
      message: expect.stringContaining("output-token limit"),
      evidence: {
        raw: '{"reference":"[REDACTED]","rows":[', json: undefined,
        usage: { inputTokens: 3555, outputTokens: 800, totalTokens: 4355 }, providerCalls: 1,
        providerAttempts: [{ usage: { outputTokens: 800 }, error: { retryable: false } }],
      },
    });
    expect(JSON.stringify(failure)).not.toContain("dmo_test_session");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("never accepts parseable JSON from an incomplete stream or runs its reducer", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(streamResponse(sse({ pages: [1, 2, 3, 4] })))
      .mockResolvedValueOnce(streamResponse(`data: ${JSON.stringify({ type: "response.incomplete", response: {
        status: "incomplete", incomplete_details: { reason: "max_output_tokens" },
        output: [{ type: "message", content: [{ type: "output_text", text: '{"pages":[5]}' }] }],
        usage: { input_tokens: 3, output_tokens: 800, total_tokens: 803 },
      } })}\n\n`));
    await expect(extractGatewayDemo({ mode: "canonical_images", images: [image, image, image, image, image], prompt: "Extract JSON." }, ctx())).rejects.toMatchObject({
      retryable: false,
      evidence: { json: undefined, raw: '{"pages":[5]}', providerCalls: 2, usage: { inputTokens: 5, outputTokens: 801, totalTokens: 806 } },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails closed for an unsupported reasoning override", async () => {
    await expect(extractGatewayDemo({ mode: "canonical_images", images: [image], prompt: "Extract JSON.", thinking: "max" }, ctx())).rejects.toMatchObject({ category: "invalid_request" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains redacted evidence and does not replay a successful map after a later failure", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(streamResponse(sse({ page: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "expired dmo_test_session" } }), { status: 401 }));
    let failure: unknown;
    try {
      await extractGatewayDemo({ mode: "canonical_images", images: [image, image, image, image, image], prompt: "Extract JSON." }, ctx());
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ retryable: false, evidence: { providerCalls: 2 } });
    expect(failure).toMatchObject({ message: expect.stringMatching(/partial evidence.*restart the benchmark/i) });
    const evidence = (failure as { evidence?: { providerAttempts?: Array<{ raw?: string }> } }).evidence;
    expect(evidence?.providerAttempts?.[1]?.raw).toContain("[REDACTED]");
    expect(JSON.stringify(evidence)).not.toContain("dmo_test_session");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("checks a hard budget before each map/reduce request", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(streamResponse(sse({ page: 1 })))
      .mockResolvedValueOnce(streamResponse(sse({ page: 5 })))
      .mockResolvedValueOnce(streamResponse(sse({ merged: true })));
    const budget = new AttemptBudget(0.01, 0.005);
    const before = vi.fn((meta: GatewayRequestMeta) => { void meta; });
    // Keep the test gate explicit: reserve synchronously before each request and
    // settle each response at the declared per-call bound.
    const gate = {
      beforeRequest: async (meta: GatewayRequestMeta) => { before(meta); const settle = budget.reserve(); return { settle }; },
      afterResponse: (lease: { settle(costUsd?: number): void } | undefined, response?: unknown) => { void response; lease?.settle(0.005); },
    };
    await expect(extractGatewayDemo({ mode: "canonical_images", images: [image, image, image, image, image], prompt: "Extract JSON." }, ctx(gate))).rejects.toMatchObject({ retryable: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(before).toHaveBeenCalledTimes(3);
  });
});
