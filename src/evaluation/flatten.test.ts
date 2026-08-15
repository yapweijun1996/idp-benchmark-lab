import { describe, expect, it } from "vitest";
import { flattenLeaves } from "./flatten";

describe("flattenLeaves", () => {
  it("flattens nested objects with dot paths", () => {
    const leaves = flattenLeaves({ doc_info: { document_number: "0004131999" } });
    expect(leaves.get("doc_info.document_number")).toBe("0004131999");
    expect(leaves.size).toBe(1);
  });

  it("flattens arrays with index paths", () => {
    const leaves = flattenLeaves({ row_data: [{ stock_code: "A" }, { stock_code: "B" }] });
    expect(leaves.get("row_data[0].stock_code")).toBe("A");
    expect(leaves.get("row_data[1].stock_code")).toBe("B");
  });

  it("keeps null leaves", () => {
    const leaves = flattenLeaves({ remark: null });
    expect(leaves.get("remark")).toBeNull();
    expect(leaves.size).toBe(1);
  });

  it("distinguishes 0, empty string, and null", () => {
    const leaves = flattenLeaves({ a: 0, b: "", c: null });
    expect(leaves.get("a")).toBe(0);
    expect(leaves.get("b")).toBe("");
    expect(leaves.get("c")).toBeNull();
  });

  it("returns an empty map for an empty object", () => {
    expect(flattenLeaves({}).size).toBe(0);
  });
});
