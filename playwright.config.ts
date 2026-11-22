import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3018",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 900 } },
    },
    {
      name: "mobile",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command:
      "corepack yarn build:e2e && corepack yarn vite preview --outDir .e2e-dist --host 127.0.0.1 --port 3018 --strictPort",
    url: "http://127.0.0.1:3018",
    timeout: 120000,
    reuseExistingServer: false,
    env: { VITE_API_URL: "http://127.0.0.1:3999/api/v1" },
  },
});
