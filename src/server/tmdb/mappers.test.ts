import { describe, expect, test } from "vitest";

import { mapDetails, mapSearchResults } from "./mappers";

const cast = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `Actor ${i}`, order: i }));

describe("mapSearchResults", () => {
  test("maps movie and tv results with year and poster (S-TL-1)", () => {
    expect(
      mapSearchResults({
        results: [
          {
            media_type: "movie",
            id: 1417,
            title: "El laberinto del fauno",
            original_title: "Pan's Labyrinth",
            release_date: "2006-10-11",
            poster_path: "/fauno.jpg",
          },
          {
            media_type: "tv",
            id: 1399,
            name: "Juego de tronos",
            original_name: "Game of Thrones",
            first_air_date: "2011-04-17",
            poster_path: "/got.jpg",
          },
        ],
      }),
    ).toEqual([
      {
        tmdbId: 1417,
        kind: "movie",
        name: "El laberinto del fauno",
        year: 2006,
        posterPath: "/fauno.jpg",
      },
      {
        tmdbId: 1399,
        kind: "series",
        name: "Juego de tronos",
        year: 2011,
        posterPath: "/got.jpg",
      },
    ]);
  });

  test("keeps only movie and tv results (S-TL-2)", () => {
    const out = mapSearchResults({
      results: [
        { media_type: "person", id: 1, name: "Someone" },
        { media_type: "movie", id: 2, title: "M" },
        { media_type: "tv", id: 3, name: "T" },
      ],
    });
    expect(out.map((c) => [c.tmdbId, c.kind])).toEqual([
      [2, "movie"],
      [3, "series"],
    ]);
  });

  test.each([
    ["", "Parasite"],
    ["   ", "Parasite"],
    [undefined, "Parasite"],
  ])("falls back to the original title when title is %j (S-TL-3)", (title, expected) => {
    const [candidate] = mapSearchResults({
      results: [
        { media_type: "movie", id: 7, title, original_title: "Parasite" },
      ],
    });
    expect(candidate.name).toBe(expected);
  });

  test("falls back to the original name for tv", () => {
    const [candidate] = mapSearchResults({
      results: [
        { media_type: "tv", id: 7, name: "", original_name: "Dark" },
      ],
    });
    expect(candidate.name).toBe("Dark");
  });

  test("missing date and null poster give nulls (S-TL-6)", () => {
    const [candidate] = mapSearchResults({
      results: [
        { media_type: "movie", id: 9, title: "X", release_date: "", poster_path: null },
      ],
    });
    expect(candidate).toEqual({
      tmdbId: 9,
      kind: "movie",
      name: "X",
      year: null,
      posterPath: null,
    });
  });

  test.each(["", "p.jpg", 5])("drops the invalid poster path %j", (poster_path) => {
    const [candidate] = mapSearchResults({
      results: [{ media_type: "movie", id: 9, title: "X", poster_path }],
    });
    expect(candidate.posterPath).toBeNull();
  });

  test.each([
    ["not a year", null],
    ["20", null],
    ["19ab-01-01", null],
    ["1999", 1999],
  ])("year from %j is %j", (release_date, year) => {
    const [candidate] = mapSearchResults({
      results: [{ media_type: "movie", id: 9, title: "X", release_date }],
    });
    expect(candidate.year).toBe(year);
  });

  test("skips entries without a usable id or any name", () => {
    expect(
      mapSearchResults({
        results: [
          { media_type: "movie", title: "No id" },
          { media_type: "movie", id: 0, title: "Zero id" },
          { media_type: "movie", id: 5, title: "", original_title: "" },
          { media_type: "movie", id: 6, title: "Ok" },
        ],
      }).map((c) => c.tmdbId),
    ).toEqual([6]);
  });

  test.each([null, {}, { results: "x" }, "x"])(
    "returns an empty list for malformed payload %j",
    (payload) => {
      expect(mapSearchResults(payload)).toEqual([]);
    },
  );
});

describe("mapDetails", () => {
  test("movie: year, first 10 actors in TMDB order, no seasonsTotal (S-TL-4)", () => {
    const details = mapDetails("movie", {
      id: 1417,
      title: "El laberinto del fauno",
      release_date: "2006-10-11",
      poster_path: "/f.jpg",
      credits: { cast: cast(25).reverse() },
    });
    expect(details).toEqual({
      tmdbId: 1417,
      kind: "movie",
      name: "El laberinto del fauno",
      year: 2006,
      posterPath: "/f.jpg",
      actors: Array.from({ length: 10 }, (_, i) => `Actor ${i}`),
    });
    expect(details && "seasonsTotal" in details).toBe(false);
  });

  test("series: seasonsTotal from number_of_seasons, fewer actors (S-TL-5)", () => {
    expect(
      mapDetails("series", {
        id: 1399,
        name: "Juego de tronos",
        first_air_date: "2011-04-17",
        number_of_seasons: 5,
        credits: { cast: cast(3) },
      }),
    ).toEqual({
      tmdbId: 1399,
      kind: "series",
      name: "Juego de tronos",
      year: 2011,
      posterPath: null,
      actors: ["Actor 0", "Actor 1", "Actor 2"],
      seasonsTotal: 5,
    });
  });

  test.each([undefined, 0, -1, 2.5, "3"])(
    "series seasonsTotal is null when number_of_seasons is %j",
    (number_of_seasons) => {
      expect(
        mapDetails("series", { id: 1, name: "S", number_of_seasons }),
      ).toMatchObject({ seasonsTotal: null });
    },
  );

  test("skips cast entries without a name and tolerates a missing credits block", () => {
    expect(
      mapDetails("movie", {
        id: 1,
        title: "M",
        credits: { cast: [{ name: "A", order: 0 }, { order: 1 }, { name: "", order: 2 }] },
      }),
    ).toMatchObject({ actors: ["A"] });
    expect(mapDetails("movie", { id: 1, title: "M" })).toMatchObject({
      actors: [],
    });
  });

  test("falls back to the original title", () => {
    expect(
      mapDetails("movie", { id: 1, title: "", original_title: "Parasite" }),
    ).toMatchObject({ name: "Parasite" });
  });

  test.each([null, "x", {}, { id: "1", title: "M" }, { id: 1 }])(
    "returns null for a payload with no usable id or name: %j",
    (payload) => {
      expect(mapDetails("movie", payload)).toBeNull();
    },
  );
});
