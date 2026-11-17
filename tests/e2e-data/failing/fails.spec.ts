import { expect, test } from "@playwright/test";

import { FAILING_TEST_TITLE } from "../../../scripts/e2e/data-check";
import { clearTitles } from "../../e2e/titles-db";
import { withDb } from "../../e2e/db";

// Run only through playwright.failing.config.ts. It wipes the titles table on
// purpose and then fails, so the run proves the data comes back after a failure.
test(FAILING_TEST_TITLE, async () => {
  await clearTitles();
  const remaining = await withDb(async (client) => {
    const { rows } = await client.query("select count(*)::int as n from public.titles");
    return Number(rows[0].n);
  });
  // Without this the failure could come from a run that never reached the wipe.
  expect(remaining, "the titles table was emptied before failing").toBe(0);
  expect(true, "deliberate failure").toBe(false);
});
