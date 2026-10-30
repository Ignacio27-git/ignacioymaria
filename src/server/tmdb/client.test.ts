// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createTmdbClient } from "./client";

vi.mock("server-only", () => ({}));

const TOKEN = "secret-token-xyz";

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), init);

const searchBody = {
  results: [
    { media_type: "movie", id: 1, title: "Dune", release_date: "2021-09-15" },
  ],
};
const movieBody = { id: 438631, title: "Dune", release_date: "2021-09-15" };

let fetchImpl: ReturnType<typeof vi.fn>;
let sleep: ReturnType<typeof vi.fn>;
let errorLog: ReturnType<typeof vi.spyOn>;

function client(timeoutMs?: number) {
  return createTmdbClient({
    token: TOKEN,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep: sleep as unknown as (ms: number) => Promise<void>,
    timeoutMs,
  });
}

function urlOf(call: number): URL {
  return new URL(String(fetchImpl.mock.calls[call][0]));
}

function initOf(
  call: number,
): RequestInit & { next?: { revalidate?: number } } {
  return fetchImpl.mock.calls[call][1];
}

beforeEach(() => {
  fetchImpl = vi.fn();
  sleep = vi.fn().mockResolvedValue(undefined);
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("search", () => {
  test("requests es-ES multi search with a Bearer header and no token in the URL (S-TL-1, S-TL-12)", async () => {
    fetchImpl.mockResolvedValue(json(searchBody));

    const result = await client().search("dune part two");

    expect(result).toEqual({
      ok: true,
      value: [
        { tmdbId: 1, kind: "movie", name: "Dune", year: 2021, posterPath: null },
      ],
    });
    const url = urlOf(0);
    expect(url.origin + url.pathname).toBe(
      "https://api.themoviedb.org/3/search/multi",
    );
    expect(url.searchParams.get("query")).toBe("dune part two");
    expect(url.searchParams.get("language")).toBe("es-ES");
    expect(url.searchParams.get("include_adult")).toBe("false");
    expect(url.toString()).not.toContain(TOKEN);
    expect(new Headers(initOf(0).headers).get("authorization")).toBe(
      `Bearer ${TOKEN}`,
    );
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  test("asks Next to cache successful searches for one hour (S-TL-13)", async () => {
    fetchImpl.mockResolvedValue(json(searchBody));
    await client().search("dune");
    expect(initOf(0).next?.revalidate).toBe(3600);
  });

  test("an empty result list is not_found (S-TL-7)", async () => {
    fetchImpl.mockResolvedValue(json({ results: [] }));
    expect(await client().search("zzzz")).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  test("a list with only people is not_found (S-TL-2)", async () => {
    fetchImpl.mockResolvedValue(
      json({ results: [{ media_type: "person", id: 1, name: "X" }] }),
    );
    expect(await client().search("x")).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });
});

describe("details", () => {
  test("movie details use /movie/{id} with credits in es-ES and cache for 7 days (S-TL-14)", async () => {
    fetchImpl.mockResolvedValue(json(movieBody));

    const result = await client().details("movie", 438631);

    expect(result).toMatchObject({
      ok: true,
      value: { tmdbId: 438631, kind: "movie" },
    });
    const url = urlOf(0);
    expect(url.pathname).toBe("/3/movie/438631");
    expect(url.searchParams.get("append_to_response")).toBe("credits");
    expect(url.searchParams.get("language")).toBe("es-ES");
    expect(initOf(0).next?.revalidate).toBe(604800);
  });

  test("series details use /tv/{id}", async () => {
    fetchImpl.mockResolvedValue(
      json({ id: 1399, name: "GoT", number_of_seasons: 8 }),
    );

    const result = await client().details("series", 1399);

    expect(urlOf(0).pathname).toBe("/3/tv/1399");
    expect(result).toMatchObject({
      ok: true,
      value: { kind: "series", seasonsTotal: 8 },
    });
  });

  test("404 is not_found (S-TL-8)", async () => {
    fetchImpl.mockResolvedValue(json({}, { status: 404 }));
    expect(await client().details("movie", 1)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  test("a payload without id or name is unavailable", async () => {
    fetchImpl.mockResolvedValue(json({ unexpected: true }));
    expect(await client().details("movie", 1)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});

describe("failures", () => {
  test("429 retries once after Retry-After capped at one second, then succeeds (S-TL-9)", async () => {
    fetchImpl
      .mockResolvedValueOnce(
        json({}, { status: 429, headers: { "Retry-After": "30" } }),
      )
      .mockResolvedValueOnce(json(searchBody));

    const result = await client().search("dune");

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  test("429 honours a shorter Retry-After", async () => {
    fetchImpl
      .mockResolvedValueOnce(
        json({}, { status: 429, headers: { "Retry-After": "0" } }),
      )
      .mockResolvedValueOnce(json(searchBody));

    await client().search("dune");

    expect(sleep).toHaveBeenCalledWith(0);
  });

  test("429 on every attempt ends unavailable after exactly two calls (S-TL-9)", async () => {
    fetchImpl.mockImplementation(async () => json({}, { status: 429 }));

    expect(await client().search("dune")).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  test.each([500, 503])(
    "%i is unavailable without retry (S-TL-10)",
    async (status) => {
      fetchImpl.mockResolvedValue(json({}, { status }));

      expect(await client().search("dune")).toEqual({
        ok: false,
        error: { kind: "unavailable" },
      });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );

  test("a network error is unavailable and never throws (S-TL-10)", async () => {
    fetchImpl.mockRejectedValue(new TypeError("fetch failed"));
    expect(await client().search("dune")).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  test("a request that exceeds the timeout is unavailable", async () => {
    fetchImpl.mockImplementation(
      (_url: unknown, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    expect(await client(10).search("dune")).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  test("malformed JSON is unavailable", async () => {
    fetchImpl.mockResolvedValue(
      new Response("<html>oops</html>", { status: 200 }),
    );
    expect(await client().search("dune")).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  test("401 is unavailable and logged as an auth problem", async () => {
    fetchImpl.mockResolvedValue(
      json({ status_message: `Invalid API key ${TOKEN}` }, { status: 401 }),
    );

    expect(await client().search("dune")).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    expect(errorLog).toHaveBeenCalledWith(expect.any(String), "auth");
  });

  test("logs carry a code only, never the response text or the token", async () => {
    fetchImpl.mockResolvedValue(
      json({ status_message: `boom ${TOKEN}` }, { status: 503 }),
    );

    await client().search("dune");

    expect(errorLog).toHaveBeenCalled();
    const logged = JSON.stringify(errorLog.mock.calls);
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain("boom");
  });

  test("a failure is not memoized: the next call reaches TMDB again (S-TL-15)", async () => {
    fetchImpl
      .mockResolvedValueOnce(json({}, { status: 503 }))
      .mockResolvedValueOnce(json(searchBody));
    const tmdb = client();

    expect((await tmdb.search("dune")).ok).toBe(false);
    expect((await tmdb.search("dune")).ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("default fetch", () => {
  test("resolves the global fetch lazily on each request (D-39)", async () => {
    const stub = vi.fn().mockResolvedValue(json(searchBody));
    vi.stubGlobal("fetch", stub);
    try {
      const tmdb = createTmdbClient({ token: TOKEN, sleep: sleep as never });
      expect((await tmdb.search("dune")).ok).toBe(true);
      expect(stub).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
