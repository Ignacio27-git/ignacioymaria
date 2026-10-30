import { expect, type Browser, type Page } from "@playwright/test";

import { snapshotMailbox, waitForMagicLink } from "./mailpit";

export const NEUTRAL = "Si este correo puede entrar, te llegará un enlace.";

// The local auth server throttles repeated requests for one address (1 s).
const SAME_ADDRESS_GAP_MS = 1_100;

/** Types an address into the login form and waits for the neutral message. */
export async function requestLink(page: Page, typed: string) {
  await page.waitForTimeout(SAME_ADDRESS_GAP_MS);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(typed);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toHaveText(NEUTRAL);
}

/** Signs `email` in through the real magic-link flow and returns the link. */
export async function signIn(page: Page, email: string) {
  const known = await snapshotMailbox(email);
  await requestLink(page, email);
  const link = await waitForMagicLink(email, known);
  await page.goto(link);
  return link;
}

/**
 * Signs in once in a throwaway context and saves its cookies. Specs reuse the
 * file so each test opens its own viewport/scheme without another magic link.
 * Never sign out in a spec that shares this state: Supabase signOut() is global.
 */
export async function saveSignedInState(
  browser: Browser,
  email: string,
  path: string,
) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await signIn(page, email);
    await expect(page).toHaveURL("/");
    await context.storageState({ path });
  } finally {
    await context.close();
  }
}
