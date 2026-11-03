import { allowServerActions, expect, test } from "./read-only";

test.describe("production smoke (read-only)", () => {
  test("the watched list loads signed in", async ({ page }) => {
    await page.goto("/vistas");
    await expect(
      page.getByRole("heading", { level: 1, name: "Vistas" }),
    ).toBeVisible();
  });

  test("the pending list loads signed in", async ({ page }) => {
    await page.goto("/pendientes");
    await expect(
      page.getByRole("heading", { level: 1, name: "Pendientes" }),
    ).toBeVisible();
  });

  test("a real TMDB search returns candidates", async ({ page }) => {
    await page.goto("/anadir");
    const results = page.getByRole("list", { name: "Resultados de TMDB" });
    // The search is a server action (POST): the only write-shaped request allowed.
    // No candidate is ever clicked, so nothing is created.
    await allowServerActions(page, async () => {
      await page.getByLabel("Buscar película o serie").fill("Dune");
      await expect(results).toBeVisible();
    });
    await expect(results.getByRole("listitem")).not.toHaveCount(0);
  });
});
