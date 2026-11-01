import { expect, test, type Browser, type Page } from "@playwright/test";
import axe from "axe-core";

import { E2E_PEOPLE } from "./global-setup";
import { saveSignedInState } from "./session";
import {
  clearTitles,
  countTitles,
  seedTitles,
  todayInMadrid,
} from "./titles-db";

const [ignacio] = E2E_PEOPLE;
const STATE_FILE = "test-results/titles-session.json";

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };
const WIDE = { width: 1440, height: 900 };

const VIEWPORTS = [
  { name: "desktop-1280", size: DESKTOP },
  { name: "desktop-1440", size: WIDE },
  { name: "mobile-390", size: MOBILE },
] as const;
const SCHEMES = ["light", "dark"] as const;

// Serial: one sign-in, one shared titles table.
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(90_000);
  await saveSignedInState(browser, ignacio.email, STATE_FILE);
});

test.afterAll(async () => {
  await clearTitles();
});

async function openPage(
  browser: Browser,
  options: {
    viewport?: { width: number; height: number };
    colorScheme?: (typeof SCHEMES)[number];
  } = {},
) {
  const context = await browser.newContext({
    storageState: STATE_FILE,
    viewport: options.viewport ?? MOBILE,
    colorScheme: options.colorScheme,
  });
  const page = await context.newPage();
  return { context, page };
}

/** The visible text of the list rows, in order. */
function rows(page: Page) {
  return page.locator('a[href^="/titulo/"]');
}

/**
 * Opens a path and waits for the network to settle, so React has hydrated the
 * controls before a test types into them (a fill before that is lost).
 */
async function visit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

function dateInput(page: Page) {
  return page.getByLabel("Fecha de visionado");
}

/** The state radios are sr-only: the visible label is what a person taps. */
function stateOption(page: Page, label: string) {
  return page.locator("fieldset label").filter({ hasText: new RegExp(`^${label}$`) });
}

