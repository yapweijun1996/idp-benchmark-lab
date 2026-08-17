import { canvasPageRenderer } from "./canonicalRenderer";
import { defaultLoader } from "./usePdfDocument";
import type { ExecuteDeps } from "../benchmarks/execute";

/**
 * Real browser deps for the extraction engine: PDF.js document loading plus
 * a canvas-backed page renderer for "canonical images" input mode. Every
 * production call site (wizard, repeated benchmark, demo) must pass these —
 * without them, canonical_images mode throws (execute.ts requires
 * deps.pdfLoader) and only native_pdf-capable providers work.
 */
export function browserExecuteDeps(): Pick<ExecuteDeps, "pdfLoader" | "pageRenderer"> {
  return {
    pdfLoader: defaultLoader,
    pageRenderer: canvasPageRenderer(() => document.createElement("canvas")),
  };
}
