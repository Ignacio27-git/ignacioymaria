import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { err, ok } from "@/domain";
import type { AddCandidate } from "@/server/titles/add-candidates";
import { expectNoAxeViolations } from "@/test/axe";

import { RelinkIsland } from "./relink-island";

const mocks = vi.hoisted(() => ({
  searchRelinkCandidatesAction: vi.fn(),
  relinkTitleAction: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/app/_actions/titles", () => ({
  searchRelinkCandidatesAction: mocks.searchRelinkCandidatesAction,
  relinkTitleAction: mocks.relinkTitleAction,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const TITLE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const DEBOUNCE = 250;

const manual = {
  name: "No te preocupes querida",
  year: null,
  kind: "movie",
  posterPath: null,
  tmdbId: null,
} as const;
const linkedDune = {
  name: "Dune",
  year: 2021,
  kind: "movie",
  posterPath: "/dune.jpg",
  tmdbId: 438631,
} as const;
const darkSeries = {
  name: "Dark",
  year: 2017,
  kind: "series",
  posterPath: "/dark.jpg",
  tmdbId: 70523,
} as const;

function candidate(overrides: Partial<AddCandidate> = {}): AddCandidate {
  return {
    tmdbId: 646380,
    kind: "movie",
    name: "No te preocupes cariño",
    year: 2022,
    posterPath: "/darling.jpg",
    existingId: null,
    ...overrides,
  };
}

function setup(
  current: Parameters<typeof RelinkIsland>[0]["current"] = manual,
  seasonCount = 0,
) {
  return render(
    <RelinkIsland id={TITLE_ID} current={current} seasonCount={seasonCount} />,
  );
}

async function settle(ms = DEBOUNCE) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function openPanel(label: RegExp | string = /TMDB/) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  });
}

async function pick(name: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

const dialog = () => screen.getByRole("dialog");

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.searchRelinkCandidatesAction.mockResolvedValue(ok([candidate()]));
  mocks.relinkTitleAction.mockResolvedValue(ok({ id: TITLE_ID }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("entry point (RL-1)", () => {
  test("a manual title offers to link with TMDB", () => {
    setup(manual);

    expect(
      screen.getByRole("button", { name: "Vincular con TMDB" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  test("a linked title offers to change the ficha", () => {
    setup(linkedDune);

    expect(
      screen.getByRole("button", { name: "Cambiar ficha de TMDB" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Vincular con TMDB" }),
    ).not.toBeInTheDocument();
  });
});

describe("panel search (RL-2, RL-3)", () => {
  test("opening prefills the current name and searches at once, without the debounce", async () => {
    setup(manual);

    await openPanel("Vincular con TMDB");

    expect(
      screen.getByRole("searchbox", { name: "Buscar película o serie" }),
    ).toHaveValue("No te preocupes querida");
    expect(mocks.searchRelinkCandidatesAction).toHaveBeenCalledTimes(1);
    expect(mocks.searchRelinkCandidatesAction).toHaveBeenCalledWith(
      TITLE_ID,
      "No te preocupes querida",
    );
    expect(
      screen.getByRole("button", { name: /No te preocupes cariño/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Vincular con TMDB" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("editing the query searches 250 ms after the last keystroke, on the trimmed text", async () => {
    setup(manual);
    await openPanel("Vincular con TMDB");
    mocks.searchRelinkCandidatesAction.mockClear();
    const box = screen.getByRole("searchbox");

    fireEvent.change(box, { target: { value: "dune" } });
    await settle(200);
    fireEvent.change(box, { target: { value: "dune " } });
    await settle(DEBOUNCE - 1);
    expect(mocks.searchRelinkCandidatesAction).not.toHaveBeenCalled();

    await settle(1);

    expect(mocks.searchRelinkCandidatesAction).toHaveBeenCalledTimes(1);
    expect(mocks.searchRelinkCandidatesAction).toHaveBeenCalledWith(
      TITLE_ID,
      "dune",
    );
  });

  test("submitting the field searches immediately", async () => {
    setup(manual);
    await openPanel("Vincular con TMDB");
    mocks.searchRelinkCandidatesAction.mockClear();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "matrix" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole("search"));
    });

    expect(mocks.searchRelinkCandidatesAction).toHaveBeenCalledWith(
      TITLE_ID,
      "matrix",
    );
  });

  test("a stale response never replaces the latest query's results", async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    mocks.searchRelinkCandidatesAction
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve)),
      )
      .mockResolvedValueOnce(ok([candidate({ name: "Segunda búsqueda" })]));
    setup(manual);
    await openPanel("Vincular con TMDB");

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "otra" },
    });
    await settle();
    await act(async () => {
      resolveFirst(ok([candidate({ name: "Resultado viejo" })]));
    });

    expect(
      screen.getByRole("button", { name: /Segunda búsqueda/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Resultado viejo")).not.toBeInTheDocument();
  });

  test("the current ficha is selectable and marked, other results are not marked", async () => {
    mocks.searchRelinkCandidatesAction.mockResolvedValue(
      ok([
        candidate({ tmdbId: 438631, name: "Dune", year: 2021 }),
        candidate({ tmdbId: 90228, kind: "series", name: "Dune: Prophecy", year: 2024 }),
      ]),
    );
    setup(linkedDune);
    await openPanel("Cambiar ficha de TMDB");

    const current = screen.getByRole("button", { name: /^Dune\s*2021/ });
    expect(current).toBeEnabled();
    expect(current).toHaveTextContent("Ficha actual");
    expect(
      screen.getByRole("button", { name: /Dune: Prophecy/ }),
    ).not.toHaveTextContent("Ficha actual");
    expect(screen.getAllByText("Ficha actual")).toHaveLength(1);
  });

  test("a result already in the list as another title links to it and cannot be picked", async () => {
    mocks.searchRelinkCandidatesAction.mockResolvedValue(
      ok([candidate({ existingId: OTHER_ID })]),
    );
    setup(manual);
    await openPanel("Vincular con TMDB");

    expect(screen.getByText("Ya está en la lista")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
      "href",
      `/titulo/${OTHER_ID}`,
    );
    expect(
      screen.queryByRole("button", { name: /No te preocupes cariño/ }),
    ).not.toBeInTheDocument();
  });

  test("no results and a failed search have their own copy", async () => {
    mocks.searchRelinkCandidatesAction.mockResolvedValueOnce(
      err({ kind: "not_found" }),
    );
    setup(manual);
    await openPanel("Vincular con TMDB");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();

    mocks.searchRelinkCandidatesAction.mockResolvedValueOnce(
      err({ kind: "unavailable" }),
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "x" },
    });
    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo buscar en TMDB. Inténtalo de nuevo.",
    );
    expect(screen.queryByText("Sin resultados")).not.toBeInTheDocument();
  });

  test("closing hides the panel and drops late results", async () => {
    let resolveSearch: (value: unknown) => void = () => {};
    mocks.searchRelinkCandidatesAction.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSearch = resolve)),
    );
    setup(manual);
    await openPanel("Vincular con TMDB");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    });
    await act(async () => {
      resolveSearch(ok([candidate()]));
    });

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Vincular con TMDB" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/No te preocupes cariño/)).not.toBeInTheDocument();
  });
});

