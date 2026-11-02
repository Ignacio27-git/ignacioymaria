// @vitest-environment node
import { describe, expect, test } from "vitest";

import { buildImportRow, prepareRow } from "./row";
import type { MatchDecision } from "./match";
import type { RawRow } from "./types";

const raw = (over: Partial<RawRow> = {}): RawRow => ({
  row: 2,
  name: "Amélie",
  fillArgb: "FF61D230",
  scoreMaria: 8.5,
  scoreIgnacio: 7.75,
  watchDate: new Date(Date.UTC(2025, 2, 14)),
  watchDateFormat: "dd/mm/yyyy",
  year: 2001,
  actors: "Audrey Tautou\nMathieu Kassovitz",
  observations: "Muy buena,  ver con Mª\n",
  ...over,
});

const noMatch: MatchDecision = { candidate: null, kind: "movie", notes: [] };
const linked = (kind: "movie" | "series"): MatchDecision => ({
  candidate: { tmdbId: 194, kind, names: ["Amelie"], year: 2001 },
  kind,
  notes: [],
});

describe("prepareRow", () => {
  test("derives key, state, scores, date, year, actors and observations", () => {
    const row = prepareRow(raw());
    expect(row.key).toBe("pelis:amelie");
    expect(row.name).toBe("Amélie");
    expect(row.state).toBe("watched");
    expect(row.scores).toEqual({ maria: 8.5, ignacio: 7.75 });
    expect(row.watchDate).toEqual({ kind: "known", date: "2025-03-14" });
    expect(row.year).toBe(2001);
    expect(row.actors).toEqual(["Audrey Tautou", "Mathieu Kassovitz"]);
    expect(row.observations).toBe("Muy buena,  ver con Mª\n");
    expect(row.notes).toEqual([]);
  });

  test("the key ignores the season marker, case, accents and spacing, not the kind", () => {
    expect(prepareRow(raw({ name: "  AMELIE  (t1) " })).key).toBe("pelis:amelie");
    expect(prepareRow(raw({ name: "La   Casa de Papel" })).key).toBe("pelis:la casa de papel");
  });

  test("a numeric name becomes text", () => {
    const row = prepareRow(raw({ name: 21 }));
    expect(row.name).toBe("21");
    expect(row.key).toBe("pelis:21");
  });

  test("a season marker implies a series with highest season", () => {
    const row = prepareRow(raw({ name: "Serie X (temp 1-3)" }));
    expect(row.markerKind).toBe("series");
    expect(row.seasonsWatched).toBe(3);
    expect(row.name).toBe("Serie X");
  });

  test("a year range stores no year and hints at series", () => {
    const row = prepareRow(raw({ year: "2020-2024" }));
    expect(row.year).toBeNull();
    expect(row.seriesHint).toBe(true);
    expect(prepareRow(raw({ year: "-" }))).toMatchObject({ year: null, seriesHint: true });
  });

  test("a single year as text or number is stored", () => {
    expect(prepareRow(raw({ year: "2019" })).year).toBe(2019);
    expect(prepareRow(raw({ year: null })).year).toBeNull();
    expect(prepareRow(raw({ year: null })).seriesHint).toBe(false);
  });

  test("an off-legend fill and an off-grid score are reported", () => {
    const row = prepareRow(raw({ fillArgb: "FF00FF00", scoreIgnacio: 9.9 }));
    expect(row.state).toBe("watched");
    expect(row.notes.map((n) => n.reason).sort()).toEqual(["off_legend", "score"]);
    expect(row.scores.ignacio).toBe(10);
  });

  test("the average column is not part of the input and one score may be empty", () => {
    const row = prepareRow(raw({ scoreMaria: null }));
    expect(row.scores).toEqual({ maria: null, ignacio: 7.75 });
  });

  test("empty actors and observations", () => {
    const row = prepareRow(raw({ actors: "", observations: null }));
    expect(row.actors).toEqual([]);
    expect(row.observations).toBeNull();
  });

  test("a date problem is reported", () => {
    const row = prepareRow(raw({ watchDate: "jiji", watchDateFormat: null }));
    expect(row.watchDate).toEqual({ kind: "unknown" });
    expect(row.notes[0]).toMatchObject({ reason: "date", original: "jiji" });
  });
});

describe("buildImportRow", () => {
  test("a valid unlinked row passes createTitle and gets no TMDB data", () => {
    const result = buildImportRow(prepareRow(raw()), noMatch, null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toMatchObject({
      name: "Amélie",
      kind: "movie",
      tmdbId: null,
      posterPath: null,
      year: 2001,
      state: "watched",
    });
    expect(result.key).toBe("pelis:amelie");
  });

  test("a clear match fills poster, tmdb id and TMDB actors when Excel actors are empty", () => {
    const result = buildImportRow(
      prepareRow(raw({ actors: "" })),
      linked("movie"),
      { posterPath: "/p.jpg", actors: ["Someone"], seasonsTotal: null },
    );
    expect(result.ok && result.title).toMatchObject({
      tmdbId: 194,
      posterPath: "/p.jpg",
      actors: ["Someone"],
    });
  });

  test("Excel actors win over TMDB actors, poster and seasons_total still set", () => {
    const result = buildImportRow(
      prepareRow(raw({ name: "Serie (t1)" })),
      linked("series"),
      { posterPath: "/p.jpg", actors: ["TMDB Actor"], seasonsTotal: 4 },
    );
    expect(result.ok && result.title).toMatchObject({
      kind: "series",
      actors: ["Audrey Tautou", "Mathieu Kassovitz"],
      posterPath: "/p.jpg",
      seasonsTotal: 4,
      seasonsWatched: 1,
    });
  });

  test("a linked match without details stays unlinked and is reported", () => {
    const result = buildImportRow(prepareRow(raw()), linked("movie"), null);
    expect(result.ok && result.title).toMatchObject({ tmdbId: null, posterPath: null });
    expect(result.notes.some((n) => n.reason === "unlinked")).toBe(true);
  });

  test("notes from preparation and matching are merged with row and name", () => {
    const decision: MatchDecision = {
      ...noMatch,
      notes: [{ reason: "kind", original: "Amélie", decision: "movie by default" }],
    };
    const result = buildImportRow(prepareRow(raw({ fillArgb: "FF00FF00" })), decision, null);
    expect(result.notes).toEqual([
      expect.objectContaining({ row: 2, name: "Amélie", reason: "off_legend" }),
      expect.objectContaining({ row: 2, name: "Amélie", reason: "kind" }),
    ]);
  });

  test("an invalid row (empty name after cleaning) is not ok and carries errors", () => {
    const result = buildImportRow(prepareRow(raw({ name: "(t1)" })), noMatch, null);
    expect(result.ok).toBe(false);
  });
});
