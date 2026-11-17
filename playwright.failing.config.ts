import { defineConfig } from "@playwright/test";

// CI only (and a deliberate local check): one test that empties the titles
// table and then fails. The run must exit non-zero AND the data must come back
// (scripts/e2e/data-check.ts). No web server: the test only talks to the database.
export default defineConfig({
  testDir: "./tests/e2e-data/failing",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  retries: 0,
  workers: 1,
  outputDir: "test-results/failing",
  reporter: [["list"], ["json", { outputFile: "test-results/failing-report.json" }]],
});
