import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdpDatabase } from "../storage/db";
import { ProfileService, type ProfileInput } from "../profiles/service";
import { GoldenService } from "../golden/service";
import { setApiKey, clearApiKey } from "../providers/keys";
import { SingleRunService, type SingleRunInput } from "./singleRun";
import type { ProviderAdapter, NormalizedExtractionRequest } from "../providers/types";
import type { DocumentRecord, ProviderConfig } from "../storage/types";

const profileInput: ProfileInput = {
  name: "PO",
  basePrompt: "Extract printed values.",
  extractionContract: { doc_info: ["document_number"] },
  jsonSchema: {
    type: "object",
    properties: { document_number: { type: ["string", "null"] } },
    required: ["document_number"],
    additionalProperties: false,
  },
};

let db: IdpDatabase;
let counter = 0;

function fakeAdapter(overrides: Partial<ProviderAdapter> = {}): ProviderAdapter & { extract: ReturnType<typeof vi.fn> } {
  return {
    kind: "gemini",
    capabilities: () => ({
      nativePdf: true,
      imageInput: true,
      structuredOutput: true,
      tokenUsage: true,
      providerReportedCost: false,
      temperature: true,
      thinking: true,
    }),
    testConnection: async () => ({ ok: true, message: "ok" }),
    extract: vi.fn(),
    ...overrides,
  } as unknown as ProviderAdapter & { extract: ReturnType<typeof vi.fn> };
}

