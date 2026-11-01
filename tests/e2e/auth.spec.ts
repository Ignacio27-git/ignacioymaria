import { expect, test, type Page } from "@playwright/test";

import { withDb } from "./db";
import { E2E_PEOPLE } from "./global-setup";
import { noNewMail, snapshotMailbox, waitForMagicLink } from "./mailpit";
import { requestLink, signIn } from "./session";

const [ignacio, maria] = E2E_PEOPLE;
const OUTSIDER = "e2e-outsider@example.test";

/** The header menu (native popover) holds the session line and sign-out. */
async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Menú" }).click();
}

function menuSession(page: Page, person: string) {
  return page.getByText(`Sesión de ${person}`);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
}

test.describe.configure({ mode: "serial" });

test("an allowlisted person signs in, stays signed in and signs out", async ({ page }) => {
  await signIn(page, ignacio.email);

  await expect(page).toHaveURL("/vistas");
  await expect(
    page.getByRole("heading", { level: 1, name: "Vistas" }),
  ).toBeVisible();
  await expect(menuSession(page, "Ignacio")).toBeHidden();
  await openMenu(page);
  await expect(menuSession(page, "Ignacio")).toBeVisible();

  await page.reload();
  await openMenu(page);
  await expect(menuSession(page, "Ignacio")).toBeVisible();

  await signOut(page);
  await expect(page).toHaveURL("/login");

  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("a magic link works once", async ({ page }) => {
  const link = await signIn(page, ignacio.email);
  await expect(page).toHaveURL("/vistas");
  await openMenu(page);
  await signOut(page);
  await expect(page).toHaveURL("/login");

  await page.goto(link);

  await expect(page).toHaveURL("/login");
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("an outsider gets the same message, no mail and no user", async ({ page }) => {
  const known = await snapshotMailbox(OUTSIDER);

  await requestLink(page, OUTSIDER);

  expect(await noNewMail(OUTSIDER, known)).toBe(true);
  const users = await withDb((client) =>
    client.query("select count(*)::int as n from auth.users where email = $1", [
      OUTSIDER,
    ]),
  );
  expect(users.rows[0].n).toBe(0);
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("the email is trimmed and matched case-insensitively", async ({ page }) => {
  const known = await snapshotMailbox(maria.email);
  await requestLink(page, "  E2E-Maria@Example.TEST ");

  await page.goto(await waitForMagicLink(maria.email, known));

  await expect(page).toHaveURL("/vistas");
  await openMenu(page);
  await expect(menuSession(page, "María")).toBeVisible();
});

test("a bad token goes to /login without a session", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=x&type=email");

  await expect(page).toHaveURL("/login");
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("without a session / is protected and /login is public", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");

  await page.goto("/login");
  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
});

test("removing the email from the allowlist ends access immediately", async ({ page }) => {
  await signIn(page, maria.email);
  await openMenu(page);
  await expect(menuSession(page, "María")).toBeVisible();

  await withDb((client) =>
    client.query("delete from public.allowed_emails where email = $1", [
      maria.email,
    ]),
  );
  try {
    await page.reload();

    await expect(page).toHaveURL("/login");
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  } finally {
    await withDb((client) =>
      client.query(
        "insert into public.allowed_emails (email, person) values ($1, $2) on conflict do nothing",
        [maria.email, maria.person],
      ),
    );
  }
});
