import promptText from "../../demo/popular-po/prompt.txt?raw";
import schemaText from "../../demo/popular-po/schema.json?raw";
import goldenText from "../../demo/popular-po/golden.json?raw";
import pdfUrl from "../../demo/popular-po/input.pdf?url";

/**
 * The bundled "Try Demo" fixture (see demo/popular-po/ for the source
 * files). This is a synthetic purchase order written for this repo — not
 * the real "Popular PO" scan used in the original regression tests, whose
 * source PDF is intentionally never committed (src/test/fixtures/golden-popular-po.ts).
 * It deliberately exercises the same regression-worthy shapes: a
 * leading-zero document number, an exact compound product name, a decoy
 * column that must not leak into requested fields, and an unprinted footer.
 */
export const DEMO_NAME = "Popular Purchase Order";
export const DEMO_PROMPT = promptText;
export const DEMO_SCHEMA: unknown = JSON.parse(schemaText);
export const DEMO_GOLDEN: unknown = JSON.parse(goldenText);

/** Fetches the bundled demo PDF as a Blob (network-free: it's a same-origin build asset). */
export async function loadDemoDocumentBlob(): Promise<Blob> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to load bundled demo PDF: HTTP ${response.status}`);
  }
  return response.blob();
}
