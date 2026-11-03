import { existsSync } from "node:fs";

import { expect, test } from "./read-only";

// The TMDB token must never reach the browser. The value is only compared,
// never printed: the assertion is on a boolean.
test("the TMDB token is not in any served script", async ({ page }) => {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  test.skip(!token, "TMDB_READ_ACCESS_TOKEN is not set locally");

  const bodies: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") {
      bodies.push(response.text().catch(() => ""));
    }
  });

  for (const path of ["/login", "/vistas", "/anadir"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  const scripts = await Promise.all(bodies);
  expect(scripts.length).toBeGreaterThan(0);
  const leaked = scripts.some((body) => body.includes(token as string));
  expect(leaked).toBe(false);
});
