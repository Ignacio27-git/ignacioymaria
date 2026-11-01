import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { err, ok } from "@/domain";
import type { TitleInput } from "@/domain";
import { makeRecord, TITLE_ID } from "@/server/titles/test-helpers";
import type { TitleView } from "@/server/titles/types";
import { expectNoAxeViolations } from "@/test/axe";

const mocks = vi.hoisted(() => ({
  getTitle: vi.fn(),
  getCurrentPerson: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/server/titles/get", () => ({ getTitle: mocks.getTitle }));
vi.mock("@/server/auth/current-person", () => ({
  getCurrentPerson: mocks.getCurrentPerson,
}));
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));
vi.mock("./ficha-editor", () => ({
  FichaEditor: (props: object) => (
    <div data-testid="editor" data-props={JSON.stringify(props)} />
  ),
}));

import TitlePage, { metadata } from "./page";

function view(
  input: Partial<TitleInput> & Record<string, unknown> = {},
  average: number | null = null,
): TitleView {
  return { ...makeRecord(input), average };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentPerson.mockResolvedValue("maria");
});

async function renderPage(id = TITLE_ID) {
  const element = await TitlePage({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({}),
  });
  return render(element);
}

function editorProps() {
  return JSON.parse(
    screen.getByTestId("editor").getAttribute("data-props") ?? "{}",
  );
}

test("renders the name as the h1 with kind and year", async () => {
  mocks.getTitle.mockResolvedValue(ok(view({ name: "Dune", year: 2021 })));

  await renderPage();

  expect(screen.getByRole("heading", { level: 1, name: "Dune" })).toBeInTheDocument();
  expect(screen.getByText("Película · 2021")).toBeInTheDocument();
});

test("a title with no year shows only its kind", async () => {
  mocks.getTitle.mockResolvedValue(ok(view({ kind: "series", name: "Mi serie" })));

  await renderPage();

  expect(screen.getByText("Serie")).toBeInTheDocument();
});

test("a series shows how many seasons TMDB reports and the first actors", async () => {
  mocks.getTitle.mockResolvedValue(
    ok(
      view({
        kind: "series",
        year: 2011,
        seasonsTotal: 8,
        actors: ["Emilia Clarke", "Kit Harington"],
      }),
    ),
  );

  await renderPage();

  expect(screen.getByText("Serie · 2011 · 8 temporadas")).toBeInTheDocument();
  expect(screen.getByText("Reparto: Emilia Clarke, Kit Harington")).toBeInTheDocument();
});

test("shows the poster when there is one and keeps the space when there is not", async () => {
  mocks.getTitle.mockResolvedValue(ok(view({ posterPath: "/dune.jpg" })));
  const first = await renderPage();
  expect(screen.getByRole("img", { name: "Póster de Dune" })).toHaveAttribute(
    "src",
    "https://image.tmdb.org/t/p/w342/dune.jpg",
  );
  first.unmount();

  mocks.getTitle.mockResolvedValue(ok(view({ posterPath: null })));
  await renderPage();
  expect(screen.getByRole("img", { name: "Sin póster de Dune" })).toBeInTheDocument();
});

test("hands the editor my score, the other person's score and the server average", async () => {
  mocks.getTitle.mockResolvedValue(
    ok(
      view(
        {
          state: "watched_rewatch",
          observations: "Volver",
          watchDate: { kind: "known", date: "2026-05-01" },
          scores: { maria: 8, ignacio: 6 },
        },
        7,
      ),
    ),
  );

  await renderPage();

  const props = editorProps();
  expect(props).toMatchObject({
    id: TITLE_ID,
    name: "Dune",
    me: "maria",
    otherScore: 6,
    initial: {
      state: "watched_rewatch",
      observations: "Volver",
      watchDate: { kind: "known", date: "2026-05-01" },
      myScore: 8,
      average: 7,
    },
  });
  expect(props.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("for Ignacio the editable score is his own", async () => {
  mocks.getCurrentPerson.mockResolvedValue("ignacio");
  mocks.getTitle.mockResolvedValue(
    ok(view({ scores: { maria: 8, ignacio: 6 } }, 7)),
  );

  await renderPage();

  expect(editorProps()).toMatchObject({
    me: "ignacio",
    otherScore: 8,
    initial: { myScore: 6 },
  });
});

test("only María scored: the other score is missing and the average is hers", async () => {
  mocks.getTitle.mockResolvedValue(ok(view({ scores: { maria: 9 } }, 9)));

  await renderPage();

  expect(editorProps()).toMatchObject({
    otherScore: null,
    initial: { myScore: 9, average: 9 },
  });
});

test("no scores at all never errors", async () => {
  mocks.getTitle.mockResolvedValue(ok(view({}, null)));

  await renderPage();

  expect(editorProps()).toMatchObject({
    otherScore: null,
    initial: { myScore: null, average: null },
  });
});

test("shows the TMDB attribution only for a title that came from TMDB", async () => {
  mocks.getTitle.mockResolvedValue(ok(view({ tmdbId: 438631 })));
  const first = await renderPage();
  expect(screen.getByRole("link", { name: "TMDB" })).toBeInTheDocument();
  first.unmount();

  mocks.getTitle.mockResolvedValue(ok(view({ tmdbId: null })));
  await renderPage();
  expect(screen.queryByRole("link", { name: "TMDB" })).not.toBeInTheDocument();
});

test("links back to the list the title belongs to", async () => {
  mocks.getTitle.mockResolvedValue(ok(view({ state: "urgent" })));
  const first = await renderPage();
  expect(screen.getByRole("link", { name: "Volver a Pendientes" })).toHaveAttribute(
    "href",
    "/pendientes",
  );
  first.unmount();

  mocks.getTitle.mockResolvedValue(ok(view({ state: "watched" })));
  await renderPage();
  expect(screen.getByRole("link", { name: "Volver a Vistas" })).toHaveAttribute(
    "href",
    "/vistas",
  );
});

test("an unknown or malformed id renders the not-found page", async () => {
  mocks.getTitle.mockResolvedValue(err({ kind: "not_found" }));

  await expect(renderPage("no-es-un-uuid")).rejects.toThrow("NEXT_NOT_FOUND");

  expect(mocks.getTitle).toHaveBeenCalledWith("no-es-un-uuid");
  expect(mocks.notFound).toHaveBeenCalledTimes(1);
});

test("a session the database cannot map goes to the login", async () => {
  mocks.getTitle.mockResolvedValue(err({ kind: "unauthorized" }));

  await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT");

  expect(mocks.redirect).toHaveBeenCalledWith("/login");
});

test("no person goes to the login even if the title loaded", async () => {
  mocks.getCurrentPerson.mockResolvedValue(null);
  mocks.getTitle.mockResolvedValue(ok(view()));

  await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT");

  expect(mocks.redirect).toHaveBeenCalledWith("/login");
});

test("any other failure says so instead of rendering a partial ficha", async () => {
  mocks.getTitle.mockResolvedValue(err({ kind: "unavailable" }));

  await renderPage();

  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudo cargar la ficha. Inténtalo de nuevo.",
  );
  expect(screen.queryByTestId("editor")).not.toBeInTheDocument();
});

test("is axe clean", async () => {
  mocks.getTitle.mockResolvedValue(
    ok(view({ posterPath: "/dune.jpg", tmdbId: 438631, actors: ["Zendaya"] })),
  );
  const { container } = await renderPage();

  await expectNoAxeViolations(container);
});

test("has its own title", () => {
  expect(metadata.title).toBe("Ficha · Ignacio y María");
});
