import type { PageImage } from "../providers/types";

/**
 * Canonical rendered-image input mode (docs/INPUT_MODES.md):
 * the browser renders PDF pages with FIXED settings so every provider
 * receives the same visual input. Settings are part of benchmark identity.
 */
export interface CanonicalRenderSettings {
  /** Render scale (1.0 = 72 DPI). Default 2.0 = ~144 DPI. */
  scale: number;
  /** Output format for the page images. */
  format: "image/png" | "image/jpeg";
  /** JPEG quality (0..1); ignored for PNG. */
  quality?: number;
  /** 1-based inclusive page range; defaults to all pages. */
  pageRange?: { from: number; to: number };
}

export const DEFAULT_RENDER_SETTINGS: CanonicalRenderSettings = {
  scale: 2,
  format: "image/png",
};

/** Renderer seam: canvas-based in the browser, injected fake in tests. */
export interface PageRenderer {
  render(page: unknown, scale: number, format: "image/png" | "image/jpeg", quality?: number): Promise<{ dataUrl: string }>;
}

export interface PdfSource {
  numPages: number;
  getPage(pageNumber: number): Promise<unknown>;
}

/**
 * Renders pages in order and returns provider-ready images. Deterministic:
 * identical settings + document yield identical page lists (image bytes may
 * still vary by browser; the identity records the settings, not the pixels).
 */
export async function renderDocumentPages(
  pdf: PdfSource,
  settings: CanonicalRenderSettings,
  renderer: PageRenderer,
): Promise<PageImage[]> {
  const from = settings.pageRange?.from ?? 1;
  const to = Math.min(settings.pageRange?.to ?? pdf.numPages, pdf.numPages);
  if (from < 1 || from > pdf.numPages || to < from) {
    throw new Error(
      `Invalid page range ${from}-${to} for a ${pdf.numPages}-page document`,
    );
  }
  const images: PageImage[] = [];
  for (let pageNumber = from; pageNumber <= to; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const { dataUrl } = await renderer.render(page, settings.scale, settings.format, settings.quality);
    images.push({
      mimeType: settings.format === "image/png" ? "image/png" : "image/jpeg",
      dataUrl,
    });
  }
  return images;
}

/** Canvas-based default renderer (browser only; jsdom tests inject a fake). */
export function canvasPageRenderer(canvasFactory: () => HTMLCanvasElement): PageRenderer {
  return {
    async render(page, scale, format, quality) {
      const pdfPage = page as {
        getViewport(options: { scale: number }): { width: number; height: number };
        render(params: { canvas: HTMLCanvasElement; viewport: unknown }): { promise: Promise<void> };
        cleanup(): void;
      };
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasFactory();
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await pdfPage.render({ canvas, viewport }).promise;
      const dataUrl =
        format === "image/jpeg" ? canvas.toDataURL("image/jpeg", quality) : canvas.toDataURL("image/png");
      pdfPage.cleanup();
      return { dataUrl };
    },
  };
}
