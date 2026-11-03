import type { RawRow } from "../../src/import/types";

/** A synthetic `Pelis` row: no fill (pending), no scores, no date. */
export function rawRow(row: number, name: string, extra: Partial<RawRow> = {}): RawRow {
  return {
    row,
    name,
    fillArgb: null,
    scoreMaria: null,
    scoreIgnacio: null,
    watchDate: null,
    watchDateFormat: null,
    year: null,
    actors: "",
    observations: null,
    ...extra,
  };
}

type SearchItem = Record<string, unknown>;

/**
 * Fake TMDB `fetch`: never touches the network. `search` maps a query to the
 * `search/multi` results, or to an HTTP status number to simulate an error.
 * Details are derived from the same result objects.
 */
export function fakeTmdbFetch(search: Record<string, SearchItem[] | number>): typeof fetch {
  const byId = new Map<number, SearchItem>();
  for (const value of Object.values(search)) {
    if (typeof value !== "number") for (const item of value) byId.set(item.id as number, item);
  }
  return (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

    if (url.pathname.endsWith("/search/multi")) {
      const found = search[url.searchParams.get("query") ?? ""];
      if (typeof found === "number") return json({}, found);
      return json({ results: found ?? [] });
    }
    const id = Number(url.pathname.split("/").pop());
    const item = byId.get(id);
    if (!item) return json({}, 404);
    return json({
      ...item,
      poster_path: "/fake-poster.jpg",
      number_of_seasons: 2,
      credits: { cast: [{ name: "Fake Actor", order: 0 }] },
    });
  }) as typeof fetch;
}

export const movieResult = (id: number, title: string, originalTitle = title): SearchItem => ({
  id,
  media_type: "movie",
  title,
  original_title: originalTitle,
  release_date: "2001-05-05",
});

/** A TMDB series; `seasons` is what its details report (season_number + air_date). */
export const seriesResult = (
  id: number,
  name: string,
  seasons: { season_number: number; air_date: string | null }[] = [],
): SearchItem => ({
  id,
  media_type: "tv",
  name,
  original_name: name,
  first_air_date: "2010-01-01",
  seasons,
});
