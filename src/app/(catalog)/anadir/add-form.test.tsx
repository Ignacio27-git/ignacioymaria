import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { err, ok } from "@/domain";
import type { AddCandidate } from "@/server/titles/add-candidates";
import { expectNoAxeViolations } from "@/test/axe";

import { AddForm, SEARCH_DEBOUNCE_MS } from "./add-form";

const actions = vi.hoisted(() => ({
  searchAddCandidatesAction: vi.fn(),
  addFromTmdbAction: vi.fn(),
  addManualAction: vi.fn(),
}));

vi.mock("@/app/_actions/titles", () => actions);

const EXISTING_ID = "22222222-2222-4222-8222-222222222222";

function candidate(overrides: Partial<AddCandidate> = {}): AddCandidate {
  return {
    tmdbId: 438631,
    kind: "movie",
    name: "Dune",
    year: 2021,
    posterPath: "/dune.jpg",
    existingId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  actions.searchAddCandidatesAction.mockResolvedValue(ok([]));
  actions.addFromTmdbAction.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(desde: "vistas" | "pendientes" = "pendientes") {
  return render(<AddForm desde={desde} />);
}

function type(value: string) {
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Buscar película o serie" }),
    { target: { value } },
  );
}

async function settle(ms = SEARCH_DEBOUNCE_MS) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function search(value: string, found: AddCandidate[]) {
  actions.searchAddCandidatesAction.mockResolvedValue(ok(found));
  type(value);
  await settle();
}

async function submitManual() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Añadir a la lista" }));
    // React's scheduler runs on timers, which are faked here.
    await vi.advanceTimersByTimeAsync(10);
  });
}

async function choose(name: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

test("the search runs once, 250 ms after the last keystroke, on the trimmed text", async () => {
  setup();

  type("du");
  await settle(200);
  type("dune ");
  await settle(249);
  expect(actions.searchAddCandidatesAction).not.toHaveBeenCalled();

  await settle(1);

  expect(actions.searchAddCandidatesAction).toHaveBeenCalledTimes(1);
  expect(actions.searchAddCandidatesAction).toHaveBeenCalledWith("dune");
});

test("results show poster, name, year and kind", async () => {
  const { container } = setup();

  await search("dune", [
    candidate(),
    candidate({
      tmdbId: 1399,
      kind: "series",
      name: "Juego de tronos",
      year: 2011,
      posterPath: null,
    }),
  ]);

  const list = screen.getByRole("list", { name: "Resultados de TMDB" });
  const [movie, series] = within(list).getAllByRole("listitem");
  expect(movie).toHaveTextContent("Dune");
  expect(movie).toHaveTextContent("2021");
  expect(movie).toHaveTextContent("Película");
  expect(movie.querySelector("img")).toHaveAttribute(
    "src",
    "https://image.tmdb.org/t/p/w342/dune.jpg",
  );
  expect(series).toHaveTextContent("Serie");
  // No poster: a placeholder box keeps the row, no broken image.
  expect(series.querySelector("img")).toBeNull();
  expect(container.querySelectorAll("img")).toHaveLength(1);
});

test("a result with no year still renders", async () => {
  setup();

  await search("x", [candidate({ year: null, name: "Sin año" })]);

  expect(screen.getByRole("button", { name: /Sin año/ })).toBeInTheDocument();
});

test("a stale response never replaces the latest query's results", async () => {
  let resolveFirst: (value: unknown) => void = () => {};
  actions.searchAddCandidatesAction
    .mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve)),
    )
    .mockResolvedValueOnce(ok([candidate({ name: "Dune: Parte dos" })]));
  setup();

  type("d");
  await settle();
  type("dune");
  await settle();
  expect(screen.getByText("Dune: Parte dos")).toBeInTheDocument();

  await act(async () => {
    resolveFirst(ok([candidate({ name: "Dumbo", tmdbId: 1 })]));
  });

  expect(screen.getByText("Dune: Parte dos")).toBeInTheDocument();
  expect(screen.queryByText("Dumbo")).not.toBeInTheDocument();
});

test("clearing the field drops the results", async () => {
  setup();
  await search("dune", [candidate()]);
  expect(screen.getByRole("list", { name: "Resultados de TMDB" })).toBeInTheDocument();

  type("");
  await settle();

  expect(
    screen.queryByRole("list", { name: "Resultados de TMDB" }),
  ).not.toBeInTheDocument();
  expect(actions.searchAddCandidatesAction).toHaveBeenCalledTimes(1);
});

test("shows the TMDB attribution", () => {
  setup();

  expect(screen.getByRole("link", { name: "TMDB" })).toBeInTheDocument();
});

test("no results: says so and offers the manual form", async () => {
  setup();

  await search("zzzz", []);

  expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Añadir a mano" })).toHaveAttribute(
    "href",
    "#anadir-a-mano",
  );
});

test("a TMDB failure shows a notice and the manual form stays usable", async () => {
  actions.searchAddCandidatesAction.mockResolvedValue(err({ kind: "unavailable" }));
  setup();

  type("dune");
  await settle();

  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudo buscar en TMDB. Puedes añadirlo a mano.",
  );
  expect(screen.getByRole("textbox", { name: "Título" })).toBeEnabled();
});

