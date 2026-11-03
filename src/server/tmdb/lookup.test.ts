// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { getTmdbDetails, searchTmdb } from "./lookup";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", () => ({ getCurrentPerson: vi.fn() }));

const TOKEN = "secret-token-xyz";

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), init);

const searchBody = {
  results: [{ media_type: "movie", id: 1, title: "Dune", release_date: "2021-09-15" }],
};

let fetchStub: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchStub = vi.fn().mockImplementation(async () => json(searchBody));
  vi.stubGlobal("fetch", fetchStub);
  vi.stubEnv("TMDB_READ_ACCESS_TOKEN", TOKEN);
  vi.mocked(getCurrentPerson).mockResolvedValue("ignacio");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("identity (S-TL-16)", () => {
  test("search answers unauthorized and calls nothing without a person", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(await searchTmdb("dune")).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  test("details answers unauthorized and calls nothing without a person", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(await getTmdbDetails("movie", 1)).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  test("identity is checked before validation", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(await searchTmdb("   ")).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
  });
});

describe("search input", () => {
  test.each(["", "   ", "\t\n"])(
    "blank query %j is not_found without an upstream call (S-TL-17)",
    async (query) => {
      expect(await searchTmdb(query)).toEqual({
        ok: false,
        error: { kind: "not_found" },
      });
      expect(fetchStub).not.toHaveBeenCalled();
    },
  );

  test.each([undefined, null, 5, {}, ["dune"]])(
    "non-string query %j is invalid_input",
    async (query) => {
      expect(await searchTmdb(query)).toEqual({
        ok: false,
        error: { kind: "invalid_input" },
      });
      expect(fetchStub).not.toHaveBeenCalled();
    },
  );

  test("a trimmed query longer than 100 characters is invalid_input", async () => {
    expect(await searchTmdb("a".repeat(101))).toEqual({
      ok: false,
      error: { kind: "invalid_input" },
    });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  test("100 characters plus padding is accepted and sent trimmed", async () => {
    const query = "a".repeat(100);

    const result = await searchTmdb(`  ${query}  `);

    expect(result.ok).toBe(true);
    const url = new URL(String(fetchStub.mock.calls[0][0]));
    expect(url.searchParams.get("query")).toBe(query);
  });
});

describe("details input", () => {
  test.each([
    ["book", 1],
    ["movie", 0],
    ["movie", -3],
    ["movie", 1.5],
    ["movie", "1"],
    [undefined, 1],
    ["tv", 1],
  ])("kind %j and id %j are invalid_input", async (kind, id) => {
    expect(await getTmdbDetails(kind, id)).toEqual({
      ok: false,
      error: { kind: "invalid_input" },
    });
    expect(fetchStub).not.toHaveBeenCalled();
  });
});

describe("token (S-TL-11)", () => {
  test.each([undefined, "", "  "])(
    "a missing token (%j) is unavailable with zero calls and no token text",
    async (value) => {
      vi.stubEnv("TMDB_READ_ACCESS_TOKEN", value);

      const search = await searchTmdb("dune");
      const details = await getTmdbDetails("movie", 1);

      for (const result of [search, details]) {
        expect(result).toEqual({ ok: false, error: { kind: "unavailable" } });
      }
      expect(fetchStub).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(expect.any(String), "missing_token");
    },
  );
});

describe("upstream", () => {
  test("search delegates to TMDB with the token and returns candidates", async () => {
    const result = await searchTmdb("dune");

    expect(result).toEqual({
      ok: true,
      value: [{ tmdbId: 1, kind: "movie", name: "Dune", year: 2021, posterPath: null }],
    });
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(new Headers(fetchStub.mock.calls[0][1].headers).get("authorization")).toBe(
      `Bearer ${TOKEN}`,
    );
  });

  test("empty upstream results are not_found (S-TL-7)", async () => {
    fetchStub.mockImplementation(async () => json({ results: [] }));

    expect(await searchTmdb("zzzz")).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  test("details delegates to TMDB for a valid kind and id", async () => {
    fetchStub.mockImplementation(async () =>
      json({ id: 1399, name: "GoT", number_of_seasons: 8 }),
    );

    const result = await getTmdbDetails("series", 1399);

    expect(result).toMatchObject({
      ok: true,
      value: { tmdbId: 1399, kind: "series", seasonsTotal: 8 },
    });
    expect(new URL(String(fetchStub.mock.calls[0][0])).pathname).toBe("/3/tv/1399");
  });

  test("upstream 404 on details is not_found (S-TL-8)", async () => {
    fetchStub.mockImplementation(async () => json({}, { status: 404 }));

    expect(await getTmdbDetails("movie", 1)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });
});
