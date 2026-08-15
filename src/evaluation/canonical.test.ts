import { describe, expect, it } from "vitest";
import { canonicalJson } from "./canonical";

describe("canonicalJson", () => {
  it("sorts object keys recursively", () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":2}');
  });

  it("preserves array order", () => {
    expect(canonicalJson({ rows: [3, 1, 2] })).toBe('{"rows":[3,1,2]}');
  });

  it("preserves null, numbers, and strings distinctly", () => {
    expect(canonicalJson({ a: null, b: 0, c: "", d: "0" })).toBe('{"a":null,"b":0,"c":"","d":"0"}');
  });

  it("treats 5 and '5' as different values", () => {
    expect(canonicalJson({ n: 5 })).not.toBe(canonicalJson({ n: "5" }));
  });

  it("is stable for the same input regardless of insertion order", () => {
    const a = canonicalJson(JSON.parse('{"x":1,"y":2}'));
    const b = canonicalJson(JSON.parse('{"y":2,"x":1}'));
    expect(a).toBe(b);
  });
});
