import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Keep the wasm-bindgen package as native ESM: pre-bundling rewrites the
    // `new URL(..., import.meta.url)` lookup it uses to locate the .wasm file.
    exclude: ["@firecrawl/anydoc-wasm"],
  },
  worker: {
    format: "es",
  },
  build: {
    target: "es2022",
    sourcemap: false,
    // Keep the wasm a real file with a content hash: it is fetched lazily and
    // then cached immutably by Cloudflare and the browser.
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 700,
  },
});
