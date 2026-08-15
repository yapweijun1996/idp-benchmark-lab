import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so vitest's bundled Vite never
// conflicts with the app's Vite plugin types at typecheck time.
// JSX in tests is transformed by Vite's default esbuild automatic runtime.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
