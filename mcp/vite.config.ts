import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// Builds ui/viewer.html + its JS/CSS into one self-contained dist/viewer.html,
// which the Worker serves as the MCP App resource (no external script hosts → no CSP config).
export default defineConfig({
  root: path.resolve(import.meta.dirname, "ui"),
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, ".."),
      // The shared components live outside mcp/ and would otherwise resolve
      // the root app's React: two copies break hooks. Force a single copy.
      react: path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(import.meta.dirname, "ui/viewer.html") },
  },
});
