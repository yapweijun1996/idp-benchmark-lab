import { describe, expect, it } from "vitest";
import { validateData } from "../profiles/schema";
import { NEXABYTE_GOLDEN, NEXABYTE_SCHEMA } from "./fixture";

describe("Nexabyte purchase-order Golden fixture", () => {
  it("validates the complete printed form against its schema", () => {
    const check = validateData(NEXABYTE_GOLDEN, NEXABYTE_SCHEMA);
    expect(check.valid).toBe(true);
    expect(check.errors).toEqual([]);
  });

  it("keeps all ten printed rows and printed totals", () => {
    const golden = NEXABYTE_GOLDEN as {
      row_data: { item_code: string; amount: string }[];
      totals: { grand_total: string; gst_amount: string };
    };
    expect(golden.row_data).toHaveLength(10);
    expect(golden.row_data[0]).toMatchObject({ item_code: "NB-ASU-001", amount: "1,998.00" });
    expect(golden.row_data[9]).toMatchObject({ item_code: "UPS-1000-001", amount: "537.00" });
    expect(golden.totals).toEqual({
      subtotal: "9,686.00",
      discount: "0.00",
      net_amount: "9,686.00",
      gst_rate: "9%",
      gst_amount: "871.74",
      grand_total: "10,557.74",
      amount_in_words: "Singapore Dollars Ten Thousand Five Hundred\nFifty-Seven and Cents Seventy-Four Only.",
    });
  });
});
