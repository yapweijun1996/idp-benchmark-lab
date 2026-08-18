import promptText from "../../demo/popular-po/prompt.txt?raw";
import schemaText from "../../demo/popular-po/schema.json?raw";
import goldenText from "../../demo/popular-po/golden.json?raw";
import pdfUrl from "../../demo/popular-po/input.pdf?url";
import nexabytePromptText from "../../demo/nexabyte-po/prompt.txt?raw";
import nexabyteSchemaText from "../../demo/nexabyte-po/schema.json?raw";
import nexabyteGoldenText from "../../demo/nexabyte-po/golden.json?raw";
import nexabytePdfUrl from "../../demo/nexabyte-po/input.pdf?url";

/**
 * The bundled "Try Demo" fixture (see demo/popular-po/ for the source
 * files). This is a synthetic purchase order written for this repo — not
 * the real "Popular PO" scan used in the original regression tests, whose
 * source PDF is intentionally never committed (src/test/fixtures/golden-popular-po.ts).
 * It deliberately exercises the same regression-worthy shapes: a
 * leading-zero document number, an exact compound product name, a decoy
 * column that must not leak into requested fields, and an explicitly printed
 * footer remark.
 */
export const DEMO_NAME = "Popular Purchase Order";
export const DEMO_PROMPT = promptText;
export const DEMO_SCHEMA: unknown = JSON.parse(schemaText);
export const DEMO_GOLDEN: unknown = JSON.parse(goldenText);

export const NEXABYTE_NAME = "Nexabyte Purchase Order";
export const NEXABYTE_PROMPT = nexabytePromptText;
export const NEXABYTE_SCHEMA: unknown = JSON.parse(nexabyteSchemaText);
export const NEXABYTE_GOLDEN: unknown = JSON.parse(nexabyteGoldenText);

/** Fetches the bundled demo PDF as a Blob (network-free: it's a same-origin build asset). */
export async function loadDemoDocumentBlob(): Promise<Blob> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to load bundled demo PDF: HTTP ${response.status}`);
  }
  return response.blob();
}

/** Fetches the bundled Nexabyte purchase-order PDF as a same-origin asset. */
export async function loadNexabyteDocumentBlob(): Promise<Blob> {
  const response = await fetch(nexabytePdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to load bundled Nexabyte PDF: HTTP ${response.status}`);
  }
  return response.blob();
}
