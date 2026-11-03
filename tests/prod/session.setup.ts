import { existsSync } from "node:fs";

import { expect, test as setup } from "@playwright/test";

const SESSION_FILE = "playwright/.auth/prod.json";
const EXPIRED = "Prod session expired or revoked: run pnpm test:prod:login";

setup("refresh the saved production session", async ({ browser, baseURL }) => {
  if (!existsSync(SESSION_FILE)) throw new Error(EXPIRED);

  const context = await browser.newContext({ storageState: SESSION_FILE });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/vistas`);
    // A redirect to /login means the stored session no longer works.
    if (new URL(page.url()).pathname.startsWith("/login")) {
      throw new Error(EXPIRED);
    }
    await expect(
      page.getByRole("heading", { level: 1, name: "Vistas" }),
    ).toBeVisible();
    // The app may have rotated the cookies: save them back so the next run still works.
    await context.storageState({ path: SESSION_FILE });
  } finally {
    await context.close();
  }
});
