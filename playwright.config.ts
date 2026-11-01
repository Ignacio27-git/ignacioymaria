import { defineConfig, devices } from "@playwright/test";

// 127.0.0.1 (not localhost) so the magic-link host matches the cookie host.
const baseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // D-57: Supabase signOut() is global, so the auth specs (which sign out)
  // finish before the ui specs (which reuse a saved session) start.
  projects: [
    {
      name: "auth",
      testMatch: "**/auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "ui",
      testMatch: "**/design-system.spec.ts",
      dependencies: ["auth"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Owns the titles table: the only spec that writes to it.
      name: "titles",
      testMatch: "**/titles.spec.ts",
      // After "ui": both sign in as the same person, and one mailbox race is enough to fail.
      dependencies: ["ui"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // A4: TMDB is replaced by a deterministic server-side double (never in production).
    env: { TMDB_TEST_DOUBLE: "1" },
    timeout: 120_000,
  },
});
