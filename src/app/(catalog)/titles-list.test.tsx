import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { err, ok } from "@/domain";
import type { TitleInput } from "@/domain";
import { makeRecord } from "@/server/titles/test-helpers";
import type { TitleView } from "@/server/titles/types";
import { expectNoAxeViolations } from "@/test/axe";

import { TitlesList } from "./titles-list";

const mocks = vi.hoisted(() => ({
  listTitles: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/server/titles/list", () => ({ listTitles: mocks.listTitles }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./list-controls", () => ({
  ListControls: (props: { list: string; q: string; order: string }) => (
    <div data-testid="controls">{`${props.list}|${props.q}|${props.order}`}</div>
  ),
}));

let nextId = 0;
function view(
  input: Partial<TitleInput> & Record<string, unknown>,
  average: number | null = null,
  createdAt = "2026-10-01T10:00:00.000Z",
): TitleView {
  nextId += 1;
  const id = `00000000-0000-4000-8000-${String(nextId).padStart(12, "0")}`;
  return { ...makeRecord(input, { id, createdAt }), average };
}

beforeEach(() => {
  vi.clearAllMocks();
  nextId = 0;
});

async function renderList(
  list: "vistas" | "pendientes",
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  render(await TitlesList({ list, searchParams: Promise.resolve(searchParams) }));
}

test("Vistas: masthead with the filtered count and one row per title", async () => {
  mocks.listTitles.mockResolvedValue(
    ok([
      view({ name: "Dune", state: "watched", scores: { maria: 8, ignacio: 7 } }, 7.5),
      view({ name: "Amélie", state: "watched_rewatch" }),
    ]),
  );

  await renderList("vistas");

  expect(screen.getByRole("heading", { level: 1, name: "Vistas" })).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  const table = screen.getByRole("table", { name: "Vistas" });
  expect(within(table).getAllByRole("row")).toHaveLength(3);
});

test("the list is read through the use case with the raw URL state", async () => {
  mocks.listTitles.mockResolvedValue(ok([]));

  await renderList("pendientes", { q: "matrix", estado: "urgent" });

  expect(mocks.listTitles).toHaveBeenCalledWith("pendientes", {
    q: "matrix",
    estado: "urgent",
  });
});

test("each row title links to its ficha", async () => {
  const dune = view({ name: "Dune", state: "watched" });
  mocks.listTitles.mockResolvedValue(ok([dune]));

  await renderList("vistas");

  expect(screen.getByRole("link", { name: "Dune" })).toHaveAttribute(
    "href",
    `/titulo/${dune.id}`,
  );
});

test("no poster images in the list", async () => {
  mocks.listTitles.mockResolvedValue(
    ok([view({ name: "Dune", state: "watched", posterPath: "/dune.jpg" })]),
  );

  await renderList("vistas");

  expect(document.querySelector("img")).toBeNull();
});

test("titles without scores show Sin nota and Sin media, never an error", async () => {
  mocks.listTitles.mockResolvedValue(ok([view({ name: "Dune", state: "watched" })]));

  await renderList("vistas");

  expect(screen.getAllByText("Sin nota")).toHaveLength(2);
  expect(screen.getByRole("img", { name: "Sin media" })).toBeInTheDocument();
});

test("Vistas shows the watch date, unknown as a dash", async () => {
  mocks.listTitles.mockResolvedValue(
    ok([
      view({
        name: "Dune",
        state: "watched",
        watchDate: { kind: "known", date: "2026-05-01" },
      }),
      view({ name: "Dark", state: "watched" }),
    ]),
  );

  await renderList("vistas");

  expect(screen.getByText("1 may 2026")).toBeInTheDocument();
  const row = screen.getByRole("link", { name: "Dark" }).closest('[role="row"]');
  const cells = within(row as HTMLElement).getAllByRole("cell");
  expect(cells[cells.length - 1]).toHaveTextContent("—");
});

test("Pendientes shows the date added (A3)", async () => {
  mocks.listTitles.mockResolvedValue(
    ok([view({ name: "Dune", state: "pending" }, null, "2026-10-30T10:00:00.000Z")]),
  );

  await renderList("pendientes");

  expect(
    screen.getByRole("heading", { level: 1, name: "Pendientes" }),
  ).toBeInTheDocument();
  expect(screen.getByText("30 oct 2026")).toBeInTheDocument();
});

test("the add action carries the origin list (A1)", async () => {
  mocks.listTitles.mockResolvedValue(ok([]));

  await renderList("vistas");

  expect(screen.getByRole("link", { name: "Añadir" })).toHaveAttribute(
    "href",
    "/anadir?desde=vistas",
  );
});

test("Pendientes add action carries desde=pendientes", async () => {
  mocks.listTitles.mockResolvedValue(ok([]));

  await renderList("pendientes");

  expect(screen.getByRole("link", { name: "Añadir" })).toHaveAttribute(
    "href",
    "/anadir?desde=pendientes",
  );
});

test("the controls get the parsed URL state, with the default order", async () => {
  mocks.listTitles.mockResolvedValue(ok([]));

  await renderList("pendientes", { q: " dune ", orden: "zzz" });

  expect(screen.getByTestId("controls")).toHaveTextContent("pendientes|dune|priority");
});

test("an empty list says Aún no hay títulos and keeps the add action", async () => {
  mocks.listTitles.mockResolvedValue(ok([]));

  await renderList("vistas");

  expect(screen.getByText("Aún no hay títulos")).toBeInTheDocument();
  expect(screen.getByText("0")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Añadir" })).toBeInTheDocument();
  expect(screen.queryByRole("table")).toBeNull();
});

test("a search with no match says Sin resultados and offers Limpiar filtros", async () => {
  mocks.listTitles.mockResolvedValue(ok([]));

  await renderList("vistas", { q: "zzz" });

  expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute(
    "href",
    "/vistas",
  );
});

test("a state filter with no match also offers Limpiar filtros", async () => {
  mocks.listTitles.mockResolvedValue(ok([]));

  await renderList("pendientes", { estado: "urgent" });

  expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute(
    "href",
    "/pendientes",
  );
});

test("a failure shows an alert instead of the table", async () => {
  mocks.listTitles.mockResolvedValue(err({ kind: "unavailable" }));

  await renderList("vistas");

  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudo cargar la lista. Inténtalo de nuevo.",
  );
});

test("a session the database does not know goes to /login", async () => {
  mocks.listTitles.mockResolvedValue(err({ kind: "unauthorized" }));

  await expect(
    TitlesList({ list: "vistas", searchParams: Promise.resolve({}) }),
  ).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/login");
});

test("has no accessibility violations", async () => {
  mocks.listTitles.mockResolvedValue(
    ok([view({ name: "Dune", state: "watched", scores: { maria: 8, ignacio: 7 } }, 7.5)]),
  );
  await renderList("vistas");

  await expectNoAxeViolations(document.body);
});
