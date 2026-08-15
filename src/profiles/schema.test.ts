import { describe, expect, it } from "vitest";
import { findUnknownKeywords, schemaHashSource, validateData, validateJsonSchema } from "./schema";

const simpleSchema = {
  type: "object",
  properties: {
    document_number: { type: ["string", "null"] },
  },
  required: ["document_number"],
  additionalProperties: false,
};

describe("validateJsonSchema", () => {
  it("accepts a valid draft-07 schema", () => {
    expect(validateJsonSchema(simpleSchema)).toEqual({ valid: true, errors: [] });
  });

  it("rejects malformed schemas", () => {
    const check = validateJsonSchema({ type: "not-a-real-type" });
    expect(check.valid).toBe(false);
    expect(check.errors.length).toBeGreaterThan(0);
  });

  it("rejects unknown keywords such as OpenAI 'nullable' in strict mode", () => {
    const check = validateJsonSchema({
      type: "object",
      properties: { a: { type: "string", nullable: true } },
    });
    expect(check.valid).toBe(false);
    expect(check.errors.join(" ")).toMatch(/nullable/i);
  });

  it("reports the JSON path of a nested unknown keyword", () => {
    const found = findUnknownKeywords({
      type: "object",
      properties: { a: { type: "string", "x-custom": true } },
    });
    expect(found).toContain("$.properties.a.x-custom");
  });

  it("accepts boolean schemas as valid draft-07", () => {
    expect(validateJsonSchema(true)).toEqual({ valid: true, errors: [] });
    expect(validateJsonSchema(false)).toEqual({ valid: true, errors: [] });
  });
});

describe("validateData", () => {
  it("accepts data that satisfies the schema", () => {
    expect(validateData({ document_number: "0004131999" }, simpleSchema)).toEqual({ valid: true, errors: [] });
  });

  it("accepts null where the schema allows it", () => {
    expect(validateData({ document_number: null }, simpleSchema)).toEqual({ valid: true, errors: [] });
  });

  it("reports a path for missing required fields", () => {
    const check = validateData({}, simpleSchema);
    expect(check.valid).toBe(false);
    expect(check.errors[0]).toMatch(/document_number/);
  });

  it("rejects extra fields when additionalProperties is false", () => {
    const check = validateData({ document_number: "1", leaky_field: "x" }, simpleSchema);
    expect(check.valid).toBe(false);
    expect(check.errors[0]).toMatch(/leaky_field/);
  });
});

describe("schemaHashSource", () => {
  it("is stable across key order changes", () => {
    const a = schemaHashSource({ b: 1, a: 2 });
    const b = schemaHashSource({ a: 2, b: 1 });
    expect(a).toBe(b);
  });
});