async function expectSaved(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// Add and ficha
// ---------------------------------------------------------------------------

test.describe("add, edit and delete a title at 390px", () => {
  test.beforeAll(async () => {
    await clearTitles();
  });

  test("/ goes to /vistas for a signed-in person", async ({ browser }) => {
    const { context, page } = await openPage(browser);
    await page.goto("/");
    await expect(page).toHaveURL("/vistas");
    await expect(
      page.getByRole("heading", { level: 1, name: "Vistas" }),
    ).toBeVisible();
    await context.close();
  });

  test("from Vistas, a TMDB pick is added as Vista with today's date in three taps", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser);
    await visit(page, "/vistas");

    // Step 1: Añadir. Step 2: type. Step 3: pick.
    await page.getByRole("link", { name: "Añadir" }).click();
    await expect(page).toHaveURL("/anadir?desde=vistas");
    await page.getByLabel("Buscar película o serie").fill("Dune");
    await expect(page.getByRole("list", { name: "Resultados de TMDB" })).toBeVisible();
    await page.getByRole("button", { name: /^Dune 2021/ }).click();

    await expect(page).toHaveURL(/\/titulo\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dune" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Vista", exact: true })).toBeChecked();
    await expect(dateInput(page)).toHaveValue(todayInMadrid());
    await expect(page.getByText("Reparto: Timothée Chalamet, Zendaya")).toBeVisible();
    await expect(page.getByRole("link", { name: "TMDB" })).toBeVisible();
    await context.close();
  });

  test("from Pendientes, a TMDB series is added as Pendiente with no date", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser);
    await visit(page, "/pendientes");
    await page.getByRole("link", { name: "Añadir" }).click();
    await expect(page).toHaveURL("/anadir?desde=pendientes");

    await page.getByLabel("Buscar película o serie").fill("Dark");
    await page.getByRole("button", { name: /^Dark 2017/ }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Dark" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Pendiente" })).toBeChecked();
    await expect(dateInput(page)).toHaveValue("");
    await context.close();
  });

  test("a title already in the list is blocked with a link to its ficha", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser);
    await visit(page, "/anadir");
    await page.getByLabel("Buscar película o serie").fill("Dune");

    const results = page.getByRole("list", { name: "Resultados de TMDB" });
    const dune = results.getByRole("listitem").filter({ hasText: "2021" });
    await expect(dune.getByText("Ya está en la lista")).toBeVisible();
    // The series with a similar name is still free to add.
    await expect(
      results.getByRole("button", { name: /^Dune: Prophecy/ }),
    ).toBeVisible();
    await expect(dune.getByRole("button")).toHaveCount(0);

    await dune.getByRole("link", { name: "Abrir ficha" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Dune" })).toBeVisible();
    expect(await countTitles("Dune")).toBe(1);
    await context.close();
  });

  test("a title with no TMDB match is added by hand and keeps no attribution", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser);
    await visit(page, "/anadir");

    await page.getByLabel("Buscar película o serie").fill("zzzz");
    await expect(page.getByText("Sin resultados")).toBeVisible();
    await page.getByRole("link", { name: "Añadir a mano" }).click();

    // An empty title is refused with its own message.
    await page.getByRole("button", { name: "Añadir a la lista" }).click();
    await expect(page.getByText("Introduce un título")).toBeVisible();

    await page.getByLabel("Título", { exact: true }).fill("Mi serie casera");
    await page.locator("label").filter({ hasText: /^Serie$/ }).click();
    await page.getByRole("button", { name: "Añadir a la lista" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Mi serie casera" }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: "Pendiente" })).toBeChecked();
    await expect(page.getByRole("link", { name: "TMDB" })).toHaveCount(0);
    await context.close();
  });

  test("the ficha edits score, state, date and observations in place", async ({
    browser,
  }) => {
    const today = todayInMadrid();
    const { context, page } = await openPage(browser);
    await visit(page, "/pendientes");
    await page.getByRole("link", { name: /Mi serie casera/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Mi serie casera" }),
    ).toBeVisible();

    // Score: a whole point, then a quarter step, saved by the server.
    await page.getByRole("button", { name: "8", exact: true }).click();
    await expect(page.getByRole("button", { name: "8", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("status").filter({ hasText: "Nota guardada" })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Media 8/ })).toBeVisible();
    await page.getByRole("button", { name: "Subir un cuarto de punto" }).click();
    await expect(page.getByText("Tu nota: 8,25")).toBeAttached();
    await expectSaved(page);

    // State: a watched state on an unknown date saves today with it (A2).
    await expect(dateInput(page)).toHaveValue("");
    await stateOption(page, "Vista, repetir").click();
    await expect(page.getByRole("radio", { name: "Vista, repetir" })).toBeChecked();
    await expect(dateInput(page)).toHaveValue(today);

    // Date: a typed day is respected, then "No sé cuándo" clears it.
    await dateInput(page).fill("2025-03-14");
    await expect(page.getByText("14 mar 2025")).toBeVisible();
    await expectSaved(page);
    await page.getByRole("button", { name: "No sé cuándo" }).click();
    await expect(dateInput(page)).toHaveValue("");
    await expectSaved(page);

    // A non-watched state never touches the date; "Hoy" fills it in.
    await stateOption(page, "Pendiente").click();
    await expect(page.getByRole("radio", { name: "Pendiente" })).toBeChecked();
    await expectSaved(page);
    await expect(dateInput(page)).toHaveValue("");
    await page.getByRole("button", { name: "Hoy" }).click();
    await expect(dateInput(page)).toHaveValue(today);
    await expectSaved(page);

    // Observations: saved on blur, line breaks kept.
    const notes = page.getByLabel("Observaciones");
    await notes.fill("Primera línea\nSegunda línea");
    await notes.blur();
    await expectSaved(page);

    await page.reload();
    await expect(page.getByRole("radio", { name: "Pendiente" })).toBeChecked();
    await expect(page.getByText("Tu nota: 8,25")).toBeAttached();
    await expect(dateInput(page)).toHaveValue(today);
    await expect(page.getByLabel("Observaciones")).toHaveValue(
      "Primera línea\nSegunda línea",
    );
    await context.close();
  });

  test("delete asks first, Escape and Cancelar keep the title, Eliminar removes it", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser);
    await visit(page, "/pendientes");
    await page.getByRole("link", { name: /Mi serie casera/ }).click();
    const ficha = page.url();

    const open = page.getByRole("button", { name: "Eliminar", exact: true });
    await open.click();
    const dialog = page.getByRole("dialog", { name: "¿Eliminar «Mi serie casera»?" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();

    await open.click();
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    expect(await countTitles("Mi serie casera")).toBe(1);

    await open.click();
    await dialog.getByRole("button", { name: "Eliminar" }).click();
    await expect(page).toHaveURL("/pendientes");
    await expect(page.getByRole("link", { name: /Mi serie casera/ })).toHaveCount(0);
    expect(await countTitles("Mi serie casera")).toBe(0);

    // The old link now answers with the not-found page, not an error.
    await visit(page, ficha);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Mi serie casera");
    await context.close();
  });
});