async function seed(adapter: ProviderAdapter) {
  const profiles = new ProfileService(db);
  const profile = await profiles.create(profileInput);
  const goldenService = new GoldenService(db);
  const golden = await goldenService.create({
    documentId: "doc-1",
    profileId: profile.id,
    json: { document_number: "0004131999" },
  });
  const config: ProviderConfig = {
    id: "cfg-1",
    kind: "gemini",
    name: "Gemini",
    model: "gemini-3-flash-lite",
    settings: {},
  };
  await db.providerConfigs.put(config);
  const doc: DocumentRecord = {
    id: "doc-1",
    name: "po.pdf",
    mimeType: "application/pdf",
    size: 4,
    sha256: "doc-hash-64",
    createdAt: "2026-08-15T00:00:00.000Z",
    storageMode: "session",
  };
  await db.documents.put({ ...doc, blob: new Blob(["%PDF"], { type: "application/pdf" }) });
  setApiKey("cfg-1", "AIza-test", { rememberForTab: false });
  const service = new SingleRunService({
    db,
    adapters: { gemini: adapter },
    // fake-indexeddb structural-clones Blobs into plain objects; inject the real one
    getBlob: () => Promise.resolve(new Blob(["%PDF"], { type: "application/pdf" })),
  });
  const input: SingleRunInput = {
    documentId: "doc-1",
    profileId: profile.id,
    providerConfigId: "cfg-1",
    goldenId: golden.id,
    mode: "native_pdf",
  };
  return { service, input, profile, golden, config };
}

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-single-run-test-${counter}`);
});

afterEach(async () => {
  clearApiKey("cfg-1");
  db.close();
  await db.delete();
});

describe("SingleRunService", () => {
  it("runs a successful native-PDF extraction and persists evidence", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue({
      raw: '{"document_number":"0004131999"}',
      json: { document_number: "0004131999" },
      usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
      providerCalls: 1,
    });
    const { service, input, profile, golden } = await seed(adapter);
    const result = await service.run(input);

    expect(result.run.state).toBe("succeeded");
    expect(result.run.schemaValid).toBe(true);
    expect(result.run.safeRawResponse).toBe('{"document_number":"0004131999"}');
    expect(result.run.parsedJson).toEqual({ document_number: "0004131999" });
    expect(result.run.outputHash).toHaveLength(64);
    expect(result.run.usage).toEqual({ inputTokens: 10, outputTokens: 2, totalTokens: 12 });
    // Golden 匹配 → 评估字段已持久化
    expect(result.run.exactMatch).toBe(true);
    expect(result.run.leafAccuracy).toBe(1);
    expect(result.run.rowAccuracy).toBeUndefined();
    expect(result.run.latencyMs).toBeGreaterThanOrEqual(0);

    expect(result.suite.status).toBe("completed");
    expect(result.suite.identity).toMatchObject({
      documentSha256: "doc-hash-64",
      profileId: profile.id,
      profileVersion: 1,
      promptSha256: profile.promptSha256,
      goldenId: golden.id,
      providerKind: "gemini",
      inputMode: "native_pdf",
      appBuild: "0.1.0",
    });

    // 持久化验证
    const storedRun = await db.benchmarkRuns.get(result.run.id);
    expect(storedRun?.parsedJson).toEqual({ document_number: "0004131999" });
    const storedSuite = await db.benchmarkSuites.get(result.suite.id);
    expect(storedSuite?.status).toBe("completed");
  });

  it("marks schema-invalid output distinctly", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue({
      raw: '{"document_number":42}',
      json: { document_number: 42 },
      providerCalls: 1,
    });
    const { service, input } = await seed(adapter);
    const result = await service.run(input);
    expect(result.run.state).toBe("schema_invalid");
    expect(result.run.schemaValid).toBe(false);
    expect(result.suite.status).toBe("completed");
  });

  it("uses a prompt override without changing the saved profile", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue({
      raw: '{"document_number":"0004131999"}',
      json: { document_number: "0004131999" },
      providerCalls: 1,
    });
    const { service, input, profile } = await seed(adapter);
    const promptOverride = "Extract only the printed purchase order fields.";
    const result = await service.run({ ...input, promptOverride });

    const request = adapter.extract.mock.calls[0]?.[0] as NormalizedExtractionRequest;
    expect(request.prompt).toContain(promptOverride);
    expect(result.suite.identity.promptSha256).not.toBe(profile.promptSha256);
    expect((await db.extractionProfiles.get(profile.id))?.basePrompt).toBe(profileInput.basePrompt);
  });

  it("records provider errors without corrupting the suite", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockRejectedValue({ category: "auth", message: "bad key", retryable: false });
    const { service, input } = await seed(adapter);
    await expect(service.run(input)).rejects.toMatchObject({ error: { category: "auth" } });
    const runs = await db.benchmarkRuns.toArray();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ state: "provider_error", error: { category: "auth" } });
    const suites = await db.benchmarkSuites.toArray();
    expect(suites[0]?.status).toBe("failed");
  });

  it("fails fast without an API key", async () => {
    const adapter = fakeAdapter();
    const { service, input } = await seed(adapter);
    clearApiKey("cfg-1");
    await expect(service.run(input)).rejects.toMatchObject({ error: { category: "auth" } });
    expect(adapter.extract).not.toHaveBeenCalled();
  });

  it("rejects native PDF mode for adapters without nativePdf capability", async () => {
    const adapter = fakeAdapter({
      capabilities: () => ({
        nativePdf: false,
        imageInput: true,
        structuredOutput: true,
        tokenUsage: true,
        providerReportedCost: false,
        temperature: true,
        thinking: false,
      }),
    });
    const { service, input } = await seed(adapter);
    await expect(service.run(input)).rejects.toMatchObject({ error: { category: "unsupported" } });
  });

  it("renders canonical images before extraction in image mode", async () => {
    const adapter = fakeAdapter();
    adapter.extract.mockResolvedValue({
      raw: '{"document_number":null}',
      json: { document_number: null },
      providerCalls: 1,
    });
    const { input } = await seed(adapter);
    const pdf = { numPages: 2, getPage: async (n: number) => ({ pageNumber: n }) };
    const loader = vi.fn(() => ({ promise: Promise.resolve(pdf), destroy: vi.fn(() => Promise.resolve()) }));
    const renderer = {
      render: vi.fn((page: { pageNumber: number }) =>
        Promise.resolve({ dataUrl: `data:image/png;base64,p${page.pageNumber}` }),
      ),
    };
    const svc = new SingleRunService({
      db,
      adapters: { gemini: adapter },
      pdfLoader: loader as never,
      pageRenderer: renderer,
      getBlob: () => Promise.resolve(new Blob(["%PDF"], { type: "application/pdf" })),
    });
    const result = await svc.run({ ...input, mode: "canonical_images" });

    const request = adapter.extract.mock.calls[0]?.[0] as NormalizedExtractionRequest;
    expect(request.mode).toBe("canonical_images");
    expect(request.images).toHaveLength(2);
    expect(request.images?.[0]?.dataUrl).toContain("p1");
    expect(result.suite.identity.inputMode).toBe("canonical_images");
    expect(result.suite.identity.rendererSettings).toMatchObject({ scale: 2, format: "image/png" });
  });
});
