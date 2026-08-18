import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geminiAdapter } from "./gemini";
import type { ProviderConfig, ProviderContext } from "./types";

const config: ProviderConfig = {
  id: "c-1",
  kind: "gemini",
  name: "Gemini",
  model: "gemini-3-flash-lite",
  settings: {},
};

const ctx: ProviderContext = { config, apiKey: "AIza-secret" };

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

describe("geminiAdapter.capabilities", () => {
  it("declares native PDF and image support", () => {
    const caps = geminiAdapter.capabilities(config);
    expect(caps).toMatchObject({ nativePdf: true, imageInput: true, structuredOutput: true, thinking: true });
  });
});

describe("geminiAdapter.extract (native pdf)", () => {
  const request = {
    mode: "native_pdf" as const,
    documentBytes: new Uint8Array([37, 80, 68, 70]).buffer,
    documentMimeType: "application/pdf",
    prompt: "Extract JSON.",
  };

  it("sends inline PDF bytes with the key in a header, not the URL", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: '{"a":null}' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, totalTokenCount: 12 },
      }),
    );
    const result = await geminiAdapter.extract(request, ctx);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).not.toContain("AIza-secret");
    expect(url).toContain(":generateContent");
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("AIza-secret");

    const body = JSON.parse(init?.body as string);
    const inlineData = body.contents[0].parts[1].inlineData;
    expect(inlineData.mimeType).toBe("application/pdf");
    expect(inlineData.data).toBe("JVBERg==");

    expect(result.json).toEqual({ a: null });
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 2, totalTokens: 12 });
  });

  it("maps thinking level to generation config", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }),
    );
    await geminiAdapter.extract({ ...request, thinking: "high" }, ctx);

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.generationConfig.thinkingLevel).toBe("high");
  });

  it("requires PDF bytes for native mode", async () => {
    await expect(geminiAdapter.extract({ ...request, documentBytes: undefined }, ctx)).rejects.toMatchObject({
      category: "invalid_request",
    });
  });

  it("reports blocked prompts as invalid_request", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ promptFeedback: { blockReason: "SAFETY" }, candidates: [] }));
    await expect(geminiAdapter.extract(request, ctx)).rejects.toMatchObject({
      category: "invalid_request",
      message: expect.stringMatching(/SAFETY/),
    });
  });

  it("maps 429 with retryable and 403 with auth", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: "quota" } }, 429));
    await expect(geminiAdapter.extract(request, ctx)).rejects.toMatchObject({ category: "rate_limit", retryable: true });

    fetchMock.mockResolvedValue(jsonResponse({ error: { message: "key" } }, 403));
    await expect(geminiAdapter.extract(request, ctx)).rejects.toMatchObject({ category: "auth", retryable: false });
  });
});

describe("geminiAdapter.extract (canonical images)", () => {
  it("sends images as inlineData parts", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ candidates: [{ content: { parts: [{ text: '{"b":0}' }] } }] }),
    );
    const result = await geminiAdapter.extract(
      {
        mode: "canonical_images",
        images: [{ mimeType: "image/png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" }],
        prompt: "Extract JSON.",
      },
      ctx,
    );
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.contents[0].parts[1].inlineData).toEqual({ mimeType: "image/png", data: "iVBORw0KGgo=" });
    expect(result.json).toEqual({ b: 0 });
  });
});

describe("geminiAdapter.testConnection", () => {
  it("queries the model metadata endpoint without leaking the key", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ name: "models/gemini-3-flash-lite" }));
    const result = await geminiAdapter.testConnection(ctx);
    expect(result.ok).toBe(true);
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toContain("gemini-3-flash-lite");
    expect(url).not.toContain("AIza-secret");
  });
});
