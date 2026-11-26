import { defineConfig } from "vite";

const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-eval'",
  "worker-src 'self' blob:",
  "connect-src 'none'",
  "img-src 'none'",
  "style-src 'none'",
  "font-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const sandboxHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Security-Policy": contentSecurityPolicy,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

export default defineConfig({
  root: "sandbox",
  base: "/",

  server: {
    host: "127.0.0.1",
    port: 3001,
    strictPort: true,
    headers: sandboxHeaders,
  },

  preview: {
    host: "127.0.0.1",
    port: 3001,
    strictPort: true,
    headers: sandboxHeaders,
  },

  build: {
    outDir: "../dist-sandbox",
    emptyOutDir: true,
  },
});
