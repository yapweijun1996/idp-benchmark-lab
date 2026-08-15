import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { customAdapter } from "./openai-compatible";
import type { ProviderConfig, ProviderContext } from "./types";

const config: ProviderConfig = {
  id: "c-1",
  kind: "openai_compatible",
  name: "Local LM",
  baseUrl: "https://llm.example.com/v1",
  model: "local-model",
  settings: { customHeaders: { "X-Team": "bench" } },
};

const ctx: ProviderContext = { config, apiKey: "local-key-123" };

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

const request = {
  mode: "canonical_images" as const,
  images: [{ mimeType: "image/png" as const, dataUrl: "data:image/png;base64,AAAA" }],
  prompt: "Extract JSON.",
};

describe("customAdapter.extract", () => {
  it("calls {baseUrl}/chat/completions with custom headers", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{"a":1}' } }] }));
    const result = await customAdapter.extract(request, ctx);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://llm.example.com/v1/chat/completions");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer local-key-123");
    expect(headers["X-Team"]).toBe("bench");
    expect(result.json).toEqual({ a: 1 });
  });

  it("omits response_format when useJsonObject is false", async () => {
    const noJsonConfig: ProviderContext = {
      config: { ...config, settings: { useJsonObject: false } },
      apiKey: "k",
    };
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{"a":1}' } }] }));
    await customAdapter.extract(request, noJsonConfig);
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.response_format).toBeUndefined();
  });

  it("requires a base URL", async () => {
    const noBase: ProviderContext = { config: { ...config, baseUrl: undefined }, apiKey: "k" };
    await expect(customAdapter.extract(request, noBase)).rejects.toMatchObject({
      category: "invalid_request",
      message: expect.stringMatching(/base URL/i),
    });
  });

  it("rejects non-http base URLs", async () => {
    const bad: ProviderContext = { config: { ...config, baseUrl: "ftp://nope" }, apiKey: "k" };
    await expect(customAdapter.extract(request, bad)).rejects.toMatchObject({ category: "invalid_request" });
  });

  it("maps 500 to retryable provider error", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { message: "boom" } }, 500));
    await expect(customAdapter.extract(request, ctx)).rejects.toMatchObject({
      category: "provider",
      retryable: true,
    });
  });
});

describe("customAdapter.capabilities", () => {
  it("applies capability overrides from settings", () => {
    const caps = customAdapter.capabilities({
      ...config,
      settings: { capabilityOverrides: { imageInput: false } },
    });
    expect(caps.imageInput).toBe(false);
    expect(caps.nativePdf).toBe(false);
  });
});

describe("customAdapter.testConnection", () => {
  it("reports ok on /models 200", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));
    const result = await customAdapter.testConnection(ctx);
    expect(result.ok).toBe(true);
  });

  it("explains missing /models route with a CORS hint", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));
    const result = await customAdapter.testConnection(ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no \/models route/i);
    expect(result.message).toMatch(/cors/i);
  });

  it("never echoes the API key in messages", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await customAdapter.testConnection(ctx);
    expect(JSON.stringify(result)).not.toContain("local-key-123");
  });
});
