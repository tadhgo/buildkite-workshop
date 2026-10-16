import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

if (!existsSync(join(__dirname, "dist", "index.html"))) {
  throw new Error(
    "web/dist/ not found. E2E runs against the built app, so dist/ has to exist before it starts.",
  );
}

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
