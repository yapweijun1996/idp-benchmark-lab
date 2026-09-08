import { describe, expect, it } from "vitest";
import { PWA_MANIFEST, WORKBOX_GLOB_PATTERNS } from "./pwa/config";

/**
 * Security audit tests (TASK-054, SECURITY.md):
 * - service worker caches app-shell asset extensions only
 * - backups/exports carry no secret-like fields (enforced by backup import
 *   validation, tested in src/export/backup.test.ts)
 * - BYOK keys never reach localStorage (tested in src/providers/keys.test.ts)
 */
describe("service worker cache policy", () => {
  it("precaches static app-shell extensions only", () => {
    const joined = WORKBOX_GLOB_PATTERNS.join(" ");
    // 静态资产白名单
    expect(joined).toMatch(/js/);
    expect(joined).toMatch(/css/);
    expect(joined).toMatch(/html/);
    // 敏感内容扩展绝不出现
    for (const forbidden of ["pdf", "json", "txt", "csv", "png-base64"]) {
      expect(joined).not.toContain(forbidden === "png-base64" ? "png-base64" : forbidden);
    }
    expect(joined).not.toMatch(/pdf|json|txt|csv/);
  });

  it("manifest declares the expected identity without secrets", () => {
    expect(PWA_MANIFEST.id).toBe("./");
    expect(PWA_MANIFEST.start_url).toBe("./");
    expect(PWA_MANIFEST.scope).toBe("./");
    expect(PWA_MANIFEST.display).toBe("standalone");
    expect(PWA_MANIFEST.icons.length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(PWA_MANIFEST)).not.toMatch(/(?:gw_|sk-|api[_-]?key|token)/i);
  });
});
