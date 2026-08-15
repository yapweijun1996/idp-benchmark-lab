import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so vitest's bundled Vite never
// conflicts with the app's Vite plugin types at typecheck time.
// JSX in tests is transformed by Vite's default esbuild automatic runtime.
export default defineConfig({
  resolve: {
    alias: [
      {
        // The real pdfjs-dist module OOMs under jsdom; tests use a stub and
        // mock its getDocument. Type checking still uses the real types.
        find: /^pdfjs-dist$/,
        replacement: fileURLToPath(new URL("./src/test/pdfjs-stub.ts", import.meta.url)),
      },
      {
        // Exact alias for the worker asset so the prefix rule above cannot
        // rewrite this sub-path into a non-existent stub location.
        find: /^pdfjs-dist\/build\/pdf\.worker\.min\.mjs$/,
        replacement: fileURLToPath(new URL("./src/test/pdfjs-worker-stub.mjs", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
