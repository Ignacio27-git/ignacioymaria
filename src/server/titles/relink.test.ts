// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";
import { getTmdbDetails } from "@/server/tmdb/lookup";
import type { TmdbDetails } from "@/server/tmdb/types";

import { getTitlesRepository, tmdbKey } from "./repository";
import { relinkTitle } from "./relink";
import { fakeRepository, makeRecord, TITLE_ID } from "./test-helpers";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/current-person")>()),
  getCurrentPerson: vi.fn(),
}));
vi.mock("@/server/tmdb/lookup", () => ({ getTmdbDetails: vi.fn() }));
vi.mock("./repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./repository")>()),
  getTitlesRepository: vi.fn(),
}));

const repo = fakeRepository();

const season = (number: number) => ({
  number,
  state: "watched",
  watchDate: { kind: "known", date: "2026-03-03" },
  scores: { maria: 8, ignacio: 7 },
});

const movieDetails: TmdbDetails = {
  tmdbId: 500,
  kind: "movie",
  name: "No te preocupes cariño",
  year: 2025,
  posterPath: "/p.jpg",
  actors: ["Ana", "Beto"],
};
const seriesDetails: TmdbDetails = {
  tmdbId: 70523,
  kind: "series",
  name: "Dark",
  year: 2017,
  posterPath: "/d.jpg",
  actors: ["Louis"],
  seasonsTotal: 3,
  seasons: [],
};

const manualMovie = () => makeRecord({ name: "No te preocupes querida" });
const seriesWith = (count: number) =>
  makeRecord({
    name: "Dark",
    kind: "series",
    seasonsWatched: 3,
    seasons: Array.from({ length: count }, (_, i) => season(i + 1)),
  });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getCurrentPerson).mockResolvedValue("maria");
  vi.mocked(getTitlesRepository).mockResolvedValue(repo as never);
  vi.mocked(getTmdbDetails).mockResolvedValue({ ok: true, value: movieDetails });
  repo.findById.mockImplementation(async () => ({ ok: true, value: manualMovie() }));
  repo.findIdsByTmdb.mockResolvedValue({ ok: true, value: new Map() });
  repo.update.mockImplementation(async () => ({ ok: true, value: manualMovie() }));
  repo.relinkSeriesToMovie.mockResolvedValue({ ok: true, value: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  Object.values(repo).forEach((fn) => fn.mockReset());
});

