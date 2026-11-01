// @vitest-environment node
import { describe, expect, test } from "vitest";

import { splitSeason } from "./season";

describe("splitSeason", () => {
  test.each([
    ["Serie X (temp 1-3)", "Serie X", 3],
    ["Serie X (temp 1)", "Serie X", 1],
    ["Serie X (t.1-2)", "Serie X", 2],
    ["Serie X (t.1)", "Serie X", 1],
    ["Serie X (t1-t3)", "Serie X", 3],
    ["Serie X (T1)", "Serie X", 1],
    ["Serie X (t1)", "Serie X", 1],
    ["Serie X (t1 y t2)", "Serie X", 2],
    ["Serie X (TEMP 1-2)", "Serie X", 2],
    ["  Serie X   (t1)  ", "Serie X", 1],
  ])("%j -> name %j and seasons %i", (raw, name, seasons) => {
    const result = splitSeason(raw);
    expect(result).toMatchObject({ name, seasonsWatched: seasons, hasMarker: true });
  });

  test("a clean marker with season 1 or a range is not reported", () => {
    expect(splitSeason("Serie X (t1)").note).toBeNull();
    expect(splitSeason("Serie X (temp 1-3)").note).toBeNull();
  });

  test("a single season other than 1 is reported", () => {
    const result = splitSeason("Serie Y (temp. 3)");
    expect(result).toMatchObject({ name: "Serie Y", seasonsWatched: 3 });
    expect(result.note).toMatchObject({ reason: "season", original: "(temp. 3)" });
  });

  test("no marker leaves the name and no seasons", () => {
    expect(splitSeason("Attack on titan")).toEqual({
      name: "Attack on titan",
      seasonsWatched: null,
      hasMarker: false,
      note: null,
    });
  });

  test("a trailing parenthesis that is not a season marker is kept", () => {
    expect(splitSeason("Dune (2021)")).toMatchObject({
      name: "Dune (2021)",
      hasMarker: false,
      note: null,
    });
  });

  test("an unparseable season marker keeps the name and is reported", () => {
    const result = splitSeason("Serie Z (temp x)");
    expect(result).toMatchObject({
      name: "Serie Z (temp x)",
      seasonsWatched: null,
      hasMarker: false,
    });
    expect(result.note).toMatchObject({ reason: "season", original: "(temp x)" });
  });
});
