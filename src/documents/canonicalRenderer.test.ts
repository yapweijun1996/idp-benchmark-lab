import { describe, expect, it, vi } from "vitest";
import { DEFAULT_RENDER_SETTINGS, renderDocumentPages, type PageRenderer, type PdfSource } from "./canonicalRenderer";

function fakePdf(numPages: number): PdfSource {
  return {
    numPages,
    getPage: vi.fn((n: number) => Promise.resolve({ pageNumber: n })),
  };
}

function fakeRenderer(): PageRenderer {
  return {
    render: vi.fn((page: unknown) =>
      Promise.resolve({ dataUrl: `data:image/png;base64,page=${String((page as { pageNumber: number }).pageNumber)}` }),
    ),
  };
}

describe("renderDocumentPages", () => {
  it("renders every page in order by default", async () => {
    const pdf = fakePdf(3);
    const renderer = fakeRenderer();
    const images = await renderDocumentPages(pdf, DEFAULT_RENDER_SETTINGS, renderer);
    expect(images).toHaveLength(3);
    expect(images.map((i) => i.mimeType)).toEqual(["image/png", "image/png", "image/png"]);
    expect(images[0]?.dataUrl).toContain("page=1");
    expect(images[2]?.dataUrl).toContain("page=3");
  });

  it("honors an explicit page range", async () => {
    const pdf = fakePdf(10);
    const renderer = fakeRenderer();
    const images = await renderDocumentPages(pdf, { ...DEFAULT_RENDER_SETTINGS, pageRange: { from: 3, to: 5 } }, renderer);
    expect(images).toHaveLength(3);
    expect(images[0]?.dataUrl).toContain("page=3");
    expect(images[2]?.dataUrl).toContain("page=5");
  });

  it("clamps the range end to the document page count", async () => {
    const pdf = fakePdf(2);
    const renderer = fakeRenderer();
    const images = await renderDocumentPages(pdf, { ...DEFAULT_RENDER_SETTINGS, pageRange: { from: 1, to: 99 } }, renderer);
    expect(images).toHaveLength(2);
  });

  it("rejects invalid page ranges", async () => {
    const pdf = fakePdf(3);
    await expect(
      renderDocumentPages(pdf, { ...DEFAULT_RENDER_SETTINGS, pageRange: { from: 5, to: 6 } }, fakeRenderer()),
    ).rejects.toThrow(/page range/i);
    await expect(
      renderDocumentPages(pdf, { ...DEFAULT_RENDER_SETTINGS, pageRange: { from: 3, to: 2 } }, fakeRenderer()),
    ).rejects.toThrow(/page range/i);
  });

  it("produces JPEG mime types when configured", async () => {
    const pdf = fakePdf(1);
    const images = await renderDocumentPages(
      pdf,
      { scale: 1.5, format: "image/jpeg", quality: 0.8 },
      fakeRenderer(),
    );
    expect(images[0]?.mimeType).toBe("image/jpeg");
  });
});
