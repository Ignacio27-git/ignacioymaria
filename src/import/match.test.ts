// @vitest-environment node
import { describe, expect, test } from "vitest";

import { decideMatch, type MatchInput } from "./match";
import type { MatchCandidate } from "./types";

const movie = (
  tmdbId: number,
  name: string,
  year: number | null,
  extra: string[] = [],
): MatchCandidate => ({ tmdbId, kind: "movie", names: [name, ...extra], year });
const series = (tmdbId: number, name: string, year: number | null): MatchCandidate => ({
  tmdbId,
  kind: "series",
  names: [name],
  year,
});

const input = (over: Partial<MatchInput> = {}): MatchInput => ({
  name: "Amélie",
  year: 2001,
  markerKind: null,
  seriesHint: false,
  ...over,
});

describe("decideMatch", () => {
  test("links on folded exact name, kind and year", () => {
    const result = decideMatch(input(), [movie(194, "Amelie", 2001)]);
    expect(result.candidate?.tmdbId).toBe(194);
    expect(result.kind).toBe("movie");
    expect(result.notes).toEqual([]);
  });

  test("matches an original name too", () => {
    const result = decideMatch(
      input({ name: "Le Fabuleux Destin d'Amélie Poulain" }),
      [movie(194, "Amelie", 2001, ["Le Fabuleux Destin d'Amélie Poulain"])],
    );
    expect(result.candidate?.tmdbId).toBe(194);
  });

  test("year within one is linked (2019 vs 2020)", () => {
    const result = decideMatch(input({ name: "X", year: 2019 }), [movie(1, "X", 2020)]);
    expect(result.candidate?.tmdbId).toBe(1);
  });

  test("year too far is unlinked and reported (2010 vs 2015)", () => {
    const result = decideMatch(input({ name: "X", year: 2010 }), [movie(1, "X", 2015)]);
    expect(result.candidate).toBeNull();
    expect(result.notes[0]).toMatchObject({ reason: "unlinked" });
  });

  test("no year and a single exact candidate links", () => {
    const result = decideMatch(input({ year: null }), [movie(194, "Amelie", 2001)]);
    expect(result.candidate?.tmdbId).toBe(194);
  });

  test("no year and several exact candidates is unlinked", () => {
    const result = decideMatch(input({ year: null }), [
      movie(1, "Amelie", 2001),
      movie(2, "Amelie", 2010),
    ]);
    expect(result.candidate).toBeNull();
    expect(result.notes.map((n) => n.reason)).toContain("unlinked");
  });

  test("no exact candidate is unlinked", () => {
    const result = decideMatch(input(), [movie(1, "Other", 2001)]);
    expect(result.candidate).toBeNull();
  });

  test("a marker fixes the kind: a movie candidate is rejected", () => {
    const result = decideMatch(input({ year: null, markerKind: "series" }), [
      movie(1, "Amelie", 2001),
    ]);
    expect(result.candidate).toBeNull();
    expect(result.kind).toBe("series");
    expect(result.notes[0]).toMatchObject({ reason: "unlinked" });
    expect(result.notes.map((n) => n.reason)).not.toContain("kind");
  });

  test("a marker with a series candidate links as series", () => {
    const result = decideMatch(input({ year: null, markerKind: "series" }), [
      movie(1, "Amelie", 2001),
      series(2, "Amelie", 2005),
    ]);
    expect(result.candidate?.tmdbId).toBe(2);
    expect(result.kind).toBe("series");
  });

  test("the kind comes from the single clear match when unknown", () => {
    const result = decideMatch(input({ year: null }), [series(2, "Amelie", 2005)]);
    expect(result.kind).toBe("series");
    expect(result.notes).toEqual([]);
  });

  test("series hint narrows to tv before counting (#845)", () => {
    const result = decideMatch(input({ year: null, seriesHint: true }), [
      movie(1, "Amelie", 2001),
      series(2, "Amelie", 2005),
    ]);
    expect(result.candidate?.tmdbId).toBe(2);
    expect(result.kind).toBe("series");
  });

  test("the hint alone never sets the kind: unlinked falls back to movie and is reported", () => {
    const result = decideMatch(input({ year: null, seriesHint: true }), []);
    expect(result.candidate).toBeNull();
    expect(result.kind).toBe("movie");
    expect(result.notes.map((n) => n.reason)).toEqual(["unlinked", "kind"]);
    expect(result.notes[1].decision).toBe("movie by default");
  });

  test("an undeterminable kind is movie by default", () => {
    const result = decideMatch(input(), []);
    expect(result.kind).toBe("movie");
    expect(result.notes.find((n) => n.reason === "kind")?.decision).toBe(
      "movie by default",
    );
  });

  test("a candidate without a year never matches when the sheet has a year", () => {
    const result = decideMatch(input(), [movie(1, "Amelie", null)]);
    expect(result.candidate).toBeNull();
  });
});
