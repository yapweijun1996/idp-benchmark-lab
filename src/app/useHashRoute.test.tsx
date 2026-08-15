import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHashRoute } from "./useHashRoute";

function setHash(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("useHashRoute", () => {
  it("returns the default route for an empty hash", () => {
    setHash("");
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("dashboard");
  });

  it("parses a known route from the hash", () => {
    setHash("#/benchmarks");
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("benchmarks");
  });

  it("falls back to the default route for unknown hashes", () => {
    setHash("#/does-not-exist");
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("dashboard");
  });

  it("updates the route when the hash changes", () => {
    setHash("");
    const { result } = renderHook(() => useHashRoute());
    act(() => {
      setHash("#/settings");
    });
    expect(result.current).toBe("settings");
  });
});
