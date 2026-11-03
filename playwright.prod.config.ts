import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

import { readProdBaseUrl } from "./scripts/prod/env";

// ROADMAP 2.2: local, read-only check against the public production URL.
// No webServer and no globalSetup: nothing local is started. Never run in CI.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const SESSION_FILE = "playwright/.auth/prod.json";

export default defineConfig({
  testDir: "./tests/prod",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  // No html report and no traces: traces store cookies (the session).
  reporter: [["list"]],
  outputDir: "test-results/prod",
  use: {
    baseURL: readProdBaseUrl(process.env),
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // Loads the saved session, lets the app refresh it once and saves it back.
      name: "setup",
      testMatch: "**/session.setup.ts",
    },
    {
      name: "prod",
      testMatch: ["**/smoke.prod.spec.ts", "**/bundle.prod.spec.ts"],
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: SESSION_FILE },
    },
    {
      // Signed out on purpose: a non-allowlisted address must get the neutral message.
      name: "probe",
      testMatch: "**/probe.prod.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
});
