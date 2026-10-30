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
