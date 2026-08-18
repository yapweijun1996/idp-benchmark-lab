import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openaiAdapter } from "./openai";
import type { ProviderConfig, ProviderContext } from "./types";

const config: ProviderConfig = {
  id: "c-1",
  kind: "openai",
  name: "OpenAI",
  model: "gpt-4o-mini",
  settings: {},
};

const ctx: ProviderContext = { config, apiKey: "sk-test-key" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openaiAdapter.capabilities", () => {
  it("declares images but not native PDF", () => {
    const caps = openaiAdapter.capabilities(config);
    expect(caps).toMatchObject({ nativePdf: false, imageInput: true, structuredOutput: true, tokenUsage: true, thinking: true });
  });
});

describe("openaiAdapter.extract", () => {
  const request = {
    mode: "canonical_images" as const,
    images: [{ mimeType: "image/png" as const, dataUrl: "data:image/png;base64,AAAA" }],
    prompt: "Extract JSON from the image.",
  };

  it("maps request/response correctly and normalizes usage", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: '{"document_number":"0004131999"}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      }),
    );
    const result = await openaiAdapter.extract(request, ctx);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk-test-key");
    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content[0]).toMatchObject({ type: "text" });
    expect(body.messages[0].content[1]).toMatchObject({ type: "image_url" });

    expect(result.json).toEqual({ document_number: "0004131999" });
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 20, totalTokens: 120 });
    expect(result.providerCalls).toBe(1);
  });

  it("maps reasoning effort to the request", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '{"ok":true}' } }] }),
    );
    await openaiAdapter.extract({ ...request, thinking: "high" }, ctx);

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.reasoning_effort).toBe("high");
  });

  it("rejects native PDF mode explicitly", async () => {
    await expect(
      openaiAdapter.extract({ ...request, mode: "native_pdf", images: undefined }, ctx),
    ).rejects.toMatchObject({ category: "invalid_request", message: expect.stringMatching(/canonical rendered images/i) });
  });

  it("maps 401 to a non-retryable auth error", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: "invalid key" } }, 401));
    await expect(openaiAdapter.extract(request, ctx)).rejects.toMatchObject({
      category: "auth",
      retryable: false,
    });
  });

  it("maps 429 to a retryable rate-limit error", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: "too fast" } }, 429));
    await expect(openaiAdapter.extract(request, ctx)).rejects.toMatchObject({
      category: "rate_limit",
      retryable: true,
    });
  });

  it("reports unparseable JSON as a provider error", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: "not json at all" } }] }));
    await expect(openaiAdapter.extract(request, ctx)).rejects.toMatchObject({
      category: "provider",
      message: expect.stringMatching(/parseable/i),
    });
  });

  it("turns fetch failures into network errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(openaiAdapter.extract(request, ctx)).rejects.toMatchObject({
      category: "network",
      retryable: true,
    });
  });
});

describe("openaiAdapter.testConnection", () => {
  it("reports ok on 200 from the models endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));
    const result = await openaiAdapter.testConnection(ctx);
    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/models");
  });

  it("reports auth failure on 401 without echoing the key", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: "invalid key" } }, 401));
    const result = await openaiAdapter.testConnection(ctx);
    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject({ category: "auth" });
    expect(JSON.stringify(result)).not.toContain("sk-test-key");
  });
});
