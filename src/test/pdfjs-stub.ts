// Test-only stand-in for pdfjs-dist. The real module (heavy worker/parser
// code) must never load inside jsdom tests; vitest.config.ts aliases
// "pdfjs-dist" to this file. Type checking still uses the real types.
export const GlobalWorkerOptions: { workerSrc: string } = { workerSrc: "" };

export function getDocument(): unknown {
  return {
    promise: Promise.reject(new Error("pdfjs-dist stub: inject a loader into usePdfDocument in tests")),
    destroy: () => Promise.resolve(),
  };
}
