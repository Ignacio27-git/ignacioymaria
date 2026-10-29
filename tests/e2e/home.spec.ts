import { expect, test } from "@playwright/test";

test("home page renders the title and heading", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Ignacio y María");
  await expect(
    page.getByRole("heading", { level: 1, name: "Ignacio y María" }),
  ).toBeVisible();
});
