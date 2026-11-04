import { expect, test, type Browser, type Page } from "@playwright/test";
import axe from "axe-core";

import { E2E_PEOPLE } from "./global-setup";
import { saveSignedInState } from "./session";
import {
  clearTitles,
  countTitles,
  requireSnapshot,
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
  // Fail before any destructive helper if the run has no pending snapshot.
  await requireSnapshot();
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

// A 1x1 PNG: card covers load from image.tmdb.org, which tests never reach.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

/** Answers every TMDB image request locally and returns the requested URLs. */
async function fulfilPosters(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route("https://image.tmdb.org/**", async (route) => {
    requested.push(route.request().url());
    await route.fulfill({ contentType: "image/png", body: PIXEL });
  });
  return requested;
}

type OpenContext = Awaited<ReturnType<typeof openPage>>["context"];

/** Stores the device's list view cookie, as the Server Action would. */
async function setView(context: OpenContext, value: string) {
  await context.addCookies([{ name: "list_view", value, url: "http://127.0.0.1:3000" }]);
}

const setGridView = (context: OpenContext) => setView(context, "grid");

/** The visible option of the view toggle; the radios themselves are sr-only. */
function viewOption(page: Page, label: "Tabla" | "Tarjetas") {
  return page
    .getByRole("radiogroup", { name: "Vista" })
    .locator("label")
    .filter({ hasText: new RegExp(`^${label}$`) });
}

function viewRadio(page: Page, label: "Tabla" | "Tarjetas") {
  return page.getByRole("radiogroup", { name: "Vista" }).getByRole("radio", { name: label });
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
// Card view: a per-device alternative to the table
// ---------------------------------------------------------------------------

const LONG_TITLE = "Harry Potter y las reliquias de la muerte parte 1 con un subtítulo larguísimo";

test.describe("the card view is a per-device alternative to the table", () => {
  test.beforeAll(async () => {
    await clearTitles();
    await seedTitles([
      { name: "Amélie", state: "watched", watchDate: "2024-02-10", scoreIgnacio: 9, scoreMaria: 8, posterPath: "/amelie.jpg" },
      { name: "Matrix", state: "watched_rewatch", watchDate: "2025-06-01", scoreIgnacio: 7 },
      { name: "Dark", kind: "series", state: "watched_awful", watchDate: "2023-11-20", scoreIgnacio: 2, scoreMaria: 3 },
      { name: "Dune", state: "watched" },
      { name: LONG_TITLE, state: "watched", watchDate: "2022-01-01", scoreMaria: 5 },
      { name: "Zeta", state: "pending", createdAt: "2026-10-01T10:00:00Z" },
      { name: "Beta", state: "urgent", createdAt: "2026-09-01T10:00:00Z", posterPath: "/beta.jpg" },
      { name: "Alfa", state: "pending", createdAt: "2026-10-20T10:00:00Z", scoreIgnacio: 6 },
    ]);
  });

  test("both lists offer the toggle and switching never changes the URL", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await fulfilPosters(page);

    for (const list of ["vistas", "pendientes"]) {
      await visit(page, `/${list}?q=a&orden=nota`);
      await expect(page.getByRole("table")).toBeVisible();
      await expect(viewRadio(page, "Tabla")).toBeChecked();
      const before = page.url();
      const titles = await rows(page).allTextContents();

      await viewOption(page, "Tarjetas").click();
      await expect(page.getByRole("table")).toHaveCount(0);
      await expect(page.getByRole("list", { name: /^(Vistas|Pendientes)$/ })).toBeVisible();
      await expect(viewRadio(page, "Tarjetas")).toBeChecked();

      // Same titles in the same order; the controls keep their state.
      expect(await rows(page).allTextContents()).toEqual(titles);
      await expect(page.getByRole("searchbox", { name: "Buscar" })).toHaveValue("a");
      await expect(page.getByLabel("Ordenar")).toHaveValue("score:desc");
      expect(page.url()).toBe(before);

      await viewOption(page, "Tabla").click();
      await expect(page.getByRole("table")).toBeVisible();
      expect(page.url()).toBe(before);
    }
    await context.close();
  });

  test("the choice survives a reload and is shared by both lists", async ({ browser }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await visit(page, "/vistas");

    await viewOption(page, "Tarjetas").click();
    await expect(page.getByRole("list", { name: "Vistas" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("list", { name: "Vistas" })).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(viewRadio(page, "Tarjetas")).toBeChecked();

    await visit(page, "/pendientes");
    await expect(page.getByRole("list", { name: "Pendientes" })).toBeVisible();
    await expect(viewRadio(page, "Tarjetas")).toBeChecked();

    await viewOption(page, "Tabla").click();
    await expect(page.getByRole("table", { name: "Pendientes" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("table", { name: "Pendientes" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Pendientes" })).toHaveCount(0);
    await context.close();
  });

  test("a browser without the cookie gets the table", async ({ browser }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await visit(page, "/vistas");

    await expect(page.getByRole("table", { name: "Vistas" })).toBeVisible();
    await expect(viewRadio(page, "Tabla")).toBeChecked();
    await context.close();
  });

  test("an invalid cookie falls back to the table without an error", async ({ browser }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    for (const value of ["purple", "Grid", "grid2"]) {
      await setView(context, value);
      const response = await page.goto("/vistas");
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("table", { name: "Vistas" })).toBeVisible();
      await expect(viewRadio(page, "Tabla")).toBeChecked();
    }
    await context.close();
  });

  test("the first HTML already holds the cards, not a table (no flash)", async ({
    browser,
  }) => {
    // The raw response, before any script runs: nothing can swap views later.
    const context = await browser.newContext({ storageState: STATE_FILE });
    await setGridView(context);
    for (const list of ["vistas", "pendientes"]) {
      const html = await (await context.request.get(`/${list}`)).text();
      expect(html).toMatch(/<ul[^>]*role="list"[^>]*aria-label="(Vistas|Pendientes)"/);
      expect(html).not.toContain('role="table"');
      expect(html).toMatch(/<input[^>]*value="grid"[^>]*checked=""|<input[^>]*checked=""[^>]*value="grid"/);
    }

    await setView(context, "table");
    const html = await (await context.request.get("/vistas")).text();
    expect(html).toContain('role="table"');
    expect(html).not.toMatch(/<ul[^>]*aria-label="Vistas"/);
    await context.close();
  });

  test("a click during a pending search keeps the typed text and the new view", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await visit(page, "/vistas");

    const search = page.getByRole("searchbox", { name: "Buscar" });
    await search.fill("dune");
    // No wait: the debounce is still pending when the toggle is pressed.
    await viewOption(page, "Tarjetas").click();

    await expect(page).toHaveURL("/vistas?q=dune");
    await expect(search).toHaveValue("dune");
    await expect(page.getByRole("list", { name: "Vistas" })).toBeVisible();
    await expect(rows(page)).toHaveText([/Dune/]);
    await expect(viewRadio(page, "Tarjetas")).toBeChecked();
    await context.close();
  });

  test("the arrows switch the view from the keyboard and focus stays on the toggle", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await visit(page, "/vistas");

    await viewRadio(page, "Tabla").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("list", { name: "Vistas" })).toBeVisible();
    await expect(viewRadio(page, "Tarjetas")).toBeChecked();
    await expect(viewRadio(page, "Tarjetas")).toBeFocused();

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("table", { name: "Vistas" })).toBeVisible();
    await expect(viewRadio(page, "Tabla")).toBeChecked();
    await expect(viewRadio(page, "Tabla")).toBeFocused();
    await context.close();
  });

  test("a chip, the search and the sort keep the list in cards", async ({ browser }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await setGridView(context);
    await visit(page, "/vistas");
    const cards = page.getByRole("list", { name: "Vistas" });

    await page.getByRole("button", { name: "Vista y horrible" }).click();
    await expect(page).toHaveURL("/vistas?estado=watched_awful");
    await expect(rows(page)).toHaveText([/Dark/]);
    await expect(cards).toBeVisible();

    await page.getByRole("searchbox", { name: "Buscar" }).fill("dark");
    await expect(page).toHaveURL(/q=dark/);
    await expect(cards).toBeVisible();

    await page.getByLabel("Ordenar").selectOption("score:desc");
    await expect(page).toHaveURL(/orden=nota/);
    await expect(cards).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await context.close();
  });

  test("the cards show the same dates, state and average as the table", async ({ browser }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await fulfilPosters(page);
    await setGridView(context);

    await visit(page, "/vistas");
    const amelie = page.getByRole("listitem").filter({ hasText: "Amélie" });
    await expect(amelie).toContainText("10 feb 2024");
    await expect(amelie.getByRole("img", { name: "Media 8,5" })).toBeVisible();
    const dune = page.getByRole("listitem").filter({ hasText: /^Dune/ });
    await expect(dune.getByRole("img", { name: "Sin media" })).toBeVisible();
    await expect(dune.locator("p")).toHaveText(/—/);
    const dark = page.getByRole("listitem").filter({ hasText: "Dark" });
    await expect(dark).toContainText("Vista y horrible");

    await visit(page, "/pendientes");
    await expect(page.getByRole("listitem").filter({ hasText: "Alfa" })).toContainText(
      "20 oct 2026",
    );
    await context.close();
  });

  test("activating the cover or a score opens the ficha", async ({ browser }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await fulfilPosters(page);
    await setGridView(context);

    for (const target of ["cover", "score"]) {
      await visit(page, "/vistas");
      const card = page.getByRole("listitem").filter({ hasText: "Amélie" });
      const area =
        target === "cover" ? card.locator("img") : card.getByText("Ignacio: 9");
      const box = (await area.boundingBox())!;
      // The link is stretched over the card: a real click lands on it.
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await expect(page).toHaveURL(/\/titulo\//);
      await expect(page.getByRole("heading", { level: 1, name: "Amélie" })).toBeVisible();
    }
    await context.close();
  });

  test("a card is one tab stop and Enter opens the ficha", async ({ browser }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await setGridView(context);
    await visit(page, "/vistas");

    const card = page.getByRole("listitem").filter({ hasText: "Matrix" });
    await expect(card.locator("a, button, input, [tabindex]")).toHaveCount(1);
    await card.getByRole("link", { name: "Matrix" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/titulo\//);
    await context.close();
  });

  test("cards are flat and square, share a row height and align their scores", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await fulfilPosters(page);
    await setGridView(context);
    await visit(page, "/vistas");

    const style = await page.getByRole("listitem").first().evaluate((li) => {
      const cs = getComputedStyle(li);
      const cover = getComputedStyle(li.firstElementChild!);
      return {
        radius: [cs.borderTopLeftRadius, cs.borderBottomRightRadius, cover.borderTopLeftRadius],
        shadow: [cs.boxShadow, cover.boxShadow],
      };
    });
    expect(style.radius).toEqual(["0px", "0px", "0px"]);
    expect(style.shadow).toEqual(["none", "none"]);

    // Four columns from md: the first row shares one height and one score line.
    const items = page.getByRole("listitem");
    const boxes = [];
    for (let index = 0; index < 4; index += 1) {
      const item = items.nth(index);
      boxes.push({
        item: (await item.boundingBox())!,
        average: (await item.getByRole("img", { name: /^(Media|Sin media)/ }).boundingBox())!,
      });
    }
    expect(new Set(boxes.map(({ item }) => Math.round(item.y))).size).toBe(1);
    expect(new Set(boxes.map(({ item }) => Math.round(item.height))).size).toBe(1);
    expect(new Set(boxes.map(({ average }) => Math.round(average.y))).size).toBe(1);
    await context.close();
  });

  test("covers load lazily from TMDB and a missing poster shows the title", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: MOBILE });
    const requested = await fulfilPosters(page);
    await setGridView(context);
    await visit(page, "/vistas");

    const poster = page.locator("img");
    await expect(poster).toHaveCount(1);
    await expect(poster).toHaveAttribute("loading", "lazy");
    await expect(poster).toHaveAttribute("src", "https://image.tmdb.org/t/p/w342/amelie.jpg");
    expect(requested.every((url) => url.startsWith("https://image.tmdb.org/"))).toBe(true);

    const dune = page.getByRole("listitem").filter({ hasText: /^Dune/ });
    await expect(dune.locator("img")).toHaveCount(0);
    await expect(
      dune.locator("[aria-hidden='true']").filter({ hasText: "Dune" }),
    ).toBeVisible();
    await context.close();
  });

  for (const { name, size, columns } of [
    { name: "mobile-390", size: MOBILE, columns: 2 },
    { name: "desktop-1280", size: DESKTOP, columns: 4 },
  ]) {
    test(`at ${name} the grid has ${columns} columns, no overflow, and a long title stays inside its card`, async ({
      browser,
    }) => {
      const { context, page } = await openPage(browser, { viewport: size });
      await fulfilPosters(page);
      await setGridView(context);

      for (const path of ["/vistas", "/pendientes"]) {
        await visit(page, path);
        const overflow = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        expect(overflow.scroll, `${path} overflows`).toBeLessThanOrEqual(overflow.client);

        const count = await page
          .getByRole("list", { name: /^(Vistas|Pendientes)$/ })
          .evaluate((list) => getComputedStyle(list).gridTemplateColumns.split(" ").length);
        expect(count).toBe(columns);
      }

      await visit(page, "/vistas");
      const long = page.getByRole("listitem").filter({ hasText: LONG_TITLE });
      const li = (await long.boundingBox())!;
      const text = (await long.getByRole("link").boundingBox())!;
      expect(text.x + text.width).toBeLessThanOrEqual(li.x + li.width + 1);
      const cover = long.locator("[aria-hidden='true']").filter({ hasText: LONG_TITLE });
      const fits = await cover.evaluate((el) => {
        const inner = el.firstElementChild as HTMLElement;
        return (
          inner.scrollHeight <= inner.clientHeight + 1 &&
          inner.scrollWidth <= inner.clientWidth + 1
        );
      });
      expect(fits).toBe(true);
      await context.close();
    });
  }
});

// ---------------------------------------------------------------------------
// Series: ratings per season, derived summary, lists by the latest season
// ---------------------------------------------------------------------------

test.describe("a series is rated season by season", () => {
  let dark: string;

  test.beforeAll(async () => {
    await clearTitles();
    // The title-level values are stale on purpose: the seasons are the truth.
    const ids = await seedTitles([
      {
        name: "Dark",
        kind: "series",
        state: "pending",
        seasons: [
          { number: 1, state: "watched", watchDate: "2024-01-05", scoreMaria: 8, scoreIgnacio: 6 },
          { number: 2, state: "watched_rewatch", watchDate: "2025-03-02", scoreMaria: 6 },
        ],
      },
      {
        name: "Severance",
        kind: "series",
        state: "watched",
        seasons: [
          { number: 1, state: "watched", watchDate: "2024-06-01", scoreIgnacio: 9 },
          { number: 2, state: "pending" },
        ],
      },
    ]);
    dark = `/titulo/${ids.Dark}`;
  });

  function summary(page: Page) {
    return page.getByRole("region", { name: "Resumen" });
  }

  /** One season's fold: its summary line opens the editors. */
  function season(page: Page, number: number) {
    return page.locator("details").filter({ hasText: `Temporada ${number}` });
  }

  test("lists place a series by its latest season, with the derived values", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser, { viewport: DESKTOP });
    await visit(page, "/vistas");

    // Dark: latest season watched; Severance: latest season pending.
    await expect(rows(page)).toHaveText([/Dark/]);
    const row = page.getByRole("row").filter({ hasText: "Dark" });
    await expect(row).toContainText("Vista, repetir");
    await expect(row).toContainText("2 mar 2025");
    // María 7 (mean of 8 and 6), Ignacio 6, average 6,5.
    await expect(row.getByRole("img", { name: "Media 6,5" })).toBeVisible();

    await visit(page, "/pendientes");
    await expect(rows(page)).toHaveText([/Severance/]);
    await context.close();
  });

  test("the ficha shows a read-only summary and one row per season", async ({ browser }) => {
    const { context, page } = await openPage(browser);
    await visit(page, dark);

    await expect(summary(page)).toBeVisible();
    await expect(summary(page).getByRole("img", { name: "Media 6,5" })).toBeVisible();
    await expect(summary(page).getByRole("button")).toHaveCount(0);
    await expect(page.locator("details")).toHaveCount(2);
    await expect(page.locator("details summary").first()).toContainText("Temporada 1");
    // Only the latest season starts open.
    await expect(season(page, 2)).toHaveAttribute("open", "");
    await expect(season(page, 1)).not.toHaveAttribute("open", "");
    await context.close();
  });

  test("a person edits only their own score and the summary follows the server", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser);
    await visit(page, dark);

    // Ignacio rates season 2: his mean becomes 6,5 and the average 6,75.
    const two = season(page, 2);
    await expect(two.getByRole("group", { name: "Tu nota" })).toHaveCount(1);
    await two.getByRole("button", { name: "7", exact: true }).click();
    await expect(two.getByText("Tu nota: 7")).toBeAttached();
    await expectSaved(page);
    await expect(summary(page).getByRole("img", { name: "Media 6,75" })).toBeVisible();

    // Season 1 starts folded; opening it shows its own editors.
    await season(page, 1).locator("summary").click();
    await expect(season(page, 1)).toHaveAttribute("open", "");
    await season(page, 1).getByRole("button", { name: "Quitar nota" }).click();
    await expectSaved(page);
    // Ignacio's season 1 note is gone: his mean is season 2's 7 alone.
    await expect(summary(page).getByRole("img", { name: "Media 7" })).toBeVisible();

    await page.reload();
    await expect(summary(page).getByRole("img", { name: "Media 7" })).toBeVisible();
    await context.close();
  });

  test("a season's state and date save, and the summary takes the latest season", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser);
    await visit(page, dark);

    const two = season(page, 2);
    await two.locator("fieldset label").filter({ hasText: /^Vista y horrible$/ }).click();
    await expect(two.getByRole("radio", { name: "Vista y horrible" })).toBeChecked();
    await expectSaved(page);
    await expect(summary(page)).toContainText("Vista y horrible");

    await two.getByLabel("Fecha de visionado").fill("2025-04-09");
    await expect(summary(page)).toContainText("9 abr 2025");
    await expectSaved(page);
    await context.close();
  });

  test("add next season creates a pending one and the series moves to Pendientes", async ({
    browser,
  }) => {
    const { context, page } = await openPage(browser);
    await visit(page, dark);

    await page.getByRole("button", { name: "Añadir temporada 3" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Temporada 3 añadida." }),
    ).toBeVisible();
    await expect(page.locator("details")).toHaveCount(3);
    const three = season(page, 3);
    await expect(three).toHaveAttribute("open", "");
    await expect(three.getByRole("radio", { name: "Pendiente" })).toBeChecked();
    await expect(three.getByLabel("Fecha de visionado")).toHaveValue("");
    await expect(summary(page)).toContainText("Pendiente");
    await expect(page.getByRole("button", { name: "Añadir temporada 4" })).toBeVisible();

    await visit(page, "/vistas");
    await expect(rows(page)).toHaveCount(0);
    await visit(page, "/pendientes");
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByRole("link", { name: /Dark/ })).toBeVisible();
    await context.close();
  });

  test("a movie ficha has no season section", async ({ browser }) => {
    await seedTitles([{ name: "Heat", state: "watched" }]);
    const { context, page } = await openPage(browser);
    await visit(page, "/vistas");
    await page.getByRole("link", { name: /Heat/ }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Heat" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resumen" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Añadir temporada/ })).toHaveCount(0);
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
  let serie: string;

  test.beforeAll(async () => {
    await clearTitles();
    const ids = await seedTitles([
      {
        name: "Dark",
        kind: "series",
        state: "pending",
        seasons: [
          { number: 1, state: "watched", watchDate: "2024-01-05", scoreMaria: 8, scoreIgnacio: 6 },
          { number: 2, state: "watched_rewatch", watchDate: "2025-03-02", scoreMaria: 6 },
          { number: 3, state: "pending" },
        ],
      },
      { name: "Amélie", state: "watched", watchDate: "2024-02-10", scoreIgnacio: 9, scoreMaria: 8, posterPath: "/amelie.jpg" },
      { name: "Matrix", state: "watched_rewatch", watchDate: "2025-06-01", scoreIgnacio: 7 },
      { name: "Dune", state: "watched" },
      { name: "Alfa", state: "pending", createdAt: "2026-10-20T10:00:00Z", scoreIgnacio: 6 },
      { name: "Beta", state: "urgent", createdAt: "2026-09-01T10:00:00Z" },
    ]);
    ficha = `/titulo/${ids["Amélie"]}`;
    serie = `/titulo/${ids.Dark}`;
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
        await fulfilPosters(page);
        const problems: string[] = [];
        page.on("console", (message) => {
          if (["error", "warning"].includes(message.type())) {
            problems.push(message.text());
          }
        });
        page.on("pageerror", (error) => problems.push(error.message));

        // The card view comes last: its cookie then stays for the rest of the run.
        const visits = [
          ...["/vistas", "/pendientes", "/anadir", ficha, serie].map((path) => ({
            path,
            cards: false,
          })),
          ...["/vistas", "/pendientes"].map((path) => ({ path, cards: true })),
        ];
        for (const { path, cards } of visits) {
          if (cards) await setGridView(context);
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

          const slug =
            path === serie ? "serie" : path.startsWith("/titulo") ? "titulo" : path.slice(1);
          await page.screenshot({
            path: testInfo.outputPath(`${slug}${cards ? "-cards" : ""}-${name}-${scheme}.png`),
            fullPage: true,
            animations: "disabled",
          });
        }

        expect(problems.filter((text) => HYDRATION.test(text))).toEqual([]);
        await context.close();
      });
    }
  }

  // `main`'s box includes its horizontal padding, so the visible content edge
  // is the right edge of the critics table, not of `main`.
  for (const viewport of [DESKTOP, WIDE]) {
    test(`at ${viewport.width}px Añadir aligns with the table's right edge`, async ({
      browser,
    }) => {
      const { context, page } = await openPage(browser, { viewport });

      for (const path of ["/vistas", "/pendientes"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const row = (await page.getByRole("table").boundingBox())!;
        const add = (await page.getByRole("link", { name: "Añadir" }).boundingBox())!;
        expect(row.width).toBeLessThanOrEqual(760);
        expect(Math.abs(add.x + add.width - (row.x + row.width))).toBeLessThanOrEqual(1);
        expect(add.x).toBeGreaterThan(row.x);
      }
      await context.close();
    });
  }

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
