/**
 * Captures the production session for `pnpm test:prod`.
 *
 *   pnpm test:prod:login
 *
 * Opens a headed browser at /login. Request the link with an allowlisted
 * address, then paste the magic link from the email into THIS window. Once
 * /vistas loads, the cookies are saved to playwright/.auth/prod.json
 * (gitignored). Nothing secret is printed.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { chromium } from "@playwright/test";

import { readProdBaseUrl } from "./prod/env";

const SESSION_FILE = "playwright/.auth/prod.json";
const WAIT_MS = 10 * 60 * 1000;

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const baseURL = readProdBaseUrl(process.env);

  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseURL}/login`);
    console.log(
      "Request the link in the window, then paste it into that window's address bar. Waiting up to 10 minutes.",
    );
    await page.waitForURL(`${baseURL}/vistas`, { timeout: WAIT_MS });
    await mkdir(dirname(SESSION_FILE), { recursive: true });
    await context.storageState({ path: SESSION_FILE });
    console.log(`Session saved to ${SESSION_FILE}.`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
