import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";
import { mkdirSync } from "node:fs";

import { TOKENS, type Theme } from "../../src/lib/design/tokens";
import { E2E_PEOPLE } from "./global-setup";
import { saveSignedInState } from "./session";

const [ignacio] = E2E_PEOPLE;
const STATE_FILE = "test-results/design-system-session.json";
const REVIEW_DIR = ".impeccable/review";

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

const VIEWPORTS = [
  { name: "desktop", size: DESKTOP },
  { name: "mobile", size: MOBILE },
] as const;
const SCHEMES: readonly Theme[] = ["light", "dark"];

// One sign-in for the whole file; the contexts below reuse its cookies.
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(90_000);
  await saveSignedInState(browser, ignacio.email, STATE_FILE);
});

async function openContext(
  browser: Browser,
  options: {
    viewport: { width: number; height: number };
    colorScheme?: Theme;
    theme?: string;
  },
) {
  const context = await browser.newContext({
    storageState: STATE_FILE,
    viewport: options.viewport,
    colorScheme: options.colorScheme,
  });
  if (options.theme) {
    await context.addCookies([
      {
        name: "theme",
        value: options.theme,
        url: "http://127.0.0.1:3000",
      },
    ]);
  }
  return context;
}

function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

async function htmlBackground(page: Page): Promise<string> {
  return page.evaluate(
    () => getComputedStyle(document.documentElement).backgroundColor,
  );
}

/** The visible label of a ThemeToggle option (the radio itself is sr-only). */
function themeOption(page: Page, name: "Sistema" | "Claro" | "Oscuro") {
  return page.getByRole("group", { name: "Tema" }).getByText(name, { exact: true });
}

/** Resolves once React has hydrated the toggle (it tags DOM nodes with __reactProps$). */
async function waitForThemeToggle(page: Page) {
  await page.waitForFunction(() => {
    const radio = document.querySelector('fieldset input[type="radio"]');
    return (
      radio !== null &&
      Object.keys(radio).some((key) => key.startsWith("__reactProps$"))
    );
  });
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
}

test("signed out, /sistema goes to /login", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/sistema");

  await expect(page).toHaveURL("/login");
  await context.close();
});

for (const { name, size } of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    test.describe(`/sistema at ${name} in ${scheme}`, () => {
      test("shows the page with its nine components", async ({ browser }) => {
        const context = await openContext(browser, {
          viewport: size,
          colorScheme: scheme,
        });
        const page = await context.newPage();

        await page.goto("/sistema");

        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          "Sistema",
        );
        await expect(
          page.getByText("Datos de muestra", { exact: true }).first(),
        ).toBeVisible();
        // Masthead, StateCell, Button, TextField, FilterChip, SortControl,
        // ScoreFigure, AverageBox, CriticsTable, and the ThemeToggle.
        await expect(
          page.getByRole("heading", { level: 2, name: "Vistas" }),
        ).toBeVisible();
        await expect(page.getByText("Urgente de ver").first()).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Más tarde" }),
        ).toBeVisible();
        await expect(page.getByLabel("Correo electrónico")).toBeVisible();
        await expect(
          page.getByRole("group", { name: "Filtrar por estado" }),
        ).toBeVisible();
        await expect(page.getByLabel("Ordenar")).toBeVisible();
        await expect(page.getByText("Sin nota").first()).toBeAttached();
        await expect(
          page.getByRole("img", { name: "Media 7,13" }),
        ).toBeVisible();
        await expect(
          page.getByRole("table", { name: "Películas de muestra" }),
        ).toBeVisible();
        await expect(page.getByRole("group", { name: "Tema" })).toBeVisible();
        await context.close();
      });

      test("has no horizontal overflow and the right ground", async ({
        browser,
      }) => {
        const context = await openContext(browser, {
          viewport: size,
          colorScheme: scheme,
        });
        const page = await context.newPage();

        await page.goto("/sistema");
        await settle(page);

        const overflow = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
        expect(await htmlBackground(page)).toBe(rgb(TOKENS[scheme].paper));
        await context.close();
      });
    });
  }
}