describe("guard order", () => {
  test("without a person nothing else is touched", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(await relinkTitle(TITLE_ID, "movie", 500)).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
    expect(getTitlesRepository).not.toHaveBeenCalled();
    expect(getTmdbDetails).not.toHaveBeenCalled();
  });

  test("a non-uuid id is not_found before any database or TMDB call", async () => {
    expect(await relinkTitle("nope", "movie", 500)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(getTitlesRepository).not.toHaveBeenCalled();
    expect(getTmdbDetails).not.toHaveBeenCalled();
  });

  test.each([
    ["kind", "tv", 500],
    ["kind", undefined, 500],
    ["tmdbId", "movie", 0],
    ["tmdbId", "movie", 1.5],
    ["tmdbId", "movie", "500"],
  ])(
    "invalid %s is invalid_input with no database or TMDB call",
    async (field, kind, tmdbId) => {
      const result = await relinkTitle(TITLE_ID, kind, tmdbId);

      expect(result).toEqual({
        ok: false,
        error: {
          kind: "invalid_input",
          errors: [{ field, code: expect.any(String) }],
        },
      });
      expect(getTitlesRepository).not.toHaveBeenCalled();
      expect(getTmdbDetails).not.toHaveBeenCalled();
    },
  );

  test("a missing title is not_found and TMDB is not called", async () => {
    repo.findById.mockResolvedValue({ ok: false, error: { kind: "not_found" } });

    expect(await relinkTitle(TITLE_ID, "movie", 500)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(getTmdbDetails).not.toHaveBeenCalled();
  });

  test("a series with two seasons cannot become a movie and TMDB is not called", async () => {
    repo.findById.mockResolvedValue({ ok: true, value: seriesWith(2) });

    expect(await relinkTitle(TITLE_ID, "movie", 500)).toEqual({
      ok: false,
      error: {
        kind: "invalid_input",
        errors: [{ field: "kind", code: "series_has_seasons" }],
      },
    });
    expect(getTmdbDetails).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.relinkSeriesToMovie).not.toHaveBeenCalled();
  });

  test("a pair held by another title is a duplicate and TMDB is not called", async () => {
    repo.findIdsByTmdb.mockResolvedValue({
      ok: true,
      value: new Map([[tmdbKey("movie", 500), "other-id"]]),
    });

    expect(await relinkTitle(TITLE_ID, "movie", 500)).toEqual({
      ok: false,
      error: { kind: "duplicate", existingId: "other-id" },
    });
    expect(repo.findIdsByTmdb).toHaveBeenCalledWith([
      { kind: "movie", tmdbId: 500 },
    ]);
    expect(getTmdbDetails).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  test("the pair held by the same title is allowed (a refresh)", async () => {
    repo.findIdsByTmdb.mockResolvedValue({
      ok: true,
      value: new Map([[tmdbKey("movie", 500), TITLE_ID]]),
    });

    const result = await relinkTitle(TITLE_ID, "movie", 500);

    expect(result.ok).toBe(true);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  test("a failing duplicate lookup does not block the relink", async () => {
    repo.findIdsByTmdb.mockResolvedValue({
      ok: false,
      error: { kind: "unavailable" },
    });

    expect((await relinkTitle(TITLE_ID, "movie", 500)).ok).toBe(true);
  });
});

describe("plain update path", () => {
  test("a manual movie is relinked with only the allow-listed TMDB columns", async () => {
    const result = await relinkTitle(TITLE_ID, "movie", 500);

    expect(getTmdbDetails).toHaveBeenCalledWith("movie", 500);
    expect(repo.update).toHaveBeenCalledWith(TITLE_ID, {
      name: "No te preocupes cariño",
      kind: "movie",
      year: 2025,
      actors: ["Ana", "Beto"],
      tmdb_id: 500,
      poster_path: "/p.jpg",
      seasons_total: null,
    });
    expect(result.ok && result.value.id).toBe(TITLE_ID);
    expect(repo.relinkSeriesToMovie).not.toHaveBeenCalled();
  });

  test("the patch never contains user-owned columns", async () => {
    await relinkTitle(TITLE_ID, "movie", 500);

    const patch = repo.update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(patch).length).toBeGreaterThan(0);
    for (const column of [
      "score_maria",
      "score_ignacio",
      "state",
      "watch_date",
      "observations",
      "import_key",
    ]) {
      expect(Object.keys(patch)).not.toContain(column);
    }
  });

  test("details without year, poster and actors clear the previous values", async () => {
    vi.mocked(getTmdbDetails).mockResolvedValue({
      ok: true,
      value: {
        tmdbId: 500,
        kind: "movie",
        name: "Dune",
        year: null,
        posterPath: null,
        actors: [],
      },
    });

    await relinkTitle(TITLE_ID, "movie", 500);

    expect(repo.update).toHaveBeenCalledWith(
      TITLE_ID,
      expect.objectContaining({ year: null, poster_path: null, actors: [] }),
    );
  });

  test("movie to series sets the series fields and keeps seasons_watched out of the patch", async () => {
    vi.mocked(getTmdbDetails).mockResolvedValue({
      ok: true,
      value: seriesDetails,
    });

    await relinkTitle(TITLE_ID, "series", 70523);

    const patch = repo.update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(patch).toEqual({
      name: "Dark",
      kind: "series",
      year: 2017,
      actors: ["Louis"],
      tmdb_id: 70523,
      poster_path: "/d.jpg",
      seasons_total: 3,
    });
  });

  test("series to series keeps seasons_watched out of the patch", async () => {
    repo.findById.mockResolvedValue({ ok: true, value: seriesWith(2) });
    vi.mocked(getTmdbDetails).mockResolvedValue({
      ok: true,
      value: seriesDetails,
    });

    await relinkTitle(TITLE_ID, "series", 70523);

    const patch = repo.update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(patch.kind).toBe("series");
    expect(Object.keys(patch)).not.toContain("seasons_watched");
    expect(repo.relinkSeriesToMovie).not.toHaveBeenCalled();
  });

  test("series with no seasons to movie is a plain update that clears seasons_watched", async () => {
    repo.findById.mockResolvedValue({ ok: true, value: seriesWith(0) });

    await relinkTitle(TITLE_ID, "movie", 500);

    expect(repo.update).toHaveBeenCalledWith(
      TITLE_ID,
      expect.objectContaining({
        kind: "movie",
        seasons_watched: null,
        seasons_total: null,
      }),
    );
    expect(repo.relinkSeriesToMovie).not.toHaveBeenCalled();
  });

  test("a duplicate raised by the update is returned unchanged", async () => {
    repo.update.mockResolvedValue({
      ok: false,
      error: { kind: "duplicate", existingId: "racer" },
    });

    expect(await relinkTitle(TITLE_ID, "movie", 500)).toEqual({
      ok: false,
      error: { kind: "duplicate", existingId: "racer" },
    });
  });
});

describe("single-season fold", () => {
  test("calls the RPC with the TMDB fields, does not update and re-reads", async () => {
    repo.findById
      .mockResolvedValueOnce({ ok: true, value: seriesWith(1) })
      .mockResolvedValueOnce({ ok: true, value: manualMovie() });

    const result = await relinkTitle(TITLE_ID, "movie", 500);

    expect(repo.relinkSeriesToMovie).toHaveBeenCalledWith(TITLE_ID, {
      tmdbId: 500,
      name: "No te preocupes cariño",
      year: 2025,
      actors: ["Ana", "Beto"],
      posterPath: "/p.jpg",
    });
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.findById).toHaveBeenCalledTimes(2);
    expect(result.ok && result.value.title.kind).toBe("movie");
  });

  test.each([
    [{ kind: "duplicate", existingId: "holder" }],
    [
      {
        kind: "invalid_input",
        errors: [{ field: "kind", code: "series_has_seasons" }],
      },
    ],
    [{ kind: "forbidden" }],
  ])("an RPC failure %j is returned and nothing is re-read", async (error) => {
    repo.findById.mockResolvedValueOnce({ ok: true, value: seriesWith(1) });
    repo.relinkSeriesToMovie.mockResolvedValue({ ok: false, error });

    expect(await relinkTitle(TITLE_ID, "movie", 500)).toEqual({
      ok: false,
      error,
    });
    expect(repo.findById).toHaveBeenCalledTimes(1);
  });
});

describe("TMDB failures and forged input", () => {
  test.each(["not_found", "unavailable", "invalid_input"] as const)(
    "TMDB %s becomes tmdb_unavailable and writes nothing",
    async (kind) => {
      vi.mocked(getTmdbDetails).mockResolvedValue({
        ok: false,
        error: { kind },
      });

      expect(await relinkTitle(TITLE_ID, "movie", 500)).toEqual({
        ok: false,
        error: { kind: "tmdb_unavailable" },
      });
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.relinkSeriesToMovie).not.toHaveBeenCalled();
    },
  );

  test("TMDB unauthorized stays unauthorized", async () => {
    vi.mocked(getTmdbDetails).mockResolvedValue({
      ok: false,
      error: { kind: "unauthorized" },
    });

    expect(await relinkTitle(TITLE_ID, "movie", 500)).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
  });

  test("extra arguments are ignored: only the TMDB details feed the patch", async () => {
    const forged = relinkTitle as unknown as (
      ...args: unknown[]
    ) => ReturnType<typeof relinkTitle>;

    await forged(TITLE_ID, "movie", 500, { name: "Hacked", score_maria: 10 });

    const patch = repo.update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(patch.name).toBe("No te preocupes cariño");
    expect(Object.keys(patch)).not.toContain("score_maria");
  });

  test("details that the domain rejects are invalid_input and write nothing", async () => {
    vi.mocked(getTmdbDetails).mockResolvedValue({
      ok: true,
      value: { ...movieDetails, posterPath: "no-slash.jpg" },
    });

    const result = await relinkTitle(TITLE_ID, "movie", 500);

    expect(!result.ok && result.error.kind).toBe("invalid_input");
    expect(repo.update).not.toHaveBeenCalled();
  });
});
