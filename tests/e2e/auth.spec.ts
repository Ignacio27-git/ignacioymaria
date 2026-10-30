import { expect, test, type Page } from "@playwright/test";

import { withDb } from "./db";
import { E2E_PEOPLE } from "./global-setup";
import { noNewMail, snapshotMailbox, waitForMagicLink } from "./mailpit";

const [ignacio, maria] = E2E_PEOPLE;
const OUTSIDER = "e2e-outsider@example.test";
const NEUTRAL = "Si este correo puede entrar, te llegará un enlace.";

// The local auth server throttles repeated requests for one address (1 s).
const SAME_ADDRESS_GAP_MS = 1_100;

test.describe.configure({ mode: "serial" });

async function requestLink(page: Page, typed: string) {
  await page.waitForTimeout(SAME_ADDRESS_GAP_MS);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(typed);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("status")).toHaveText(NEUTRAL);
}

async function signIn(page: Page, email: string) {
  const known = await snapshotMailbox(email);
  await requestLink(page, email);
  const link = await waitForMagicLink(email, known);
  await page.goto(link);
  return link;
}

test("an allowlisted person signs in, stays signed in and signs out", async ({ page }) => {
  await signIn(page, ignacio.email);

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Ignacio y María" }),
  ).toBeVisible();
  await expect(page.getByText("Sesión iniciada como Ignacio")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Sesión iniciada como Ignacio")).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("a magic link works once", async ({ page }) => {
  const link = await signIn(page, ignacio.email);
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: "Salir" }).click();
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

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Sesión iniciada como María")).toBeVisible();
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
  await expect(page.getByText("Sesión iniciada como María")).toBeVisible();

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
