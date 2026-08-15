import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps asset URLs working under any GitHub Pages sub-path.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
