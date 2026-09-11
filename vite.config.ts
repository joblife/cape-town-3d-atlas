import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built atlas runs from any static host or subfolder.
  base: "./",
  build: {
    target: "es2022",
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      // Two products from one codebase: the atlas at the root, and the walkable
      // city under /stapkaap/. Both share the content layer and the light model.
      input: {
        main: resolve(__dirname, "index.html"),
        stapkaap: resolve(__dirname, "stapkaap/index.html"),
      },
      output: {
        manualChunks: { maplibre: ["maplibre-gl"] },
      },
    },
  },
});
