// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentPerson } from "@/server/auth/current-person";

import { getTmdbDetails, searchTmdb } from "./lookup";
import { resolveTmdbTestDouble } from "./test-double";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/current-person", () => ({ getCurrentPerson: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("activation (A4)", () => {
  test("is off without the flag", () => {
    vi.stubEnv("TMDB_TEST_DOUBLE", "");

    expect(resolveTmdbTestDouble()).toBeNull();
  });

  test.each(["0", "true", "yes"])("is off for flag value %j", (value) => {
    vi.stubEnv("TMDB_TEST_DOUBLE", value);

    expect(resolveTmdbTestDouble()).toBeNull();
  });

  test("is on with TMDB_TEST_DOUBLE=1 outside production", () => {
    vi.stubEnv("TMDB_TEST_DOUBLE", "1");
    vi.stubEnv("NODE_ENV", "development");

    expect(resolveTmdbTestDouble()).not.toBeNull();
  });

  test("throws when the flag is set in production", () => {
    vi.stubEnv("TMDB_TEST_DOUBLE", "1");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => resolveTmdbTestDouble()).toThrow(/production/);
  });

  test("production without the flag is fine", () => {
    vi.stubEnv("TMDB_TEST_DOUBLE", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(resolveTmdbTestDouble()).toBeNull();
  });
});

describe("deterministic data", () => {
  beforeEach(() => {
    vi.stubEnv("TMDB_TEST_DOUBLE", "1");
    vi.stubEnv("NODE_ENV", "test");
  });

  const client = () => {
    const double = resolveTmdbTestDouble();
    if (!double) throw new Error("double inactive");
    return double;
  };

  test("search matches movies and series, ignoring case and accents", async () => {
    const dune = await client().search("DUNE");
    const amelie = await client().search("amelie");

    expect(dune.ok && dune.value.map((c) => c.kind).sort()).toEqual([
      "movie",
      "series",
    ]);
    expect(amelie.ok && amelie.value[0]).toMatchObject({
      name: "Amélie",
      kind: "movie",
      posterPath: null,
    });
  });

  test("search is repeatable", async () => {
    expect(await client().search("dune")).toEqual(await client().search("dune"));
  });

  test("search with no match is not_found, like the real client", async () => {
    expect(await client().search("zzzz-nothing")).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  test("details of a movie carry actors and poster", async () => {
    const details = await client().details("movie", 438631);

    expect(details).toMatchObject({
      ok: true,
      value: { kind: "movie", name: "Dune", year: 2021, posterPath: "/dune.jpg" },
    });
    expect(details.ok && details.value.actors.length).toBeGreaterThan(0);
  });

  test("details of a series carry the seasons total", async () => {
    const details = await client().details("series", 70523);

    expect(details).toMatchObject({
      ok: true,
      value: { kind: "series", name: "Dark", seasonsTotal: 3 },
    });
  });

  test("details of an unknown id, or of the wrong kind, are not_found", async () => {
    expect(await client().details("movie", 999999999)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(await client().details("series", 438631)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });
});

describe("wired into the lookup", () => {
  beforeEach(() => {
    vi.stubEnv("TMDB_TEST_DOUBLE", "1");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TMDB_READ_ACCESS_TOKEN", "");
    vi.mocked(getCurrentPerson).mockResolvedValue("maria");
  });

  test("search and details work without a token and never reach the network", async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal("fetch", fetchStub);

    const found = await searchTmdb("dune");
    const details = await getTmdbDetails("movie", 438631);

    expect(found.ok).toBe(true);
    expect(details.ok).toBe(true);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  test("identity still comes first", async () => {
    vi.mocked(getCurrentPerson).mockResolvedValue(null);

    expect(await searchTmdb("dune")).toEqual({
      ok: false,
      error: { kind: "unauthorized" },
    });
  });

  test("input validation still applies", async () => {
    expect(await searchTmdb(42)).toEqual({
      ok: false,
      error: { kind: "invalid_input" },
    });
  });
});

describe("startup guard", () => {
  test("importing the lookup throws when the flag is set in production", async () => {
    vi.stubEnv("TMDB_TEST_DOUBLE", "1");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();

    await expect(import("./lookup")).rejects.toThrow(/production/);
  });
});
