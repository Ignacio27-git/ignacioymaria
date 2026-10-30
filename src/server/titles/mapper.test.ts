// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

import { createTitle, UNKNOWN_WATCH_DATE } from "@/domain";

import { rowToRecord, titleToInsert } from "./mapper";
import { TITLE_COLUMNS, type TitleRow } from "./row";

vi.mock("server-only", () => ({}));

const movieRow: TitleRow = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Amélie",
  kind: "movie",
  year: 2001,
  actors: ["Audrey Tautou"],
  observations: null,
  watch_date: null,
  state: "watched",
  score_maria: 7.25,
  score_ignacio: null,
  seasons_watched: null,
  seasons_total: null,
  tmdb_id: 194,
  poster_path: "/a.jpg",
  created_at: "2026-10-30T10:00:00+00:00",
};

describe("rowToRecord (TC-1)", () => {
  test("S1: maps scores and an unknown date", () => {
    const result = rowToRecord(movieRow);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(movieRow.id);
    expect(result.value.createdAt).toBe(movieRow.created_at);
    expect(result.value.title.scores.maria).toBe(7.25);
    expect(result.value.title.scores.ignacio).toBeNull();
    expect(result.value.title.watchDate).toEqual(UNKNOWN_WATCH_DATE);
    expect(result.value.title.tmdbId).toBe(194);
    expect(result.value.title.posterPath).toBe("/a.jpg");
  });

  test("maps a known date", () => {
    const result = rowToRecord({ ...movieRow, watch_date: "2026-05-01" });

    expect(result.ok && result.value.title.watchDate).toEqual({
      kind: "known",
      date: "2026-05-01",
    });
  });

  test("S2: a movie has no seasonsWatched", () => {
    const result = rowToRecord(movieRow);

    expect(result.ok && "seasonsWatched" in result.value.title).toBe(false);
  });

  test("maps a series with its seasons", () => {
    const result = rowToRecord({
      ...movieRow,
      kind: "series",
      seasons_watched: 2,
      seasons_total: 5,
    });

    expect(result.ok && result.value.title).toMatchObject({
      kind: "series",
      seasonsWatched: 2,
      seasonsTotal: 5,
    });
  });

  test("parses numeric strings (PostgREST numeric)", () => {
    const result = rowToRecord({
      ...movieRow,
      score_maria: "7.25",
      score_ignacio: "10",
    });

    expect(result.ok && result.value.title.scores).toEqual({
      maria: 7.25,
      ignacio: 10,
    });
  });

  test.each([
    ["off-grid score", { score_maria: 7.3 }],
    ["unknown state", { state: "archived" }],
    ["blank name", { name: "  " }],
    ["bad date", { watch_date: "2026-13-45" }],
    ["unparseable numeric string", { score_maria: "abc" }],
  ])("an invalid row (%s) is a failure, never partial", (_label, patch) => {
    expect(rowToRecord({ ...movieRow, ...patch })).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  test.each([null, undefined, "x", 3])("non-object %s is a failure", (row) => {
    expect(rowToRecord(row)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});

describe("titleToInsert (TC-1 S3)", () => {
  test("keys match the table columns and unknown date becomes null", () => {
    const created = createTitle({
      name: "Dune",
      kind: "movie",
      tmdbId: 438631,
      posterPath: "/d.jpg",
      actors: ["Timothée Chalamet"],
      year: 2021,
    });
    if (!created.ok) throw new Error("fixture");

    const insert = titleToInsert(created.value);

    expect(insert).toEqual({
      name: "Dune",
      kind: "movie",
      year: 2021,
      actors: ["Timothée Chalamet"],
      observations: null,
      watch_date: null,
      state: "pending",
      score_maria: null,
      score_ignacio: null,
      seasons_watched: null,
      seasons_total: null,
      tmdb_id: 438631,
      poster_path: "/d.jpg",
    });
    for (const key of Object.keys(insert)) {
      expect(TITLE_COLUMNS.split(",").map((c) => c.trim())).toContain(key);
    }
  });

  test("maps a series and a known date", () => {
    const created = createTitle({
      name: "Dark",
      kind: "series",
      seasonsTotal: 3,
      seasonsWatched: 1,
      watchDate: { kind: "known", date: "2026-01-02" },
      scores: { ignacio: 8.5 },
    });
    if (!created.ok) throw new Error("fixture");

    expect(titleToInsert(created.value)).toMatchObject({
      kind: "series",
      seasons_total: 3,
      seasons_watched: 1,
      watch_date: "2026-01-02",
      score_ignacio: 8.5,
      score_maria: null,
    });
  });

  test("round-trips through rowToRecord", () => {
    const created = createTitle({ name: "Dark", kind: "series", seasonsTotal: 3 });
    if (!created.ok) throw new Error("fixture");
    const row = {
      ...titleToInsert(created.value),
      id: movieRow.id,
      created_at: movieRow.created_at,
    };

    const back = rowToRecord(row);

    expect(back.ok && back.value.title).toEqual(created.value);
  });
});
