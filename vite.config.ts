import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";

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
      manifest: {
        name: "IDP Benchmark Lab",
        short_name: "IDP Lab",
        description: "Static BYOK PWA for repeatable IDP extraction benchmarking",
        theme_color: "#1f5cff",
        background_color: "#f5f6f8",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell only (ARCHITECTURE.md / SECURITY.md / PWA.md):
        // precache build assets; never runtime-cache provider traffic,
        // API keys, PDFs, generated page images, or benchmark results.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [],
      },
    }),
  ],
});
