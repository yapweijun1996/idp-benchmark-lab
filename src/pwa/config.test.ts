import { describe, expect, it } from "vitest";
import { PWA_MANIFEST, WORKBOX_GLOB_PATTERNS } from "./config";

describe("PWA configuration", () => {
  it("keeps installability metadata scoped to the static app", () => {
    expect(PWA_MANIFEST.id).toBe("./");
    expect(PWA_MANIFEST.start_url).toBe("./");
    expect(PWA_MANIFEST.scope).toBe("./");
    expect(PWA_MANIFEST.display).toBe("standalone");
    expect(PWA_MANIFEST.theme_color).toMatch(/^#/);
    expect(PWA_MANIFEST.background_color).toMatch(/^#/);
    expect(PWA_MANIFEST.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "pwa-512x512.png", sizes: "512x512", type: "image/png" }),
      expect.objectContaining({ purpose: "maskable" }),
    ]));
  });

  it("limits Workbox precache patterns to app-shell extensions", () => {
    expect(WORKBOX_GLOB_PATTERNS).toEqual(["**/*.{js,mjs,css,html,svg,png,ico,woff2}"]);
    expect(WORKBOX_GLOB_PATTERNS.join(" ")).not.toMatch(/pdf|json|csv|txt|webp|jpeg/i);
  });
});