test("at 390px the rows are 60-64px tall and the chips scroll inside their row", async ({
  browser,
}) => {
  const context = await openContext(browser, { viewport: MOBILE });
  const page = await context.newPage();
  await page.goto("/sistema");
  await settle(page);

  const table = page.getByRole("table", { name: "Películas de muestra" });
  const dataRows = table.getByRole("row").filter({
    hasNot: page.getByRole("columnheader"),
  });
  const count = await dataRows.count();
  expect(count).toBeGreaterThan(5);
  for (let index = 0; index < count; index += 1) {
    const box = await dataRows.nth(index).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(60);
    expect(box?.height).toBeLessThanOrEqual(64);
  }

  const chips = page.getByRole("group", { name: "Filtrar por estado" });
  const scrolls = await chips.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrolls).toBe(true);
  await context.close();
});

test("the table header stays at the top while the rows scroll", async ({
  browser,
}) => {
  const context = await openContext(browser, {
    // Short viewport: the table must be able to scroll past the top edge.
    viewport: { width: MOBILE.width, height: 400 },
  });
  const page = await context.newPage();
  await page.goto("/sistema");

  const table = page.getByRole("table", { name: "Películas de muestra" });
  const header = table.getByRole("row").first();
  // Put the table's third row at the top of the viewport.
  await table.evaluate((el) => {
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 120);
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  const box = await header.boundingBox();
  expect(box?.y).toBeGreaterThanOrEqual(0);
  expect(box?.y).toBeLessThan(2);
  await expect(header).toBeInViewport();
  await context.close();
});

test("on desktop the table is centred and at most 760px wide", async ({
  browser,
}) => {
  const context = await openContext(browser, { viewport: DESKTOP });
  const page = await context.newPage();
  await page.goto("/sistema");
  await settle(page);

  const main = await page.getByRole("main").boundingBox();
  const table = await page
    .getByRole("table", { name: "Películas de muestra" })
    .boundingBox();
  expect(main?.width).toBeLessThanOrEqual(760);
  expect(table?.width).toBeLessThanOrEqual(760);
  const left = table!.x;
  const right = DESKTOP.width - (table!.x + table!.width);
  expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  await context.close();
});

test.describe("theme preference", () => {
  test("a dark cookie under a light system gives data-theme dark in the initial HTML", async ({
    browser,
  }) => {
    const context = await openContext(browser, {
      viewport: DESKTOP,
      colorScheme: "light",
      theme: "dark",
    });
    const page = await context.newPage();

    const response = await page.goto("/sistema");
    const html = await response!.text();

    expect(html).toMatch(/<html[^>]*data-theme="dark"/);
    expect(await htmlBackground(page)).toBe(rgb(TOKENS.dark.paper));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await htmlBackground(page)).toBe(rgb(TOKENS.dark.paper));
    await context.close();
  });

  test("a light cookie under a dark system keeps the light tokens", async ({
    browser,
  }) => {
    const context = await openContext(browser, {
      viewport: DESKTOP,
      colorScheme: "dark",
      theme: "light",
    });
    const page = await context.newPage();

    await page.goto("/sistema");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await htmlBackground(page)).toBe(rgb(TOKENS.light.paper));
    await context.close();
  });

  test("choosing Oscuro persists across reload and Sistema clears it", async ({
    browser,
  }) => {
    const context = await openContext(browser, {
      viewport: DESKTOP,
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.goto("/sistema");
    await waitForThemeToggle(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");

    await themeOption(page, "Oscuro").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("radio", { name: "Oscuro" })).toBeChecked();

    await themeOption(page, "Sistema").click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await page.reload();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await expect(page.getByRole("radio", { name: "Sistema" })).toBeChecked();
    await context.close();
  });

  test("the arrow keys move between the options", async ({ browser }) => {
    const context = await openContext(browser, {
      viewport: DESKTOP,
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.goto("/sistema");

    await waitForThemeToggle(page);
    await page.getByRole("radio", { name: "Sistema" }).focus();
    await page.keyboard.press("ArrowRight");

    await expect(page.getByRole("radio", { name: "Claro" })).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Oscuro" })).toBeFocused();

    // Leave the shared device state as found.
    await themeOption(page, "Sistema").click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await context.close();
  });
});

/** Computed look that tells one meaning apart from another. */
async function look(locator: Locator) {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      borderTop: style.borderTopWidth,
      borderBottom: style.borderBottomWidth,
      borderColor: style.borderTopColor,
      background: style.backgroundColor,
      weight: style.fontWeight,
    };
  });
}

