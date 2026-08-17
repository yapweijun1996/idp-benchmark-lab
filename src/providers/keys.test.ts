import { beforeEach, describe, expect, it } from "vitest";
import { clearAllKeys, clearApiKey, getApiKey, isKeyRememberedForTab, setApiKey } from "./keys";

beforeEach(() => {
  clearAllKeys();
  window.sessionStorage.clear();
  // Optional chaining, not a plain call: some Node versions expose a built-in
  // global `localStorage` that shadows jsdom's window.localStorage and lacks
  // `.clear()` (see keys.test.ts "never writes to localStorage" for why this
  // doesn't hide a real bug — the source module never touches localStorage
  // at all). Real browsers always implement `.clear()`.
  window.localStorage.clear?.();
});

describe("BYOK key store", () => {
  it("keeps keys in memory by default", () => {
    setApiKey("cfg-1", "sk-memory", { rememberForTab: false });
    expect(getApiKey("cfg-1")).toBe("sk-memory");
    // 未 opt-in：sessionStorage 不写
    expect(window.sessionStorage.length).toBe(0);
  });

  it("persists to sessionStorage only after explicit opt-in", () => {
    setApiKey("cfg-1", "sk-tab", { rememberForTab: true });
    expect(isKeyRememberedForTab("cfg-1")).toBe(true);
    expect(window.sessionStorage.getItem("idp:apikey:cfg-1")).toBe("sk-tab");
    // 重新读取（模拟 reload 后内存清空）：从 sessionStorage 恢复
    expect(getApiKey("cfg-1")).toBe("sk-tab");
  });

  it("removes sessionStorage copies when opt-in is turned off", () => {
    setApiKey("cfg-1", "sk-tab", { rememberForTab: true });
    setApiKey("cfg-1", "sk-new", { rememberForTab: false });
    expect(isKeyRememberedForTab("cfg-1")).toBe(false);
    expect(getApiKey("cfg-1")).toBe("sk-new");
  });

  it("clears individual and all keys", () => {
    setApiKey("a", "1", { rememberForTab: true });
    setApiKey("b", "2", { rememberForTab: true });
    clearApiKey("a");
    expect(getApiKey("a")).toBeUndefined();
    expect(getApiKey("b")).toBe("2");
    clearAllKeys();
    expect(getApiKey("b")).toBeUndefined();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("never writes to localStorage", () => {
    setApiKey("cfg-1", "sk-x", { rememberForTab: true });
    // Object.keys works reliably across environments; `.length` does not —
    // see the beforeEach comment above for why.
    expect(Object.keys(window.localStorage)).toHaveLength(0);
  });
});
