import { describe, expect, it } from "vitest";
import { GOLDEN_POPULAR_PO } from "./golden-popular-po";

/**
 * Executable version of the TESTING.md Golden PO regression checklist:
 * leading-zero document number, 13 rows, full stock descriptions,
 * remark null, exact "M650 M WL WHITE", footer values null.
 */
describe("Golden Popular PO fixture contract", () => {
  it("keeps the leading-zero document number", () => {
    expect(GOLDEN_POPULAR_PO.doc_info.document_number).toBe("0004131999");
    expect(GOLDEN_POPULAR_PO.doc_info.document_number).toMatch(/^000/);
  });

  it("has exactly 13 visible item rows", () => {
    expect(GOLDEN_POPULAR_PO.row_data).toHaveLength(13);
  });

  it("has no generic remarks: every remark is null", () => {
    for (const row of GOLDEN_POPULAR_PO.row_data) {
      expect(row.remark).toBeNull();
    }
  });

  it("contains the exact printed product text with double spaces", () => {
    const descriptions = GOLDEN_POPULAR_PO.row_data.map((row) => row.stock_desc);
    expect(descriptions).toContain("LOGITECH M650 M WL WHITE");
    // 双空格是基准的一部分
    expect(descriptions.filter((d) => d.includes("M650 M WL")).every((d) => d.includes("M WL "))).toBe(true);
  });

  it("leaves unprinted footer values null (no calculated totals)", () => {
    expect(GOLDEN_POPULAR_PO.footer).toEqual({ subtotal: null, discount: null, gst: null, grand_total: null });
  });

  it("never repurposes vendor article numbers into requested fields", () => {
    const asString = JSON.stringify(GOLDEN_POPULAR_PO);
    // 920-007596 是观察到的 Vendor Article No. 延续值——不得出现在任何请求字段
    expect(asString).not.toContain("920-007596");
    expect(asString).not.toContain("vendor_article_no");
  });
});
