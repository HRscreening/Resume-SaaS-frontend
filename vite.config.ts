import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  // Vite's default worker format is "iife", i.e. a CLASSIC worker. Both
  // interview execution workers are loaded with `?worker` and rely on a
  // dynamic import() at runtime (pyodide.worker.ts pulls Pyodide's ESM
  // build from a CDN), which classic workers do not support everywhere.
  // Dev already serves `?worker` as a module, so the mismatch only shows
  // up in a production build -- the worst place to find it. Pinning "es"
  // makes both builds agree with what the worker code actually needs.
  worker: {
    format: "es",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
