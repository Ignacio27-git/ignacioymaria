import { describe, expect, test } from "vitest";

import { createSeason, nextSeasonNumber } from "./season";

describe("createSeason", () => {
  test("builds a season with defaults: pending, unknown date, no scores", () => {
    const result = createSeason({ number: 1 });
    expect(result).toEqual({
      ok: true,
      value: {
        number: 1,
        state: "pending",
        watchDate: { kind: "unknown" },
        scores: { maria: null, ignacio: null },
      },
    });
  });

  test("keeps state, date and both scores", () => {
    const result = createSeason({
      number: 3,
      state: "watched_rewatch",
      watchDate: { kind: "known", date: "2026-03-04" },
      scores: { maria: 8.25, ignacio: 0 },
    });
    expect(result).toEqual({
      ok: true,
      value: {
        number: 3,
        state: "watched_rewatch",
        watchDate: { kind: "known", date: "2026-03-04" },
        scores: { maria: 8.25, ignacio: 0 },
      },
    });
  });

  test.each([0, -1, 1.5, "2", null, undefined, Number.NaN])(
    "rejects season number %j",
    (number) => {
      expect(createSeason({ number })).toEqual({
        ok: false,
        error: [{ field: "number", code: "not_positive_integer" }],
      });
    },
  );

  test("rejects an invalid state", () => {
    expect(createSeason({ number: 1, state: "dropped" })).toEqual({
      ok: false,
      error: [{ field: "state", code: "invalid_state" }],
    });
  });

  test("rejects an invalid date", () => {
    expect(
      createSeason({ number: 1, watchDate: { kind: "known", date: "2026-02-30" } }),
    ).toEqual({
      ok: false,
      error: [{ field: "watchDate", code: "invalid_date" }],
    });
  });

  test.each([
    [7.3, "off_grid"],
    [11, "out_of_range"],
    [-0.25, "out_of_range"],
    ["8", "not_a_number"],
  ])("rejects score %j as %s", (value, code) => {
    expect(createSeason({ number: 1, scores: { maria: value } })).toEqual({
      ok: false,
      error: [{ field: "scores.maria", code }],
    });
  });

  test("collects every error and rejects non-object input", () => {
    expect(
      createSeason({ number: 0, state: "x", scores: { ignacio: 12 } }),
    ).toEqual({
      ok: false,
      error: [
        { field: "number", code: "not_positive_integer" },
        { field: "state", code: "invalid_state" },
        { field: "scores.ignacio", code: "out_of_range" },
      ],
    });
    expect(createSeason(null)).toEqual({
      ok: false,
      error: [{ field: "input", code: "not_an_object" }],
    });
  });
});

describe("nextSeasonNumber", () => {
  test("is 1 when there are no seasons", () => {
    expect(nextSeasonNumber([])).toBe(1);
  });

  test("is the highest number plus one, even with gaps or unordered input", () => {
    expect(nextSeasonNumber([{ number: 1 }, { number: 2 }])).toBe(3);
    expect(nextSeasonNumber([{ number: 3 }, { number: 1 }])).toBe(4);
  });
});