test.describe("finish review fixes", () => {
  test("primary action, selected state and error each have their own look", async ({
    browser,
  }) => {
    const context = await openContext(browser, {
      viewport: DESKTOP,
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.goto("/sistema");

    const primary = await look(
      page.getByRole("button", { name: "Guardar", exact: true }).first(),
    );
    const chip = await look(
      page.getByRole("button", { name: "Todas", pressed: true }),
    );
    const toggle = await look(
      page.getByRole("radio", { checked: true }).locator("xpath=.."),
    );
    const error = await look(page.locator('input[aria-invalid="true"]'));

    expect(JSON.stringify(primary)).not.toBe(JSON.stringify(chip));
    expect(JSON.stringify(primary)).not.toBe(JSON.stringify(error));
    expect(JSON.stringify(chip)).not.toBe(JSON.stringify(error));
    // Selected reads the same in the chips and in the theme toggle.
    expect(toggle.background).toBe(chip.background);
    expect(toggle.borderTop).toBe(chip.borderTop);
    // The error is painted in the urgent state colour, not in ink.
    expect(error.borderColor).toBe(rgb(TOKENS.light.stateUrgent));
    expect(primary.borderColor).toBe(rgb(TOKENS.light.ink));
    // Nothing but the average box is inverted.
    expect(primary.background).toBe(rgb(TOKENS.light.paper));
    expect(chip.background).not.toBe(rgb(TOKENS.light.ink));
    await context.close();
  });

  test("the empty average is an outlined cell, not an inverted one", async ({
    browser,
  }) => {
    const context = await openContext(browser, {
      viewport: DESKTOP,
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.goto("/sistema");

    const section = page.locator('section[aria-labelledby="notas"]');
    const filled = await look(
      section.getByRole("img", { name: "Media 7,13" }),
    );
    const empty = await look(section.getByRole("img", { name: "Sin media" }));
    expect(filled.background).toBe(rgb(TOKENS.light.ink));
    expect(empty.background).not.toBe(rgb(TOKENS.light.ink));
    expect(empty.borderTop).not.toBe("0px");
    await expect(section.getByRole("img")).toHaveCount(2);
    await expect(
      section.getByText("Sin media", { exact: true }),
    ).toBeVisible();
    await context.close();
  });

  test("at 1440px all seven chips show inside the 760px column", async ({
    browser,
  }) => {
    const context = await openContext(browser, {
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("/sistema");

    const row = page.getByRole("group", { name: "Filtrar por estado" });
    const chips = row.getByRole("button");
    await expect(chips).toHaveCount(7);
    const main = (await page.getByRole("main").boundingBox())!;
    for (let index = 0; index < 7; index += 1) {
      const box = (await chips.nth(index).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(main.x);
      expect(box.x + box.width).toBeLessThanOrEqual(main.x + main.width);
    }
    expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await context.close();
  });

  for (const { name, size } of VIEWPORTS) {
    test(`at ${name} the first chip lines up with the text margin`, async ({
      browser,
    }) => {
      const context = await openContext(browser, { viewport: size });
      const page = await context.newPage();
      await page.goto("/sistema");

      const heading = (await page
        .getByRole("heading", { level: 2, name: "Filtros y orden" })
        .boundingBox())!;
      const chip = (await page
        .getByRole("group", { name: "Filtrar por estado" })
        .getByRole("button")
        .first()
        .boundingBox())!;
      expect(Math.abs(chip.x - heading.x)).toBeLessThanOrEqual(1);
      await context.close();
    });
  }

  test("at 390px Añadir sits bottom right and never covers the last content", async ({
    browser,
  }) => {
    const context = await openContext(browser, { viewport: MOBILE });
    const page = await context.newPage();
    await page.goto("/sistema");

    const add = page.getByRole("link", { name: "Añadir" });
    await expect(add).toBeVisible();
    const box = (await add.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeGreaterThan(MOBILE.width - 40);
    expect(box.x + box.width).toBeLessThanOrEqual(MOBILE.width);
    expect(box.y + box.height).toBeGreaterThan(MOBILE.height - 40);
    expect(box.y + box.height).toBeLessThanOrEqual(MOBILE.height);

    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const last = (await page.getByRole("group", { name: "Tema" }).boundingBox())!;
    const fixed = (await add.boundingBox())!;
    expect(fixed.y + fixed.height).toBeLessThanOrEqual(MOBILE.height);
    expect(last.y + last.height).toBeLessThanOrEqual(fixed.y);
    await context.close();
  });

  test("the guide words read as a range at the right of the title cell", async ({
    browser,
  }) => {
    const context = await openContext(browser, { viewport: MOBILE });
    const page = await context.newPage();
    await page.goto("/sistema");

    const cell = page
      .getByRole("table", { name: "Películas de muestra" })
      .getByRole("columnheader", { name: "Título" });
    const guide = cell.locator('[aria-hidden="true"]');
    const cellBox = (await cell.boundingBox())!;
    const guideBox = (await guide.boundingBox())!;
    expect(guideBox.x + guideBox.width).toBeGreaterThan(
      cellBox.x + cellBox.width - 2,
    );
    const style = await guide.evaluate((el) => {
      const computed = getComputedStyle(el);
      return {
        size: parseFloat(computed.fontSize),
        stretch: computed.fontStretch,
      };
    });
    expect(style.size).toBeLessThanOrEqual(12.5);
    expect(style.stretch).toBe("75%");
    await context.close();
  });

  test("rules and critic heads form a hierarchy", async ({ browser }) => {
    const context = await openContext(browser, { viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto("/sistema");

    const table = page.getByRole("table", { name: "Películas de muestra" });
    const header = await look(table.getByRole("row").first());
    expect(header.borderTop).toBe("2px");
    const masthead = await look(
      page.getByRole("heading", { level: 1 }).locator("xpath=.."),
    );
    expect(masthead.borderBottom).toBe("2px");

    for (const critic of ["María", "Ignacio"]) {
      const head = table.getByRole("columnheader", { name: critic });
      const weight = await head.evaluate((el) =>
        Number(getComputedStyle(el).fontWeight),
      );
      const stretch = await head.evaluate(
        (el) => getComputedStyle(el).fontStretch,
      );
      expect(weight).toBeGreaterThanOrEqual(700);
      expect(stretch).toBe("75%");
    }
    await context.close();
  });

  test("the sort select draws its own chevron", async ({ browser }) => {
    const context = await openContext(browser, { viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto("/sistema");

    const select = page.getByLabel("Ordenar");
    expect(await select.evaluate((el) => getComputedStyle(el).appearance)).toBe(
      "none",
    );
    await expect(select.locator("xpath=..").locator("svg")).toBeVisible();
    await context.close();
  });
});

test.describe("screenshots", () => {
  mkdirSync(REVIEW_DIR, { recursive: true });

  for (const { name, size } of VIEWPORTS) {
    test(`captures ${name}.png from the top of the settled page`, async ({
      browser,
    }) => {
      const context = await openContext(browser, {
        viewport: size,
        colorScheme: "light",
      });
      const page = await context.newPage();
      await page.goto("/sistema");
      await settle(page);

      await page.screenshot({
        path: `${REVIEW_DIR}/${name}.png`,
        fullPage: true,
        animations: "disabled",
      });
      await context.close();
    });
  }
});
