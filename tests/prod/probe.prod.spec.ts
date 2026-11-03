import { allowServerActions, expect, test } from "./read-only";

// Same text as the local e2e suite (tests/e2e/session.ts).
const NEUTRAL = "Si este correo puede entrar, te llegará un enlace.";

// A non-allowlisted address must get the neutral message and no redirect.
// That no auth user was created is checked by hand (runbook: Auth > Users = 2).
test("a non-allowlisted address gets the neutral message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("not-allowed@example.com");
  // The only allowed POST: the magic-link request server action.
  await allowServerActions(page, async () => {
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByRole("status")).toHaveText(NEUTRAL);
  });
  await expect(page).toHaveURL(/\/login$/);
});
