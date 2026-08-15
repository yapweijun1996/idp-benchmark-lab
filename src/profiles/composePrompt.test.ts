import { describe, expect, it } from "vitest";
import { composePrompt } from "./composePrompt";

const contract = { doc_info: ["document_number"], row_data: ["stock_code"] };
const schema = { type: "object", properties: { document_number: { type: ["string", "null"] } } };

describe("composePrompt", () => {
  it("includes base prompt, contract JSON, and schema JSON", () => {
    const prompt = composePrompt("Extract the PO.", contract, schema);
    expect(prompt).toContain("Extract the PO.");
    expect(prompt).toContain('"doc_info"');
    expect(prompt).toContain('"document_number"');
    expect(prompt).toContain('"type"');
  });

  it("carries the mandatory field-isolation and null semantics", () => {
    const prompt = composePrompt("x", contract, schema);
    expect(prompt).toMatch(/unrequested columns/i);
    expect(prompt).toMatch(/missing printed values are null/i);
    expect(prompt).toMatch(/do not calculate totals/i);
  });

  it("is deterministic for identical inputs", () => {
    expect(composePrompt("a", contract, schema)).toBe(composePrompt("a", contract, schema));
  });
});