// ---------------------------------------------------------------------------
// Lists: search, filter and sort live in the URL
// ---------------------------------------------------------------------------

test.describe("lists keep search, filter and sort in the URL", () => {
  test.beforeAll(async () => {
    await clearTitles();
    await seedTitles([
      { name: "Amélie", state: "watched", watchDate: "2024-02-10", scoreIgnacio: 9, scoreMaria: 8 },
      { name: "Matrix", state: "watched_rewatch", watchDate: "2025-06-01", scoreIgnacio: 7 },
      { name: "Dark", kind: "series", state: "watched_awful", watchDate: "2023-11-20", scoreIgnacio: 2, scoreMaria: 3 },
      { name: "Dune", state: "watched" },
      { name: "Zeta", state: "pending", createdAt: "2026-10-01T10:00:00Z" },
      { name: "Beta", state: "urgent", createdAt: "2026-09-01T10:00:00Z" },
      { name: "Alfa", state: "pending", createdAt: "2026-10-20T10:00:00Z", scoreIgnacio: 6 },
    ]);
  });

  test("Vistas sorts by watch date, then by score, and the choice survives a reload", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await visit(page, "/vistas");

    await expect(rows(page)).toHaveText([/Matrix/, /Amélie/, /Dark/, /Dune/]);

    await page.getByLabel("Ordenar").selectOption("score:desc");
    await expect(page).toHaveURL("/vistas?orden=nota");
    await expect(rows(page)).toHaveText([/Amélie/, /Matrix/, /Dark/, /Dune/]);

    await page.reload();
    await expect(page.getByLabel("Ordenar")).toHaveValue("score:desc");
    await expect(rows(page)).toHaveText([/Amélie/, /Matrix/, /Dark/, /Dune/]);
    await context.close();
  });

  test("search ignores case and accents, and Limpiar filtros resets it", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await visit(page, "/vistas");

    const search = page.getByRole("searchbox", { name: "Buscar" });
    await search.fill("AMELIE");
    await expect(page).toHaveURL("/vistas?q=AMELIE");
    await expect(rows(page)).toHaveText([/Amélie/]);

    await search.fill("nada de nada");
    await expect(page.getByText("Sin resultados")).toBeVisible();
    await page.getByRole("link", { name: "Limpiar filtros" }).click();
    await expect(page).toHaveURL("/vistas");
    await expect(search).toHaveValue("");
    await expect(rows(page)).toHaveCount(4);
    await context.close();
  });

  test("state chips filter, combine with search and come back with the browser", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await visit(page, "/vistas");

    const awful = page.getByRole("button", { name: "Vista y horrible" });
    await awful.click();
    await expect(page).toHaveURL("/vistas?estado=watched_awful");
    await expect(awful).toHaveAttribute("aria-pressed", "true");
    await expect(rows(page)).toHaveText([/Dark/]);

    await page.getByRole("button", { name: "Vista, repetir" }).click();
    await expect(page).toHaveURL(/estado=watched_rewatch%2Cwatched_awful|estado=watched_rewatch,watched_awful/);
    await expect(rows(page)).toHaveText([/Matrix/, /Dark/]);

    await awful.click();
    await expect(rows(page)).toHaveText([/Matrix/]);

    // A shared link with junk in it still renders the list.
    await visit(page, "/vistas?estado=urgent,bogus&orden=zzz&q=");
    await expect(rows(page)).toHaveCount(4);
    await context.close();
  });

  test("Pendientes starts urgent first, and fecha means when it was added", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await visit(page, "/pendientes");

    await expect(rows(page)).toHaveText([/Beta/, /Alfa/, /Zeta/]);

    await page.getByLabel("Ordenar").selectOption("date:desc");
    await expect(page).toHaveURL("/pendientes?orden=fecha");
    await expect(rows(page)).toHaveText([/Alfa/, /Zeta/, /Beta/]);
    await expect(page.getByRole("row").filter({ hasText: "Alfa" })).toContainText("20 oct 2026");

    await page.getByLabel("Ordenar").selectOption("score:desc");
    await expect(rows(page).first()).toContainText("Alfa");

    await page.getByRole("button", { name: "Urgente de ver" }).click();
    await expect(rows(page)).toHaveText([/Beta/]);
    await context.close();
  });
});

