import { defineConfig } from "vite";

export default defineConfig({
  // No "root" needed — vite.config.js is already next to index.html
  base: "/",

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});