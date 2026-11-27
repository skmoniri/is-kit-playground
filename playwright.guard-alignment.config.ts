import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "guard-alignment.spec.ts",
  use: { browserName: "chromium", channel: "chrome", baseURL: "http://127.0.0.1:5173" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