// ---------------------------------------------------------------------------
// Pages: layout, accessibility and hydration at every viewport and theme
// ---------------------------------------------------------------------------

async function expectNoAxeViolations(page: Page) {
  await page.evaluate(axe.source);
  const { passes, violations } = await page.evaluate(async () => {
    const results = await (
      window as unknown as { axe: typeof import("axe-core") }
    ).axe.run(
      { exclude: [["nextjs-portal"]] },
      {},
    );
    return {
      passes: results.passes.length,
      violations: results.violations.map(
        (v) =>
          `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
      ),
    };
  });
  // A run that checked nothing would be a vacuous pass.
  expect(passes).toBeGreaterThan(10);
  expect(violations).toEqual([]);
}

// Hydration warnings only: Next's dev-only "instant navigation" insights also
// reach the console on these routes and are not what this guard is about.
const HYDRATION = /hydrat|did not match|server rendered html/i;

test.describe("pages at every viewport and theme", () => {
  let ficha: string;

  test.beforeAll(async () => {
    await clearTitles();
    const ids = await seedTitles([
      { name: "Amélie", state: "watched", watchDate: "2024-02-10", scoreIgnacio: 9, scoreMaria: 8 },
      { name: "Matrix", state: "watched_rewatch", watchDate: "2025-06-01", scoreIgnacio: 7 },
      { name: "Dune", state: "watched" },
      { name: "Alfa", state: "pending", createdAt: "2026-10-20T10:00:00Z", scoreIgnacio: 6 },
      { name: "Beta", state: "urgent", createdAt: "2026-09-01T10:00:00Z" },
    ]);
    ficha = `/titulo/${ids["Amélie"]}`;
  });

  for (const { name, size } of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      test(`${name} in ${scheme}: no overflow, no axe violations, no hydration warning`, async ({
        browser,
      }, testInfo) => {
        const { context, page } = await openPage(browser, {
          viewport: size,
          colorScheme: scheme,
        });
        const problems: string[] = [];
        page.on("console", (message) => {
          if (["error", "warning"].includes(message.type())) {
            problems.push(message.text());
          }
        });
        page.on("pageerror", (error) => problems.push(error.message));

        for (const path of ["/vistas", "/pendientes", "/anadir", ficha]) {
          await page.goto(path);
          await page.waitForLoadState("networkidle");
          await page.evaluate(() => document.fonts.ready);

          const overflow = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth,
          }));
          expect(overflow.scroll, `${path} overflows`).toBeLessThanOrEqual(
            overflow.client,
          );

          await expectNoAxeViolations(page);

          const slug = path.startsWith("/titulo") ? "titulo" : path.slice(1);
          await page.screenshot({
            path: testInfo.outputPath(`${slug}-${name}-${scheme}.png`),
            fullPage: true,
            animations: "disabled",
          });
        }

        expect(problems.filter((text) => HYDRATION.test(text))).toEqual([]);
        await context.close();
      });
    }
  }

  test("at 1440px Añadir sits on the right edge of the 760px column", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: WIDE });

    for (const path of ["/vistas", "/pendientes"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const main = (await page.getByRole("main").boundingBox())!;
      const add = (await page.getByRole("link", { name: "Añadir" }).boundingBox())!;
      expect(main.width).toBeLessThanOrEqual(760);
      expect(Math.abs(add.x + add.width - (main.x + main.width))).toBeLessThanOrEqual(1);
      expect(add.x).toBeGreaterThan(main.x);
    }
    await context.close();
  });

  test("at 390px Añadir keeps the thumb corner and the last row stays reachable", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: MOBILE });
    await visit(page, "/vistas");
    await page.waitForLoadState("networkidle");

    const add = (await page.getByRole("link", { name: "Añadir" }).boundingBox())!;
    expect(add.x + add.width).toBeLessThanOrEqual(MOBILE.width);
    expect(add.x + add.width).toBeGreaterThan(MOBILE.width - 40);
    expect(add.height).toBeGreaterThanOrEqual(44);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const last = (await rows(page).last().boundingBox())!;
    const fixed = (await page.getByRole("link", { name: "Añadir" }).boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(fixed.y);
    await context.close();
  });
});
