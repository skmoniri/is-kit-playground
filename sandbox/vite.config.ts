
import { defineConfig } from "vite";

export default defineConfig({
  root: "sandbox",
  base: "/",
  build: {
    outDir: "../dist-sandbox",
    emptyOutDir: true,
  },
});