test("a title already in the list shows the warning and a link to its ficha", async () => {
  setup();

  await search("dune", [candidate({ existingId: EXISTING_ID })]);

  const row = screen.getByRole("listitem");
  expect(within(row).getByText("Ya está en la lista")).toBeInTheDocument();
  expect(within(row).getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
    "href",
    `/titulo/${EXISTING_ID}`,
  );
  expect(within(row).queryByRole("button")).not.toBeInTheDocument();
});

test("choosing a result adds it from its TMDB identity and the list it came from", async () => {
  setup("vistas");
  await search("dune", [candidate()]);

  await choose(/Dune/);

  expect(actions.addFromTmdbAction).toHaveBeenCalledWith("movie", 438631, "vistas");
});

test("a double click creates at most one title", async () => {
  let finish: (value: unknown) => void = () => {};
  actions.addFromTmdbAction.mockImplementation(
    () => new Promise((resolve) => (finish = resolve)),
  );
  setup();
  await search("dune", [candidate()]);
  const button = screen.getByRole("button", { name: /Dune/ });

  await act(async () => {
    fireEvent.click(button);
    fireEvent.click(button);
  });

  expect(actions.addFromTmdbAction).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();

  // A transition that never ends would stall the ones in the next tests.
  await act(async () => {
    finish(undefined);
  });
});

test("a TMDB details failure shows the message and lets the user retry", async () => {
  actions.addFromTmdbAction.mockResolvedValue(err({ kind: "unavailable" }));
  setup();
  await search("dune", [candidate()]);

  await choose(/Dune/);

  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudo cargar la ficha de TMDB. Inténtalo de nuevo.",
  );
  expect(screen.getByRole("button", { name: /Dune/ })).toBeEnabled();
});

test("a duplicate raised by the database warns, links and can be dismissed", async () => {
  actions.addFromTmdbAction.mockResolvedValue(
    err({ kind: "duplicate", existingId: EXISTING_ID }),
  );
  setup();
  await search("dune", [candidate()]);

  await choose(/Dune/);

  const warning = screen.getByRole("alert");
  expect(warning).toHaveTextContent("Ya está en la lista");
  expect(within(warning).getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
    "href",
    `/titulo/${EXISTING_ID}`,
  );

  fireEvent.click(within(warning).getByRole("button", { name: "Cerrar aviso" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("a duplicate without a known row warns without a link", async () => {
  actions.addFromTmdbAction.mockResolvedValue(
    err({ kind: "duplicate", existingId: null }),
  );
  setup();
  await search("dune", [candidate()]);

  await choose(/Dune/);

  const warning = screen.getByRole("alert");
  expect(warning).toHaveTextContent("Ya está en la lista");
  expect(within(warning).queryByRole("link")).not.toBeInTheDocument();
});

test("manual add sends title, kind and origin", async () => {
  actions.addManualAction.mockResolvedValue(null);
  setup("vistas");

  fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
    target: { value: "Mi peli" },
  });
  fireEvent.click(screen.getByRole("radio", { name: "Serie" }));
  await submitManual();

  expect(actions.addManualAction).toHaveBeenCalledTimes(1);
  const formData = actions.addManualAction.mock.calls[0][1] as FormData;
  expect(formData.get("name")).toBe("Mi peli");
  expect(formData.get("kind")).toBe("series");
  expect(formData.get("desde")).toBe("vistas");
});

test("manual add defaults to película and the pending origin", async () => {
  actions.addManualAction.mockResolvedValue(null);
  setup();

  fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
    target: { value: "Otra" },
  });
  await submitManual();

  const formData = actions.addManualAction.mock.calls[0][1] as FormData;
  expect(formData.get("kind")).toBe("movie");
  expect(formData.get("desde")).toBe("pendientes");
});

test("an empty manual title shows the message and marks the field invalid", async () => {
  actions.addManualAction.mockResolvedValue(
    err({ kind: "invalid_input", errors: [{ field: "name", code: "empty" }] }),
  );
  setup();

  await submitManual();

  expect(screen.getByRole("textbox", { name: "Título" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByText("Introduce un título")).toBeInTheDocument();
});

test("the typed title survives a failed manual add", async () => {
  actions.addManualAction.mockResolvedValue(err({ kind: "unavailable" }));
  setup();

  fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
    target: { value: "Mi peli" },
  });
  await submitManual();

  expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Mi peli");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudo añadir. Inténtalo de nuevo.",
  );
});

test("is axe clean with results, a warning and the manual form", async () => {
  vi.useRealTimers();
  actions.searchAddCandidatesAction.mockResolvedValue(
    ok([
      candidate(),
      candidate({ tmdbId: 2, name: "Amélie", existingId: EXISTING_ID }),
    ]),
  );
  const { container } = setup();

  type("a");
  await screen.findByRole("list", { name: "Resultados de TMDB" });

  await expectNoAxeViolations(container);
});
