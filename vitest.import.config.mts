import { defineConfig } from "vitest/config";

// Integration tests of the importer against the LOCAL Supabase database
// (`pnpm db:start`). Not part of the default `pnpm test` run.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/import/**/*.integration.test.ts"],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
