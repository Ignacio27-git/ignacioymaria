import { expect, test, type Page } from "@playwright/test";

import { E2E_PEOPLE } from "./global-setup";
import { signIn } from "./session";
import { clearTitles, seedTitles } from "./titles-db";

const [ignacio] = E2E_PEOPLE;

// One serial journey: a failed stage stops the rest. It owns the titles table
// while it runs (the "smoke" project sits before "ui" and "titles" in the chain).
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await clearTitles();
});

test.afterAll(async () => {
  await clearTitles();
});

/** Opens a path and waits for the network to settle, so React has hydrated. */
async function visit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** The state radios are sr-only: the visible label is what a person taps. */
function stateOption(page: Page, label: string) {
  return page.locator("fieldset label").filter({ hasText: new RegExp(`^${label}$`) });
}

async function expectSaved(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

test("login, add, rate, mark Pendiente and find a title", async ({ page }) => {
  test.setTimeout(120_000);

  await test.step("login through the magic link", async () => {
    await signIn(page, ignacio.email);
    await expect(page).toHaveURL("/vistas");
  });

  await test.step("add Dune from the TMDB double", async () => {
    await visit(page, "/vistas");
    await page.getByRole("link", { name: "Añadir" }).click();
    await page.getByLabel("Buscar película o serie").fill("Dune");
    // The double also returns "Dune: Prophecy": pick the film by its year.
    await page.getByRole("button", { name: /^Dune 2021/ }).click();
    await expect(page).toHaveURL(/\/titulo\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dune" })).toBeVisible();
  });

  await test.step("rate it and keep the rating after a reload", async () => {
    await page.getByRole("button", { name: "8", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Nota guardada" })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Media 8/ })).toBeVisible();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("img", { name: /^Media 8/ })).toBeVisible();
  });

  await test.step("mark it Pendiente and keep the state after a reload", async () => {
    await stateOption(page, "Pendiente").click();
    await expectSaved(page);
    await expect(page.getByRole("radio", { name: "Pendiente" })).toBeChecked();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("radio", { name: "Pendiente" })).toBeChecked();
  });

  await test.step("find it by searching in Pendientes", async () => {
    // A second, non-matching title, so the search has something to filter out.
    await seedTitles([{ name: "Oppenheimer", state: "pending" }]);
    await visit(page, "/pendientes");

    const rows = page.locator('a[href^="/titulo/"]');
    await expect(rows).toHaveCount(2);

    await page.getByRole("searchbox", { name: "Buscar" }).fill("dune");
    await expect(page).toHaveURL("/pendientes?q=dune");
    await expect(rows).toHaveCount(1);
    await expect(rows.filter({ hasText: "Dune" })).toBeVisible();
    await expect(page.getByText("Oppenheimer")).toBeHidden();
  });
});