describe("confirmation dialog (RL-4)", () => {
  test("picking a candidate shows before and after and writes nothing yet", async () => {
    setup(linkedDune);
    await openPanel("Cambiar ficha de TMDB");

    await pick(/No te preocupes cariño/);

    const box = within(dialog());
    const before = box.getByRole("group", { name: "Ahora" });
    const after = box.getByRole("group", { name: "Pasará a ser" });
    expect(before).toHaveTextContent("Dune");
    expect(before).toHaveTextContent("2021 · Película");
    expect(after).toHaveTextContent("No te preocupes cariño");
    expect(after).toHaveTextContent("2022 · Película");
    expect(box.getByText(/Se conservan las notas, el estado, la fecha/)).toHaveTextContent(
      "Se conservan las notas, el estado, la fecha, las observaciones y las temporadas.",
    );
    expect(mocks.relinkTitleAction).not.toHaveBeenCalled();
  });

  test("cancelling closes the dialog and writes nothing", async () => {
    setup(manual);
    await openPanel("Vincular con TMDB");
    await pick(/No te preocupes cariño/);

    await act(async () => {
      fireEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.relinkTitleAction).not.toHaveBeenCalled();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  test("a series with one season turning into a movie shows the fold notice", async () => {
    setup(darkSeries, 1);
    await openPanel("Cambiar ficha de TMDB");

    await pick(/No te preocupes cariño/);

    expect(dialog()).toHaveTextContent(
      "La serie tiene una sola temporada: su estado, su fecha y las dos notas pasan a la película y la temporada se elimina. Las observaciones se conservan.",
    );
    expect(dialog()).not.toHaveTextContent("Se conservan las notas, el estado");
  });

  test.each([
    ["a series with no seasons", 0, "movie"],
    ["a series with one season staying a series", 1, "series"],
  ] as const)("%s shows the default copy", async (_label, seasons, kind) => {
    mocks.searchRelinkCandidatesAction.mockResolvedValue(
      ok([candidate({ kind, tmdbId: 5, name: "Otra" })]),
    );
    setup(darkSeries, seasons);
    await openPanel("Cambiar ficha de TMDB");

    await pick(/Otra/);

    expect(dialog()).toHaveTextContent("Se conservan las notas, el estado");
    expect(dialog()).not.toHaveTextContent("pasan a la película");
  });

  test("a series with several seasons cannot pick a movie: blocked at once, no dialog", async () => {
    setup(darkSeries, 2);
    await openPanel("Cambiar ficha de TMDB");

    await pick(/No te preocupes cariño/);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Esta serie tiene varias temporadas registradas y no puede pasar a ser una película.",
    );
    expect(mocks.relinkTitleAction).not.toHaveBeenCalled();
  });

  test("a series with several seasons can still pick another series", async () => {
    mocks.searchRelinkCandidatesAction.mockResolvedValue(
      ok([candidate({ kind: "series", tmdbId: 9, name: "Otra serie" })]),
    );
    setup(darkSeries, 2);
    await openPanel("Cambiar ficha de TMDB");

    await pick(/Otra serie/);

    expect(dialog()).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("confirm (RL-9, RL-11)", () => {
  test("sends ids only, refreshes, closes the panel and confirms", async () => {
    setup(manual);
    await openPanel("Vincular con TMDB");
    await pick(/No te preocupes cariño/);

    await act(async () => {
      fireEvent.click(within(dialog()).getByRole("button", { name: "Vincular" }));
    });

    expect(mocks.relinkTitleAction).toHaveBeenCalledTimes(1);
    expect(mocks.relinkTitleAction).toHaveBeenCalledWith(TITLE_ID, "movie", 646380);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ficha actualizada.");
  });

  test("a linked title confirms with its own label", async () => {
    setup(linkedDune);
    await openPanel("Cambiar ficha de TMDB");
    await pick(/No te preocupes cariño/);

    expect(
      within(dialog()).getByRole("button", { name: "Cambiar ficha" }),
    ).toBeInTheDocument();
  });

  test("a second tap while the first is running does not send twice", async () => {
    let finish: (value: unknown) => void = () => {};
    mocks.relinkTitleAction.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    setup(manual);
    await openPanel("Vincular con TMDB");
    await pick(/No te preocupes cariño/);
    const confirm = within(dialog()).getByRole("button", { name: "Vincular" });

    await act(async () => {
      fireEvent.click(confirm);
      fireEvent.click(confirm);
    });
    expect(mocks.relinkTitleAction).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();

    await act(async () => {
      finish(ok({ id: TITLE_ID }));
    });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  test.each([
    [
      "a duplicate",
      { kind: "duplicate", existingId: OTHER_ID },
      "Ya está en la lista",
    ],
    [
      "several seasons",
      {
        kind: "invalid_input",
        errors: [{ field: "kind", code: "series_has_seasons" }],
      },
      "Esta serie tiene varias temporadas registradas y no puede pasar a ser una película.",
    ],
    [
      "TMDB failing",
      { kind: "tmdb_unavailable" },
      "No se pudo cargar la ficha de TMDB. Inténtalo de nuevo.",
    ],
    [
      "a deleted title",
      { kind: "not_found" },
      "Este título ya no está en la lista.",
    ],
    [
      "anything else",
      { kind: "forbidden" },
      "No se pudo vincular. Inténtalo de nuevo.",
    ],
  ])("%s keeps the panel open with its own message", async (_label, error, text) => {
    mocks.relinkTitleAction.mockResolvedValue(err(error));
    setup(manual);
    await openPanel("Vincular con TMDB");
    await pick(/No te preocupes cariño/);

    await act(async () => {
      fireEvent.click(within(dialog()).getByRole("button", { name: "Vincular" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(text);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.queryByText("Ficha actualizada.")).not.toBeInTheDocument();
  });

  test("a duplicate links to the title that holds the pair", async () => {
    mocks.relinkTitleAction.mockResolvedValue(
      err({ kind: "duplicate", existingId: OTHER_ID }),
    );
    setup(manual);
    await openPanel("Vincular con TMDB");
    await pick(/No te preocupes cariño/);

    await act(async () => {
      fireEvent.click(within(dialog()).getByRole("button", { name: "Vincular" }));
    });

    expect(
      within(screen.getByRole("alert")).getByRole("link", { name: "Abrir ficha" }),
    ).toHaveAttribute("href", `/titulo/${OTHER_ID}`);
  });
});

test("is axe clean closed, open and with the dialog", async () => {
  // axe schedules its own timers: it cannot run on the faked clock.
  vi.useRealTimers();
  const { container } = setup(darkSeries, 1);
  await expectNoAxeViolations(container);

  await openPanel("Cambiar ficha de TMDB");
  await expectNoAxeViolations(container);

  await pick(/No te preocupes cariño/);
  await expectNoAxeViolations(container);
});
