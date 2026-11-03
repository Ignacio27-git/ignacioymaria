// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { addTitle } from "./create";
import { getTitlesRepository } from "./repository";
import { fakeRepository, makeRecord } from "./test-helpers";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", () => ({ getCurrentPerson: vi.fn() }));
vi.mock("./repository", () => ({ getTitlesRepository: vi.fn() }));

const repo = fakeRepository();

beforeEach(() => {
  vi.mocked(getCurrentPerson).mockResolvedValue("maria");
  vi.mocked(getTitlesRepository).mockResolvedValue(repo as never);
  repo.insert.mockImplementation(async (row) => ({
    ok: true,
    value: makeRecord({ name: row.name, kind: row.kind, state: row.state }),
  }));
  repo.insertSeason.mockResolvedValue({ ok: true, value: null });
  repo.findById.mockImplementation(async () => ({ ok: true, value: makeRecord() }));
});

afterEach(() => {
  vi.clearAllMocks();
  Object.values(repo).forEach((fn) => fn.mockReset());
});

describe("identity", () => {
  test("without a person it answers unauthorized and touches nothing", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(await addTitle({ name: "Dune", kind: "movie" })).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
    expect(getTitlesRepository).not.toHaveBeenCalled();
  });
});

describe("addTitle (TC-4)", () => {
  test("S1: a minimal title is pending with an unknown watch date", async () => {
    const result = await addTitle({ name: "Dune", kind: "movie" });

    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Dune",
        kind: "movie",
        state: "pending",
        watch_date: null,
        tmdb_id: null,
      }),
    );
    expect(result.ok && result.value.title.name).toBe("Dune");
    expect(result.ok && result.value.average).toBeNull();
  });

  test("S2: a blank name is invalid_input and nothing is inserted", async () => {
    const result = await addTitle({ name: "   ", kind: "movie" });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid_input",
        errors: [{ field: "name", code: "empty" }],
      },
    });
    expect(repo.insert).not.toHaveBeenCalled();
  });

  test("trims the name", async () => {
    await addTitle({ name: "  Dune  ", kind: "movie" });

    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Dune" }),
    );
  });

  test.each([null, undefined, "x", 4, []])(
    "non-object input %j is invalid_input",
    async (input) => {
      const result = await addTitle(input);

      expect(!result.ok && result.error.kind).toBe("invalid_input");
      expect(repo.insert).not.toHaveBeenCalled();
    },
  );

  test("A1: accepts an initial state and a known watch date", async () => {
    await addTitle({
      name: "Dune",
      kind: "movie",
      state: "watched",
      watchDate: { kind: "known", date: "2026-10-30" },
    });

    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ state: "watched", watch_date: "2026-10-30" }),
    );
  });

  test("A1: an invalid state or date is rejected before any write", async () => {
    const result = await addTitle({
      name: "Dune",
      kind: "movie",
      state: "archived",
      watchDate: { kind: "known", date: "2026-02-31" },
    });

    expect(!result.ok && result.error).toEqual({
      kind: "invalid_input",
      errors: [
        { field: "state", code: "invalid_state" },
        { field: "watchDate", code: "invalid_date" },
      ],
    });
    expect(repo.insert).not.toHaveBeenCalled();
  });

  test("keeps TMDB metadata and series seasons", async () => {
    await addTitle({
      name: "Dark",
      kind: "series",
      tmdbId: 70523,
      posterPath: "/p.jpg",
      year: 2017,
      actors: ["Louis Hofmann"],
      seasonsTotal: 3,
    });

    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdb_id: 70523,
        poster_path: "/p.jpg",
        year: 2017,
        actors: ["Louis Hofmann"],
        seasons_total: 3,
      }),
    );
  });

  test("client scores and observations are never written on create", async () => {
    await addTitle({
      name: "Dune",
      kind: "movie",
      scores: { maria: 10, ignacio: 10 },
      observations: "hi",
    });

    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        score_maria: null,
        score_ignacio: null,
        observations: null,
      }),
    );
  });

  test("TC-5 S1: a duplicate is returned with the existing id", async () => {
    repo.insert.mockResolvedValue({
      ok: false,
      error: { kind: "duplicate", existingId: "abc" },
    });

    expect(await addTitle({ name: "Dune", kind: "movie", tmdbId: 1 })).toEqual({
      ok: false,
      error: { kind: "duplicate", existingId: "abc" },
    });
  });
});

describe("season 1 on create (R5.4, S28, S29)", () => {
  const seriesRecord = (seasons: unknown[] = []) =>
    makeRecord(
      { name: "Dark", kind: "series", state: "watched", seasons },
      { id: "22222222-2222-4222-8222-222222222222" },
    );

  beforeEach(() => {
    repo.insert.mockResolvedValue({ ok: true, value: seriesRecord() });
    repo.insertSeason.mockResolvedValue({ ok: true, value: null });
  });

  test("S28: a series gets season 1 with the chosen state and date, no scores", async () => {
    repo.findById.mockResolvedValue({
      ok: true,
      value: seriesRecord([{ number: 1, state: "watched" }]),
    });

    const result = await addTitle({
      name: "Dark",
      kind: "series",
      state: "watched",
      watchDate: { kind: "known", date: "2026-10-30" },
    });

    expect(repo.insertSeason).toHaveBeenCalledWith({
      title_id: "22222222-2222-4222-8222-222222222222",
      season_number: 1,
      state: "watched",
      watch_date: "2026-10-30",
    });
    expect(result.ok && result.value.title).toMatchObject({
      seasons: [{ number: 1 }],
    });
  });

  test("a pending series without a date gets a pending season 1 with a null date", async () => {
    repo.findById.mockResolvedValue({ ok: true, value: seriesRecord() });

    await addTitle({ name: "Dark", kind: "series" });

    expect(repo.insertSeason).toHaveBeenCalledWith({
      title_id: "22222222-2222-4222-8222-222222222222",
      season_number: 1,
      state: "pending",
      watch_date: null,
    });
  });

  test("S29: if the season insert fails the title is still returned", async () => {
    repo.insertSeason.mockResolvedValue({ ok: false, error: { kind: "unavailable" } });

    const result = await addTitle({ name: "Dark", kind: "series", state: "watched" });

    expect(result.ok && result.value.title.name).toBe("Dark");
    expect(result.ok && result.value.summary.state).toBe("watched");
    expect(repo.findById).not.toHaveBeenCalled();
  });

  test("if re-reading after the season insert fails the inserted title is returned", async () => {
    repo.findById.mockResolvedValue({ ok: false, error: { kind: "unavailable" } });

    const result = await addTitle({ name: "Dark", kind: "series" });

    expect(result.ok && result.value.title.name).toBe("Dark");
  });

  test("a movie never gets a season", async () => {
    await addTitle({ name: "Dune", kind: "movie" });

    expect(repo.insertSeason).not.toHaveBeenCalled();
  });

  test("a failed title insert writes no season", async () => {
    repo.insert.mockResolvedValue({ ok: false, error: { kind: "duplicate", existingId: null } });

    await addTitle({ name: "Dark", kind: "series", tmdbId: 1 });

    expect(repo.insertSeason).not.toHaveBeenCalled();
  });
});
