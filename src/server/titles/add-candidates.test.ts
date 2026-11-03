// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { searchTmdb } from "@/server/tmdb/lookup";

import { searchAddCandidates } from "./add-candidates";
import { getTitlesRepository, tmdbKey } from "./repository";
import { fakeRepository } from "./test-helpers";

vi.mock("server-only", () => ({}));
vi.mock("@/server/tmdb/lookup", () => ({ searchTmdb: vi.fn() }));
vi.mock("./repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./repository")>()),
  getTitlesRepository: vi.fn(),
}));

const repo = fakeRepository();

const dune = { tmdbId: 438631, kind: "movie", name: "Dune", year: 2021, posterPath: "/d.jpg" } as const;
const dark = { tmdbId: 70523, kind: "series", name: "Dark", year: 2017, posterPath: null } as const;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getTitlesRepository).mockResolvedValue(repo as never);
  vi.mocked(searchTmdb).mockResolvedValue({ ok: true, value: [dune, dark] });
  repo.findIdsByTmdb.mockResolvedValue({ ok: true, value: new Map() });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  Object.values(repo).forEach((fn) => fn.mockReset());
});

test("annotates each candidate with the id of the title already in the list", async () => {
  repo.findIdsByTmdb.mockResolvedValue({
    ok: true,
    value: new Map([[tmdbKey("movie", 438631), "existing-dune"]]),
  });

  const result = await searchAddCandidates("dune");

  expect(searchTmdb).toHaveBeenCalledWith("dune");
  expect(repo.findIdsByTmdb).toHaveBeenCalledWith([
    { kind: "movie", tmdbId: 438631 },
    { kind: "series", tmdbId: 70523 },
  ]);
  expect(result).toEqual({
    ok: true,
    value: [
      { ...dune, existingId: "existing-dune" },
      { ...dark, existingId: null },
    ],
  });
});

test("a TMDB failure is returned as a typed failure and the database is not read", async () => {
  vi.mocked(searchTmdb).mockResolvedValue({
    ok: false,
    error: { kind: "unavailable" },
  });

  expect(await searchAddCandidates("dune")).toEqual({
    ok: false,
    error: { kind: "unavailable" },
  });
  expect(getTitlesRepository).not.toHaveBeenCalled();
});

test.each(["unauthorized", "not_found", "invalid_input"] as const)(
  "TMDB %s passes through",
  async (kind) => {
    vi.mocked(searchTmdb).mockResolvedValue({ ok: false, error: { kind } });

    expect(await searchAddCandidates("x")).toEqual({
      ok: false,
      error: { kind },
    });
  },
);

test("if the duplicate lookup fails, candidates still show (the unique index guards)", async () => {
  repo.findIdsByTmdb.mockResolvedValue({
    ok: false,
    error: { kind: "unavailable" },
  });

  const result = await searchAddCandidates("dune");

  expect(result.ok && result.value.map((c) => c.existingId)).toEqual([
    null,
    null,
  ]);
});
