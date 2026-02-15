import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm --filter web dev --port 3000",
        url: "http://127.0.0.1:3000/login",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
