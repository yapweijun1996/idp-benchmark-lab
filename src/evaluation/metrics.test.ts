import { describe, expect, it } from "vitest";
import { computeStability, evaluateOutput } from "./metrics";
import type { NormalizationPolicy } from "../storage/types";

const policy: NormalizationPolicy = { trimOuterWhitespace: true, normalizeLineEndings: true };

const golden = {
  doc_info: { document_number: "0004131999", date_transaction: "26.06.2023" },
  row_data: [
    { stock_code: "910-001", stock_desc: "LOGITECH M650 M WL WHITE", remark: null, qty: "1" },
    { stock_code: "910-002", stock_desc: "LOGITECH M650 M WL BLACK", remark: null, qty: "2" },
  ],
  footer: { subtotal: null, discount: null, gst: null, grand_total: null },
};

describe("evaluateOutput — exact match", () => {
  it("marks identical output as exact and fully accurate", () => {
    const result = evaluateOutput(golden, structuredClone(golden));
    expect(result.exactMatch).toBe(true);
    expect(result.exactMatchNormalized).toBe(true);
    expect(result.leafAccuracy).toMatchObject({ totalGoldenLeaves: 14, matchedLeaves: 14, accuracy: 1 });
    expect(result.rowComparison).toMatchObject({ goldenRows: 2, matchedRows: 2, missingRows: 0, extraRows: 0, duplicateDetected: false });
  });

  it("detects a missing field", () => {
    const output = structuredClone(golden) as Record<string, unknown>;
    delete (output.doc_info as Record<string, unknown>).date_transaction;
    const result = evaluateOutput(golden, output);
    expect(result.exactMatch).toBe(false);
    expect(result.leafAccuracy.accuracy).toBeCloseTo(13 / 14);
    expect(result.leafAccuracy.mismatches.map((m) => m.path)).toContain("doc_info.date_transaction");
  });

  it("ignores extra output fields for leaf accuracy but not exact match", () => {
    const output = { ...structuredClone(golden), extra_field: "leak" };
    const result = evaluateOutput(golden, output);
    expect(result.exactMatch).toBe(false);
    expect(result.leafAccuracy.accuracy).toBe(1);
  });

  it("flags a wrong identifier digit", () => {
    const output = structuredClone(golden) as { doc_info: { document_number: string } };
    output.doc_info.document_number = "0004131998";
    const result = evaluateOutput(golden, output);
    expect(result.exactMatch).toBe(false);
    expect(result.leafAccuracy.mismatches[0]).toMatchObject({
      path: "doc_info.document_number",
      expected: "0004131999",
      actual: "0004131998",
    });
  });

  it("treats null and 0 as different values", () => {
    const output = structuredClone(golden) as { footer: { subtotal: unknown } };
    output.footer.subtotal = 0;
    const result = evaluateOutput(golden, output);
    expect(result.exactMatch).toBe(false);
    expect(result.leafAccuracy.mismatches[0]).toMatchObject({ path: "footer.subtotal", expected: null, actual: 0 });
  });

  it("flags remark field leakage", () => {
    const output = structuredClone(golden) as { row_data: { remark: unknown }[] };
    output.row_data[0]!.remark = "920-007596";
    const result = evaluateOutput(golden, output);
    expect(result.leafAccuracy.mismatches[0]).toMatchObject({
      path: "row_data[0].remark",
      expected: null,
      actual: "920-007596",
    });
  });
});

describe("evaluateOutput — rows", () => {
  it("reports missing rows", () => {
    const output = structuredClone(golden) as { row_data: unknown[] };
    output.row_data.pop();
    const result = evaluateOutput(golden, output);
    expect(result.rowComparison).toMatchObject({ goldenRows: 2, outputRows: 1, matchedRows: 1, missingRows: 1, extraRows: 0 });
  });

  it("reports extra rows", () => {
    const output = structuredClone(golden) as { row_data: unknown[] };
    output.row_data.push(structuredClone(output.row_data[0]));
    const result = evaluateOutput(golden, output);
    expect(result.rowComparison).toMatchObject({ outputRows: 3, extraRows: 1 });
  });

  it("detects duplicated output rows", () => {
    const output = structuredClone(golden) as { row_data: unknown[] };
    output.row_data[1] = structuredClone(output.row_data[0]);
    const result = evaluateOutput(golden, output);
    expect(result.rowComparison.duplicateDetected).toBe(true);
  });

  it("treats reordered rows as mismatches (ordered by index)", () => {
    const output = structuredClone(golden) as { row_data: unknown[] };
    [output.row_data[0], output.row_data[1]] = [output.row_data[1]!, output.row_data[0]!];
    const result = evaluateOutput(golden, output);
    expect(result.rowComparison.matchedRows).toBe(0);
  });
});

describe("evaluateOutput — normalized", () => {
  it("matches whitespace-only differences under the policy, not strictly", () => {
    const output = structuredClone(golden) as { row_data: { stock_desc: string }[] };
    output.row_data[0]!.stock_desc = "  LOGITECH M650 M WL WHITE  ";
    const result = evaluateOutput(golden, output, { normalizationPolicy: policy });
    expect(result.exactMatch).toBe(false);
    expect(result.exactMatchNormalized).toBe(true);
    expect(result.leafAccuracy.accuracy).toBeCloseTo(13 / 14);
    expect(result.leafAccuracyNormalized.accuracy).toBe(1);
  });

  it("never normalizes away identifier errors", () => {
    const output = structuredClone(golden) as { doc_info: { document_number: string } };
    output.doc_info.document_number = "4131999";
    const result = evaluateOutput(golden, output, { normalizationPolicy: policy });
    expect(result.exactMatchNormalized).toBe(false);
  });
});

describe("computeStability", () => {
  it("computes consistency and golden stability", () => {
    const runs = [
      { outputHash: "h1", exactMatch: true },
      { outputHash: "h1", exactMatch: true },
      { outputHash: "h2", exactMatch: false },
      { outputHash: undefined, exactMatch: false }, // parse failure
    ];
    const stability = computeStability(runs, 4);
    expect(stability.modalHash).toBe("h1");
    expect(stability.modalCount).toBe(2);
    expect(stability.consistencyRate).toBeCloseTo(2 / 3);
    expect(stability.goldenStability).toBeCloseTo(2 / 4);
  });

  it("returns undefined rates when nothing is parseable", () => {
    const stability = computeStability([{ outputHash: undefined }, { outputHash: undefined }], 2);
    expect(stability.consistencyRate).toBeUndefined();
    expect(stability.goldenStability).toBe(0);
  });
});
