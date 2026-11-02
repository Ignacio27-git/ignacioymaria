// @vitest-environment node
import { describe, expect, test } from "vitest";

import { resolveCollisions } from "./merge";
import { prepareRow } from "./row";
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
  actors: "",
  observations: null,
  ...over,
});

const prep = (over: Partial<RawRow>) => prepareRow(raw(over));

/** The real "The last of us" case: temp 1 (yellow, 9/9.9) and temp 2 (green, 7.5/8). */
const temp1 = (row = 10) =>
  prep({
    row,
    name: "The last of us (temp 1)",
    fillArgb: "FFFFFF00",
    scoreMaria: 9,
    scoreIgnacio: 9.9,
    watchDate: new Date(Date.UTC(2024, 6, 17)), // serial 45490
  });
const temp2 = (row = 11) =>
  prep({
    row,
    name: "The last of us (temp 2)",
    fillArgb: "FF61D230",
    scoreMaria: 7.5,
    scoreIgnacio: 8,
    watchDate: new Date(Date.UTC(2025, 5, 1)), // serial 45809
  });

describe("resolveCollisions: plain duplicates (no season marker)", () => {
  test("a singleton passes through untouched", () => {
    const only = prep({ row: 3, name: "Solo" });
    const { kept, notes } = resolveCollisions([only]);
    expect(kept).toEqual([only]);
    expect(notes).toEqual([]);
  });

  test("first row wins and later rows are reported, ignoring case and accents", () => {
    const rows = [
      prep({ row: 2, name: "Amélie" }),
      prep({ row: 7, name: "amelie" }),
      prep({ row: 9, name: "Otra" }),
    ];
    const { kept, notes } = resolveCollisions(rows);
    expect(kept.map((r) => r.row)).toEqual([2, 9]);
    expect(notes).toEqual([
      expect.objectContaining({
        row: 7,
        name: "amelie",
        reason: "duplicate",
        decision: "duplicate of row 2, not imported",
      }),
    ]);
  });

  test("four copies: first imported, three reported, sheet order kept", () => {
    const rows = [
      prep({ row: 4, name: "Primal fear" }),
      prep({ row: 5, name: "Other" }),
      prep({ row: 6, name: "Primal fear" }),
      prep({ row: 8, name: "Primal Fear" }),
      prep({ row: 9, name: "primal fear" }),
    ];
    const { kept, notes } = resolveCollisions(rows);
    expect(kept.map((r) => r.row)).toEqual([4, 5]);
    expect(notes.map((n) => [n.row, n.reason])).toEqual([
      [6, "duplicate"],
      [8, "duplicate"],
      [9, "duplicate"],
    ]);
  });

  test("duplicates drop their own preparation notes, as before", () => {
    const rows = [
      prep({ row: 2, name: "Dup" }),
      prep({ row: 3, name: "Dup", scoreIgnacio: 9.9 }),
    ];
    const { notes } = resolveCollisions(rows);
    expect(notes.map((n) => n.reason)).toEqual(["duplicate"]);
  });
});

describe("resolveCollisions: interim season merge", () => {
  test("temp 1 + temp 2 -> one series, 2 seasons, data from the highest season", () => {
    const { kept } = resolveCollisions([temp1(), temp2()]);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({
      row: 11,
      key: "pelis:the last of us",
      markerKind: "series",
      seasonsWatched: 2,
      state: "watched",
      scores: { maria: 7.5, ignacio: 8 },
      watchDate: { kind: "known", date: "2025-06-01" },
    });
  });

  test("the lower season row is reported with its own state, scores and date", () => {
    const { notes } = resolveCollisions([temp1(), temp2()]);
    const merged = notes.filter((n) => n.reason === "season_merge");
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      row: 10,
      name: "The last of us (temp 1)",
      original: "state watched_rewatch, scores 9 / 10, date 2024-07-17",
      decision: "merged into row 11 (seasons watched 2)",
    });
    // the off-grid 9.9 -> 10 adjustment of the merged row is kept
    expect(notes.some((n) => n.reason === "score" && n.row === 10)).toBe(true);
    // and temp 2 is not reported as a duplicate
    expect(notes.some((n) => n.reason === "duplicate")).toBe(false);
  });

  test("reversed sheet order picks the same winner", () => {
    const { kept, notes } = resolveCollisions([temp2(10), temp1(11)]);
    expect(kept.map((r) => [r.row, r.seasonsWatched])).toEqual([[10, 2]]);
    expect(notes.find((n) => n.reason === "season_merge")).toMatchObject({
      row: 11,
      decision: "merged into row 10 (seasons watched 2)",
    });
  });

  test("a missing score or unknown date is spelled out in the merged entry", () => {
    const low = prep({
      row: 20,
      name: "Serie Q (t1)",
      scoreMaria: null,
      scoreIgnacio: 6,
      watchDate: "jiji",
      watchDateFormat: null,
    });
    const high = prep({ row: 21, name: "Serie Q (t2)" });
    const { notes } = resolveCollisions([low, high]);
    expect(notes.find((n) => n.reason === "season_merge")?.original).toBe(
      "state watched, scores - / 6, date unknown",
    );
  });

  test("marked vs unmarked: the marked row wins as series with its seasons", () => {
    const unmarked = prep({ row: 30, name: "Serie Z", fillArgb: "FFFFFF00", scoreMaria: 5 });
    const marked = prep({ row: 31, name: "Serie Z (t1)" });
    const { kept, notes } = resolveCollisions([unmarked, marked]);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({
      row: 31,
      markerKind: "series",
      seasonsWatched: 1,
      state: "watched",
      scores: { maria: 8.5, ignacio: 7.75 },
    });
    expect(notes.find((n) => n.reason === "season_merge")).toMatchObject({
      row: 30,
      original: expect.stringContaining("state watched_rewatch, scores 5 / 7.75"),
      decision: "merged into row 31 (seasons watched 1)",
    });
  });

  test("tie in the highest season: the first row in sheet order wins", () => {
    const a = prep({ row: 40, name: "Tie (t1)", scoreMaria: 1 });
    const b = prep({ row: 41, name: "Tie (temp 1)", scoreMaria: 2 });
    const { kept, notes } = resolveCollisions([a, b]);
    expect(kept.map((r) => [r.row, r.scores.maria])).toEqual([[40, 1]]);
    expect(notes.find((n) => n.reason === "season_merge")).toMatchObject({
      row: 41,
      decision: "merged into row 40 (seasons watched 1)",
    });
  });

  test("three marked rows: max seasons wins, the other two are reported", () => {
    const rows = [
      prep({ row: 50, name: "Tres (t2)" }),
      prep({ row: 51, name: "Tres (t3)" }),
      prep({ row: 52, name: "Tres (t1)" }),
    ];
    const { kept, notes } = resolveCollisions(rows);
    expect(kept.map((r) => [r.row, r.seasonsWatched])).toEqual([[51, 3]]);
    expect(notes.filter((n) => n.reason === "season_merge").map((n) => n.row)).toEqual([50, 52]);
  });

  test("the merged row keeps the position of the group's first occurrence", () => {
    const rows = [temp1(10), prep({ row: 12, name: "Between" }), temp2(13)];
    const { kept } = resolveCollisions(rows);
    expect(kept.map((r) => r.row)).toEqual([13, 12]);
  });

  test("kind is not part of identity: a marked row and a plain movie row collide", () => {
    const { kept } = resolveCollisions([
      prep({ row: 60, name: "Dune" }),
      prep({ row: 61, name: "Dune (t1)" }),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].markerKind).toBe("series");
  });
});
