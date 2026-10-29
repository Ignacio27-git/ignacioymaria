import { expect, test } from "vitest";

import { createTitle, titleAverage, type TitleError } from "./title";
import { WATCH_STATES } from "./watch-state";

const movie = { name: "Alien", kind: "movie" };
const series = { name: "Dark", kind: "series" };

function errorsOf(input: unknown): readonly TitleError[] {
  const result = createTitle(input);
  if (result.ok) throw new Error("expected an error result");
  return result.error;
}

function valueOf(input: unknown) {
  const result = createTitle(input);
  if (!result.ok) {
    throw new Error(`unexpected errors ${JSON.stringify(result.error)}`);
  }
  return result.value;
}

// Boundary and minimal titles (S9.1, S9.4-S9.7)
test.each([null, undefined, 42, "x", []])(
  "rejects non-object input %j",
  (input) => {
    expect(errorsOf(input)).toEqual([
      { field: "input", code: "not_an_object" },
    ]);
  },
);

test("builds a minimal movie with every default and no seasonsWatched key", () => {
  const value = valueOf(movie);
  expect(value).toEqual({
    name: "Alien",
    kind: "movie",
    state: "pending",
    year: null,
    observations: null,
    actors: [],
    watchDate: { kind: "unknown" },
    scores: { maria: null, ignacio: null },
  });
  expect("seasonsWatched" in value).toBe(false);
});

test("builds a minimal series with seasonsWatched null", () => {
  expect(valueOf(series)).toMatchObject({
    kind: "series",
    seasonsWatched: null,
  });
});

test("requires kind", () => {
  expect(errorsOf({ name: "Alien" })).toEqual([
    { field: "kind", code: "invalid_kind" },
  ]);
});

test("requires name", () => {
  expect(errorsOf({ kind: "movie" })).toEqual([
    { field: "name", code: "not_a_string" },
  ]);
});

// Name (S8.1, S8.2)
test.each([
  ["", "empty"],
  ["   ", "empty"],
  [5, "not_a_string"],
])("rejects name %j", (name, code) => {
  expect(errorsOf({ ...movie, name })).toEqual([{ field: "name", code }]);
});

test("preserves the name as given", () => {
  expect(valueOf({ ...movie, name: " Alien " }).name).toBe(" Alien ");
});

// Kind and seasons (S2.x)
test("rejects an unknown kind and skips seasons validation", () => {
  expect(
    errorsOf({ ...movie, kind: "documentary", seasonsWatched: "x" }),
  ).toEqual([{ field: "kind", code: "invalid_kind" }]);
});

test("accepts seasonsWatched on a series", () => {
  expect(valueOf({ ...series, seasonsWatched: 3 })).toMatchObject({
    seasonsWatched: 3,
  });
});

test.each([null, undefined])(
  "series seasonsWatched %j defaults to null",
  (seasonsWatched) => {
    expect(valueOf({ ...series, seasonsWatched })).toMatchObject({
      seasonsWatched: null,
    });
  },
);

test.each([2.5, -1, "3"])("rejects seasonsWatched %j", (seasonsWatched) => {
  expect(errorsOf({ ...series, seasonsWatched })).toEqual([
    { field: "seasonsWatched", code: "not_non_negative_integer" },
  ]);
});

test("a movie never carries seasonsWatched", () => {
  expect("seasonsWatched" in valueOf({ ...movie, seasonsWatched: 3 })).toBe(
    false,
  );
});

// State (S1.x, S9.8)
test.each(WATCH_STATES.flatMap((s) => [movie, series].map((b) => [b, s] as const)))(
  "accepts state for %j: %s",
  (base, state) => {
    expect(valueOf({ ...base, state }).state).toBe(state);
  },
);

test.each(["Abandonada", "", "Vista", null])("rejects state %j", (state) => {
  expect(errorsOf({ ...movie, state })).toEqual([
    { field: "state", code: "invalid_state" },
  ]);
});

test("absent state defaults to pending", () => {
  expect(valueOf({ ...movie, state: undefined }).state).toBe("pending");
});

// Year (S6.x)
test.each([undefined, null])("year %j defaults to null", (year) => {
  expect(valueOf({ ...movie, year }).year).toBeNull();
});

test("accepts an integer year", () => {
  expect(valueOf({ ...movie, year: 1999 }).year).toBe(1999);
});

test.each([1999.5, NaN, "1999", Infinity])("rejects year %j", (year) => {
  expect(errorsOf({ ...movie, year })).toEqual([
    { field: "year", code: "not_integer" },
  ]);
});

