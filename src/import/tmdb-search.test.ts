// @vitest-environment node
import { describe, expect, test } from "vitest";

import { mapSearchMulti } from "./tmdb-search";

describe("mapSearchMulti", () => {
  test("maps movies and tv with localized and original names", () => {
    const payload = {
      results: [
        {
          media_type: "movie",
          id: 194,
          title: "Amelie",
          original_title: "Le Fabuleux Destin d'Amélie Poulain",
          release_date: "2001-04-25",
        },
        {
          media_type: "tv",
          id: 1399,
          name: "Juego de tronos",
          original_name: "Game of Thrones",
          first_air_date: "2011-04-17",
        },
      ],
    };
    expect(mapSearchMulti(payload)).toEqual([
      {
        tmdbId: 194,
        kind: "movie",
        names: ["Amelie", "Le Fabuleux Destin d'Amélie Poulain"],
        year: 2001,
      },
      {
        tmdbId: 1399,
        kind: "series",
        names: ["Juego de tronos", "Game of Thrones"],
        year: 2011,
      },
    ]);
  });

  test("deduplicates equal names and tolerates a missing date", () => {
    const [candidate] = mapSearchMulti({
      results: [
        { media_type: "movie", id: 1, title: "Heat", original_title: "Heat", release_date: "" },
      ],
    });
    expect(candidate.names).toEqual(["Heat"]);
    expect(candidate.year).toBeNull();
  });

  test("skips people, invalid ids and nameless items", () => {
    expect(
      mapSearchMulti({
        results: [
          { media_type: "person", id: 5, name: "Someone" },
          { media_type: "movie", id: 0, title: "Zero" },
          { media_type: "movie", id: 7 },
          null,
          "x",
        ],
      }),
    ).toEqual([]);
  });

  test("returns an empty list for a malformed payload", () => {
    expect(mapSearchMulti(null)).toEqual([]);
    expect(mapSearchMulti({ results: "nope" })).toEqual([]);
  });
});
