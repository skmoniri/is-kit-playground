import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 15000,
  use: {
    browserName: "chromium",
    channel: "chrome",
    headless: true,
  },
});
