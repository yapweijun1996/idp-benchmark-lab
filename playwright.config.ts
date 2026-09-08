import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  use: {
    baseURL: "http://127.0.0.1:52173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port 52173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:52173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
