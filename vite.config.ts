import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };
import { PWA_MANIFEST, WORKBOX_GLOB_PATTERNS } from "./src/pwa/config.ts";

// base "./" keeps asset URLs working under any GitHub Pages sub-path.
export default defineConfig({
  base: "./",
  define: {
    __APP_BUILD__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: PWA_MANIFEST,
      workbox: {
        // App shell only (ARCHITECTURE.md / SECURITY.md / PWA.md):
        // precache build assets; never runtime-cache provider traffic,
        // API keys, PDFs, generated page images, or benchmark results.
        globPatterns: WORKBOX_GLOB_PATTERNS,
        navigateFallback: "index.html",
        runtimeCaching: [],
      },
    }),
  ],
});
