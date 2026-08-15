import { describe, expect, it } from "vitest";
import { bodyText, errorFromStatus, extractJson, networkError } from "./common";

describe("extractJson", () => {
  it("parses a bare JSON object", () => {
    expect(extractJson('  {"a":1}  ')).toEqual({ a: 1 });
  });

  it("parses a fenced json block", () => {
    expect(extractJson('Here you go:\n\n```json\n{"a":null}\n```')).toEqual({ a: null });
  });

  it("returns undefined for unparseable text", () => {
    expect(extractJson("sorry, no json")).toBeUndefined();
    expect(extractJson("{broken")).toBeUndefined();
  });

  it("preserves null vs zero vs empty string", () => {
    const parsed = extractJson('{"a":null,"b":0,"c":""}');
    expect(parsed).toEqual({ a: null, b: 0, c: "" });
  });
});

describe("errorFromStatus", () => {
  it("maps 401/403 to non-retryable auth", () => {
    const err = errorFromStatus(401, "bad key");
    expect(err).toMatchObject({ category: "auth", retryable: false, status: 401 });
  });

  it("maps 429 to retryable rate_limit", () => {
    expect(errorFromStatus(429, "slow down")).toMatchObject({ category: "rate_limit", retryable: true });
  });

  it("maps 5xx to retryable provider errors", () => {
    expect(errorFromStatus(503, "down")).toMatchObject({ category: "provider", retryable: true });
  });

  it("maps 400 to invalid_request", () => {
    expect(errorFromStatus(400, "bad")).toMatchObject({ category: "invalid_request", retryable: false });
  });
});

describe("networkError", () => {
  it("explains CORS/offline ambiguity without key material", () => {
    const err = networkError("Failed to fetch");
    expect(err.category).toBe("network");
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/cors/i);
  });
});

describe("bodyText", () => {
  it("prefers provider error message fields", () => {
    expect(bodyText({ error: { message: "quota exceeded" } })).toBe("quota exceeded");
    expect(bodyText({ error: "plain" })).toBe("plain");
    expect(bodyText({ message: "m" })).toBe("m");
    expect(bodyText("raw")).toBe("raw");
    expect(bodyText({})).toBe("");
  });
});
