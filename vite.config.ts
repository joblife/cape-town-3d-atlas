import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built atlas runs from any static host or subfolder.
  base: "./",
  build: {
    target: "es2022",
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { maplibre: ["maplibre-gl"] },
      },
    },
  },
});
