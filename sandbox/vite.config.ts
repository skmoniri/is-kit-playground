
import { defineConfig } from "vite";

export default defineConfig({
  root: "sandbox",
  base: "/",

  server: {
    host: "127.0.0.1",
    port: 3001,
    strictPort: true,
  },

  preview: {
    host: "127.0.0.1",
    port: 3001,
    strictPort: true,
  },

  build: {
    outDir: "../dist-sandbox",
    emptyOutDir: true,
  },
});
