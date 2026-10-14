import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 180000,
  expect: { timeout: 20000 },
  reporter: "list",
  use: { baseURL: "http://localhost:3112", browserName: "chromium", headless: true, trace: "off", screenshot: "off", actionTimeout: 20000, navigationTimeout: 30000 },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3112",
    url: "http://localhost:3112/login",
    timeout: 60000,
    reuseExistingServer: false,
  },
});
