// @vitest-environment node
import { describe, expect, test } from "vitest";

import { splitSeason } from "./season";

describe("splitSeason", () => {
  test.each([
    ["Serie X (temp 1-3)", "Serie X", [1, 2, 3]],
    ["Serie X (temp 1)", "Serie X", [1]],
    ["Serie X (t.1-2)", "Serie X", [1, 2]],
    ["Serie X (t.1)", "Serie X", [1]],
    ["Serie X (t1-t3)", "Serie X", [1, 2, 3]],
    ["Serie X (T1)", "Serie X", [1]],
    ["Serie X (t1)", "Serie X", [1]],
    ["Serie X (t2)", "Serie X", [2]],
    ["Serie X (t1 y t2)", "Serie X", [1, 2]],
    ["Serie X (t1 y t3)", "Serie X", [1, 3]],
    ["Serie X (t1, t3)", "Serie X", [1, 3]],
    ["Serie X (t1-t2 y t4)", "Serie X", [1, 2, 4]],
    ["Serie X (TEMP 1-2)", "Serie X", [1, 2]],
    ["  Serie X   (t1)  ", "Serie X", [1]],
  ])("%j -> name %j and seasons %j", (raw, name, seasons) => {
    const result = splitSeason(raw);
    expect(result).toMatchObject({ name, seasons, hasMarker: true });
  });

  test("a single season, with or without a number other than 1, is not reported", () => {
    expect(splitSeason("Serie X (t1)").note).toBeNull();
    expect(splitSeason("Serie Y (temp. 3)").note).toBeNull();
    expect(splitSeason("Serie X (t1 y t3)").note).toBeNull();
  });

  test("a range is expanded and the expansion is reported", () => {
    const result = splitSeason("Serie X (t1-t3)");
    expect(result.note).toMatchObject({
      reason: "season",
      original: "(t1-t3)",
      decision: expect.stringContaining("1, 2, 3"),
    });
  });

  test("no marker leaves the name and no seasons", () => {
    expect(splitSeason("Attack on titan")).toEqual({
      name: "Attack on titan",
      seasons: null,
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

  test.each(["Serie Z (temp x)", "Serie Z (t0)", "Serie Z (t0-t2)", "Serie Z (t3-t1)"])(
    "an unparseable or season-0 marker in %j keeps the name and is reported",
    (raw) => {
      const result = splitSeason(raw);
      expect(result).toMatchObject({ name: raw, seasons: null, hasMarker: false });
      expect(result.note).toMatchObject({ reason: "season" });
    },
  );
});
