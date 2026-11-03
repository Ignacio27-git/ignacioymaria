// @vitest-environment node
import { describe, expect, test } from "vitest";

import { groupSeasons } from "./group";
import { prepareRow } from "./row";
import type { RawRow } from "./types";

const raw = (row: number, name: string, over: Partial<RawRow> = {}): RawRow => ({
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
  ...over,
});

const group = (...rows: RawRow[]) => groupSeasons(rows.map(prepareRow));

const explicit = (plan: ReturnType<typeof group>["planned"][number]["plan"]) =>
  plan.kind === "explicit" ? plan.seasons.map((s) => [s.number, s.row.row]) : null;

describe("groupSeasons", () => {
  test("a single unmarked row is planned as all aired seasons", () => {
    const { planned, notes } = group(raw(2, "Solo"));
    expect(planned).toHaveLength(1);
    expect(planned[0].plan).toEqual({ kind: "allAired" });
    expect(notes).toEqual([]);
  });

  test("only unmarked rows: the first wins and the rest are duplicates (S43)", () => {
    const { planned, notes } = group(raw(2, "Dup"), raw(3, "dup"));
    expect(planned.map((p) => p.prepared.row)).toEqual([2]);
    expect(planned[0].plan).toEqual({ kind: "allAired" });
    expect(notes).toEqual([
      expect.objectContaining({ row: 3, reason: "duplicate", decision: expect.stringContaining("row 2") }),
    ]);
  });

  test("marked rows of one series become its seasons, each with its own data (S36, S44)", () => {
    const { planned, notes } = group(
      raw(2, "The last of us (t1)", { scoreMaria: 9, fillArgb: "FF61D230" }),
      raw(3, "The last of us (t2)", { scoreMaria: 6 }),
    );
    expect(planned).toHaveLength(1);
    expect(explicit(planned[0].plan)).toEqual([
      [1, 2],
      [2, 3],
    ]);
    expect(notes.some((n) => n.reason === "season_merge" as string)).toBe(false);
    expect(notes).toEqual([]);
  });

  test("the row of the highest season carries the title-level data", () => {
    const { planned } = group(raw(2, "X (t2)"), raw(3, "X (t1)"));
    expect(planned[0].prepared.row).toBe(2);
    expect(explicit(planned[0].plan)).toEqual([
      [1, 3],
      [2, 2],
    ]);
  });

  test("a range row shares its data across the seasons it names", () => {
    const { planned } = group(raw(2, "X (t1-t3)", { scoreMaria: 8 }));
    expect(explicit(planned[0].plan)).toEqual([
      [1, 2],
      [2, 2],
      [3, 2],
    ]);
  });

  test("a repeated season keeps the first row and reports the later one (S36 variant)", () => {
    const { planned, notes } = group(raw(2, "X (t1)"), raw(3, "X (t1)"), raw(4, "X (t2)"));
    expect(explicit(planned[0].plan)).toEqual([
      [1, 2],
      [2, 4],
    ]);
    expect(notes).toEqual([
      expect.objectContaining({ row: 3, reason: "duplicate", decision: expect.stringContaining("season 1") }),
    ]);
  });

  test("an unmarked row inside a marked group is a duplicate and not imported (S42)", () => {
    const { planned, notes } = group(raw(2, "V (t1)"), raw(3, "V"));
    expect(explicit(planned[0].plan)).toEqual([[1, 2]]);
    expect(notes).toEqual([
      expect.objectContaining({ row: 3, reason: "duplicate" }),
    ]);
  });

  test("the preparation notes of a contributing non-carrying row are kept", () => {
    const { notes } = group(
      raw(2, "X (t1)", { scoreMaria: 7.3 }),
      raw(3, "X (t2)"),
    );
    expect(notes).toEqual([expect.objectContaining({ row: 2, reason: "score" })]);
  });

  test("groups follow the sheet order of their first row", () => {
    const { planned } = group(raw(2, "B"), raw(3, "A (t1)"), raw(4, "B"), raw(5, "A (t2)"));
    expect(planned.map((p) => p.prepared.key)).toEqual(["pelis:b", "pelis:a"]);
  });
});
