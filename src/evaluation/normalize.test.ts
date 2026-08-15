import { describe, expect, it } from "vitest";
import { normalizeDeep, normalizeValue } from "./normalize";

const policy = { trimOuterWhitespace: true, normalizeLineEndings: true };

describe("normalizeValue", () => {
  it("trims outer whitespace and normalizes line endings", () => {
    expect(normalizeValue("  M650 M WL WHITE  ", policy)).toBe("M650 M WL WHITE");
    expect(normalizeValue("a\r\nb", policy)).toBe("a\nb");
  });

  it("never rewrites identifiers", () => {
    // 前导零与多余空格是基准失配，不是归一化目标
    expect(normalizeValue("0004131999", policy)).toBe("0004131999");
    expect(normalizeValue("M650 M WL WHITE", policy)).toBe("M650 M WL WHITE");
  });

  it("leaves non-strings untouched", () => {
    expect(normalizeValue(null, policy)).toBeNull();
    expect(normalizeValue(0, policy)).toBe(0);
    expect(normalizeValue(5, policy)).toBe(5);
  });

  it("returns values unchanged without a policy", () => {
    expect(normalizeValue("  x  ", undefined)).toBe("  x  ");
  });
});

describe("normalizeDeep", () => {
  it("applies the policy recursively", () => {
    const input = { a: " x ", rows: [{ b: "y\r\nz" }] };
    expect(normalizeDeep(input, policy)).toEqual({ a: "x", rows: [{ b: "y\nz" }] });
  });

  it("treats trailing newlines as outer whitespace when trimming", () => {
    expect(normalizeDeep({ v: "y\r\n" }, policy)).toEqual({ v: "y" });
  });

  it("preserves structure and non-strings", () => {
    const input = { n: 1, s: "  a ", arr: [null, 0] };
    expect(normalizeDeep(input, policy)).toEqual({ n: 1, s: "a", arr: [null, 0] });
  });
});