// Actors (S7.1, S7.2, S7.4)
test("absent actors default to an empty list", () => {
  expect(valueOf(movie).actors).toEqual([]);
});

test.each([[[]], [["A", "B"]], [[" A ", ""]]])(
  "preserves actors %j",
  (actors) => {
    expect(valueOf({ ...movie, actors }).actors).toEqual(actors);
  },
);

test.each(["A", null])("rejects non-array actors %j", (actors) => {
  expect(errorsOf({ ...movie, actors })).toEqual([
    { field: "actors", code: "not_an_array" },
  ]);
});

test("reports each non-string actor by index", () => {
  expect(errorsOf({ ...movie, actors: ["A", 3, null] })).toEqual([
    { field: "actors.1", code: "not_a_string" },
    { field: "actors.2", code: "not_a_string" },
  ]);
});

// Observations (S7.3, S7.5)
test.each([undefined, null])(
  "observations %j default to null",
  (observations) => {
    expect(valueOf({ ...movie, observations }).observations).toBeNull();
  },
);

test.each(["", "  x  "])("preserves observations %j", (observations) => {
  expect(valueOf({ ...movie, observations }).observations).toBe(observations);
});

test("rejects non-string observations", () => {
  expect(errorsOf({ ...movie, observations: 5 })).toEqual([
    { field: "observations", code: "not_a_string" },
  ]);
});

// Watch date (S5.x)
test("absent watch date is unknown", () => {
  expect(valueOf(movie).watchDate).toEqual({ kind: "unknown" });
});

test("accepts a known watch date", () => {
  const watchDate = { kind: "known", date: "2024-02-29" };
  expect(valueOf({ ...movie, watchDate }).watchDate).toEqual(watchDate);
});

test.each([
  null,
  { kind: "other" },
  { kind: "known", date: "2023-02-30" },
  "2023-01-05",
])("rejects watchDate %j", (watchDate) => {
  expect(errorsOf({ ...movie, watchDate })).toEqual([
    { field: "watchDate", code: "invalid_date" },
  ]);
});

// Scores (S9.2, S9.9)
test.each([
  undefined,
  null,
  {},
  { maria: undefined },
  { maria: null, ignacio: null },
])("scores %j default to null", (scores) => {
  expect(valueOf({ ...movie, scores }).scores).toEqual({
    maria: null,
    ignacio: null,
  });
});

test("a missing score defaults to null", () => {
  expect(valueOf({ ...movie, scores: { maria: 8 } }).scores).toEqual({
    maria: 8,
    ignacio: null,
  });
});

test("rejects an off-grid score", () => {
  expect(errorsOf({ ...movie, scores: { maria: 7.3 } })).toEqual([
    { field: "scores.maria", code: "off_grid" },
  ]);
});

test("rejects an out-of-range score", () => {
  expect(errorsOf({ ...movie, scores: { ignacio: 11 } })).toEqual([
    { field: "scores.ignacio", code: "out_of_range" },
  ]);
});

test("rejects a non-object scores value", () => {
  expect(errorsOf({ ...movie, scores: "x" })).toEqual([
    { field: "scores", code: "not_an_object" },
  ]);
});

test("rejects a non-number score", () => {
  expect(errorsOf({ ...movie, scores: { maria: "8" } })).toEqual([
    { field: "scores.maria", code: "not_a_number" },
  ]);
});

// Collect-all and cross-field (S9.3, R10)
test("collects every error", () => {
  const fields = errorsOf({
    name: "",
    kind: "x",
    state: "x",
    actors: "x",
    scores: { maria: 7.3 },
  }).map((e) => e.field);
  expect(fields).toEqual(["name", "kind", "state", "actors", "scores.maria"]);
});

test("allows pending with scores and a known date", () => {
  expect(
    valueOf({
      ...movie,
      state: "pending",
      scores: { maria: 8, ignacio: 7 },
      watchDate: { kind: "known", date: "2024-01-01" },
    }).state,
  ).toBe("pending");
});

test("allows watched without scores or date", () => {
  expect(valueOf({ ...movie, state: "watched" }).state).toBe("watched");
});

test("titleAverage delegates to averageScore", () => {
  expect(
    titleAverage(valueOf({ ...movie, scores: { maria: 7.25, ignacio: 8 } })),
  ).toBe(7.625);
  expect(titleAverage(valueOf(movie))).toBeNull();
});
