import { describe, expect, test } from "vitest";

import { createTitle, type Title } from "./title";
import { titleSummary } from "./summary";

type SeasonInput = {
  number: number;
  state?: string;
  date?: string;
  maria?: number | null;
  ignacio?: number | null;
};

function seasonInput(s: SeasonInput) {
  return {
    number: s.number,
    state: s.state,
    watchDate: s.date ? { kind: "known", date: s.date } : undefined,
    scores: { maria: s.maria ?? null, ignacio: s.ignacio ?? null },
  };
}

function series(
  seasons: SeasonInput[],
  extra: Record<string, unknown> = {},
): Title {
  const created = createTitle({
    name: "Dark",
    kind: "series",
    seasons: seasons.map(seasonInput),
    ...extra,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  return created.value;
}

function movie(extra: Record<string, unknown> = {}): Title {
  const created = createTitle({ name: "Alien", kind: "movie", ...extra });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  return created.value;
}

describe("series scores", () => {
  test("S13 person score is the mean of their existing season scores", () => {
    const summary = titleSummary(
      series([
        { number: 1, maria: 8 },
        { number: 2, maria: null },
        { number: 3, maria: 6 },
      ]),
    );
    expect(summary.scores.maria).toBe(7);
  });

  test("S14 a person with no season scores is null and nothing throws", () => {
    const summary = titleSummary(
      series([
        { number: 1, maria: 8 },
        { number: 2, maria: 6 },
      ]),
    );
    expect(summary.scores).toEqual({ maria: 7, ignacio: null });
  });

  test("the mean may leave the 0.25 grid", () => {
    const summary = titleSummary(
      series([
        { number: 1, maria: 7 },
        { number: 2, maria: 7 },
        { number: 3, maria: 8 },
      ]),
    );
    expect(summary.scores.maria).toBeCloseTo(22 / 3, 10);
  });

  test("zero counts as an existing score", () => {
    const summary = titleSummary(
      series([
        { number: 1, maria: 0 },
        { number: 2, maria: 10 },
      ]),
    );
    expect(summary.scores.maria).toBe(5);
  });

  test("S15 the average uses only the person means that exist", () => {
    const summary = titleSummary(series([{ number: 1, maria: 7 }]));
    expect(summary.average).toBe(7);
  });

  test("the average is the mean of the two person means", () => {
    const summary = titleSummary(
      series([
        { number: 1, maria: 8, ignacio: 4 },
        { number: 2, maria: 6, ignacio: 5 },
      ]),
    );
    expect(summary.scores).toEqual({ maria: 7, ignacio: 4.5 });
    expect(summary.average).toBe(5.75);
  });

  test("S16 no scores at all gives a null average", () => {
    const summary = titleSummary(series([{ number: 1 }, { number: 2 }]));
    expect(summary.scores).toEqual({ maria: null, ignacio: null });
    expect(summary.average).toBeNull();
  });
});

describe("series state and date", () => {
  test("S17 the state is the highest season's", () => {
    const summary = titleSummary(
      series([
        { number: 2, state: "pending" },
        { number: 1, state: "watched" },
      ]),
    );
    expect(summary.state).toBe("pending");
    const other = titleSummary(
      series([
        { number: 1, state: "watched" },
        { number: 2, state: "pending" },
        { number: 3, state: "watched_awful" },
      ]),
    );
    expect(other.state).toBe("watched_awful");
  });

  test("S18 the date is the highest season's, skipping absent numbers", () => {
    const summary = titleSummary(
      series([
        { number: 1, state: "watched", date: "2026-01-01" },
        { number: 3, state: "watched", date: "2026-03-03" },
      ]),
    );
    expect(summary.watchDate).toEqual({ kind: "known", date: "2026-03-03" });
  });

  test("S19 a missing date on the highest season is not filled from lower ones", () => {
    const summary = titleSummary(
      series([
        { number: 1, state: "watched", date: "2026-01-01" },
        { number: 2, state: "watched" },
      ]),
    );
    expect(summary.watchDate).toEqual({ kind: "unknown" });
  });
});

describe("fallback and movies", () => {
  test("S20 a movie keeps its title-level values", () => {
    const summary = titleSummary(
      movie({
        state: "watched_rewatch",
        watchDate: { kind: "known", date: "2025-05-05" },
        scores: { maria: 9, ignacio: 7 },
      }),
    );
    expect(summary).toEqual({
      state: "watched_rewatch",
      watchDate: { kind: "known", date: "2025-05-05" },
      scores: { maria: 9, ignacio: 7 },
      average: 8,
    });
  });

  test("S21 a series without seasons falls back to the title-level values", () => {
    const summary = titleSummary(
      series([], {
        state: "watched",
        watchDate: { kind: "known", date: "2024-04-04" },
        scores: { maria: 8, ignacio: 6 },
      }),
    );
    expect(summary).toEqual({
      state: "watched",
      watchDate: { kind: "known", date: "2024-04-04" },
      scores: { maria: 8, ignacio: 6 },
      average: 7,
    });
  });

  test("a series with seasons ignores its own title-level values", () => {
    const summary = titleSummary(
      series([{ number: 1, state: "pending", maria: 3 }], {
        state: "watched",
        scores: { maria: 10, ignacio: 10 },
      }),
    );
    expect(summary.state).toBe("pending");
    expect(summary.scores).toEqual({ maria: 3, ignacio: null });
  });

  test("never throws on empty or score-less titles and does not mutate input", () => {
    const empty = series([]);
    const snapshot = JSON.stringify(empty);
    expect(titleSummary(empty).average).toBeNull();
    expect(titleSummary(movie()).scores).toEqual({ maria: null, ignacio: null });
    expect(JSON.stringify(empty)).toBe(snapshot);
  });
});
