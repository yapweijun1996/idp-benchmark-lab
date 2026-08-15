/**
 * Service-worker precache policy (SECURITY.md / PWA.md): app shell only.
 * Static extensions only — provider traffic, keys, PDFs, generated page
 * images, and benchmark results must never be precached or runtime-cached.
 * Audited by src/security.audit.test.ts.
 */
export const WORKBOX_GLOB_PATTERNS = ["**/*.{js,css,html,svg,png,ico,woff2}"];

export const PWA_MANIFEST = {
  name: "IDP Benchmark Lab",
  short_name: "IDP Lab",
  description: "Static BYOK PWA for repeatable IDP extraction benchmarking",
  theme_color: "#1f5cff",
  background_color: "#f5f6f8",
  display: "standalone" as const,
  start_url: "./",
  scope: "./",
  icons: [
    { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
    { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
    { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
