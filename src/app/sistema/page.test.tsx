import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { WATCH_STATE_LABELS, WATCH_STATES } from "@/domain";
import { CONTRAST_PAIRS } from "@/lib/design/tokens";
import { readThemePreference } from "@/server/theme/read-preference";
import { SAMPLE_ROWS } from "@/server/specimen/sample";
import { expectNoAxeViolations } from "@/test/axe";

import SistemaPage from "./page";

vi.mock("server-only", () => ({}));
vi.mock("@/app/_actions/theme", () => ({ setThemeAction: vi.fn() }));
vi.mock("@/server/theme/read-preference", () => ({
  readThemePreference: vi.fn(),
}));

async function renderPage() {
  return render(await SistemaPage());
}

beforeEach(() => {
  vi.mocked(readThemePreference).mockResolvedValue("system");
});

describe("structure", () => {
  test("has exactly one h1 named Sistema", async () => {
    await renderPage();

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveAccessibleName("Sistema");
  });

  test("labels the synthetic data as Datos de muestra", async () => {
    await renderPage();

    expect(screen.getAllByText("Datos de muestra").length).toBeGreaterThan(0);
  });

  test("has a heading for each specimen section", async () => {
    await renderPage();

    for (const name of [
      "Color",
      "Tipografía",
      "Estados",
      "Botones",
      "Campos",
      "Filtros y orden",
      "Notas y media",
      "Tabla de críticos",
      "Tema",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
  });
});

describe("the nine components", () => {
  test("shows all six watch states with their exact labels", async () => {
    await renderPage();
    const section = screen.getByRole("region", { name: "Estados" });

    for (const state of WATCH_STATES) {
      expect(
        within(section).getByText(WATCH_STATE_LABELS[state]),
      ).toBeInTheDocument();
    }
  });

  test("shows the three button variants, a disabled one and a busy one", async () => {
    await renderPage();
    const section = screen.getByRole("region", { name: "Botones" });
    const buttons = within(section).getAllByRole("button");

    expect(buttons.length).toBeGreaterThanOrEqual(5);
    expect(buttons.some((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(buttons.some((button) => button.getAttribute("aria-busy") === "true")).toBe(
      true,
    );
  });

  test("shows text fields: plain, with hint and with error", async () => {
    await renderPage();
    const section = screen.getByRole("region", { name: "Campos" });

    expect(within(section).getAllByRole("textbox").length).toBeGreaterThanOrEqual(2);
    expect(within(section).getByRole("searchbox")).toBeInTheDocument();
    expect(within(section).getByLabelText("Nota")).toBeInvalid();
    expect(within(section).getByLabelText("Nombre")).toBeValid();
  });

  test("shows filter chips (pressed and not) and the sort control", async () => {
    await renderPage();
    const section = screen.getByRole("region", { name: "Filtros y orden" });
    const chips = within(section).getAllByRole("button");

    expect(chips.some((c) => c.getAttribute("aria-pressed") === "true")).toBe(true);
    expect(chips.some((c) => c.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(within(section).getByLabelText("Ordenar")).toBeInTheDocument();
  });

  test("shows score figures and average boxes, with and without data", async () => {
    await renderPage();
    const section = screen.getByRole("region", { name: "Notas y media" });

    expect(within(section).getByText("7,25")).toBeInTheDocument();
    expect(within(section).getByRole("img", { name: "Media 7,13" })).toBeInTheDocument();
    expect(within(section).getByRole("img", { name: "Sin media" })).toBeInTheDocument();
    expect(within(section).getByText("Sin nota")).toBeInTheDocument();
  });

  test("shows the critics table with one row per sample title", async () => {
    await renderPage();
    const table = screen.getByRole("table", { name: "Películas de muestra" });

    const headers = within(table).getAllByRole("columnheader");
    const names = ["Título", "María", "Ignacio", "Media", "Fecha"];
    expect(headers).toHaveLength(names.length);
    names.forEach((name, index) => {
      expect(headers[index]).toHaveAccessibleName(name);
    });
    expect(within(table).getAllByRole("row")).toHaveLength(SAMPLE_ROWS.length + 1);
  });

  test("shows the theme toggle with the stored preference checked", async () => {
    vi.mocked(readThemePreference).mockResolvedValue("dark");
    await renderPage();

    const group = screen.getByRole("group", { name: "Tema" });
    expect(within(group).getByRole("radio", { name: "Oscuro" })).toBeChecked();
  });
});

describe("color specimen", () => {
  test("lists every contrast pair with its ratio in both themes", async () => {
    await renderPage();
    const section = screen.getByRole("region", { name: "Color" });

    for (const pair of CONTRAST_PAIRS) {
      expect(within(section).getByText(pair.id)).toBeInTheDocument();
    }
    // Ratios come from the token module, formatted in Spanish: "15,9:1".
    expect(within(section).getAllByText(/\d+,\d:1/).length).toBeGreaterThanOrEqual(
      CONTRAST_PAIRS.length * 2,
    );
  });
});

test("has no accessibility violations", async () => {
  const { container } = await renderPage();

  await expectNoAxeViolations(container);
});
