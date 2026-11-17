import { defineConfig } from "vitest/config";

// Integration tests of the E2E data preservation (scripts/e2e) against the LOCAL
// Supabase database (`pnpm db:start`). Every write happens inside one
// transaction that is rolled back. Not part of the default `pnpm test` run.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/e2e-data/**/*.integration.test.ts"],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
