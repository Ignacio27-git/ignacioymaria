// @vitest-environment node
import { describe, expect, test } from "vitest";

import { airedSeasons, planSeasons } from "./aired";
import { groupSeasons, type PlannedTitle } from "./group";
import { prepareRow } from "./row";
import type { RawRow } from "./types";

const TODAY = "2026-11-03";

const raw = (row: number, name: string, over: Partial<RawRow> = {}): RawRow => ({
  row,
  name,
  fillArgb: "FF61D230",
  scoreMaria: 8,
  scoreIgnacio: null,
  watchDate: null,
  watchDateFormat: null,
  year: null,
  actors: "",
  observations: null,
  ...over,
});

const planned = (...rows: RawRow[]): PlannedTitle => groupSeasons(rows.map(prepareRow)).planned[0];
const season = (number: number, airDate: string | null) => ({ number, airDate });

describe("airedSeasons", () => {
  test("keeps season_number >= 1 with an air date up to today, sorted (S38)", () => {
    expect(
      airedSeasons(
        [season(3, "2020-01-01"), season(0, "2010-01-01"), season(1, "2018-01-01"), season(2, TODAY)],
        TODAY,
      ),
    ).toEqual([1, 2, 3]);
  });

  test("drops future, null and season 0 (S39)", () => {
    expect(
      airedSeasons([season(1, "2018-01-01"), season(2, "2026-11-04"), season(3, null), season(0, "2000-01-01")], TODAY),
    ).toEqual([1]);
  });
});

describe("planSeasons", () => {
  const linkedSeries = (seasons: ReturnType<typeof season>[]) => ({ seasons });

  test("an unmarked linked series gets one season per aired season with the row data (S38)", () => {
    const result = planSeasons(planned(raw(2, "Y")), {
      kind: "series",
      details: linkedSeries([season(0, "2000-01-01"), season(1, "2001-01-01"), season(2, "2002-01-01"), season(6, "2999-01-01")]),
      today: TODAY,
    });
    expect(result.seasons.map((s) => s.number)).toEqual([1, 2]);
    for (const s of result.seasons) {
      expect(s.state).toBe("watched");
      expect(s.scores).toEqual({ maria: 8, ignacio: null });
    }
    expect(result.notes).toEqual([]);
  });

  test("an unmarked series that is not linked gets season 1 and a note (S40)", () => {
    const result = planSeasons(planned(raw(2, "Z")), { kind: "series", details: null, today: TODAY });
    expect(result.seasons.map((s) => s.number)).toEqual([1]);
    expect(result.notes).toEqual([expect.objectContaining({ reason: "season" })]);
  });

  test("an unmarked linked series with nothing aired gets season 1 and a note (S41)", () => {
    const result = planSeasons(planned(raw(2, "W")), {
      kind: "series",
      details: linkedSeries([season(1, "2999-01-01")]),
      today: TODAY,
    });
    expect(result.seasons.map((s) => s.number)).toEqual([1]);
    expect(result.notes).toEqual([expect.objectContaining({ reason: "season" })]);
  });

  test("a marked series uses its own rows whatever TMDB says", () => {
    const result = planSeasons(
      planned(raw(2, "X (t1)", { scoreMaria: 5 }), raw(3, "X (t3)", { scoreMaria: 9 })),
      { kind: "series", details: linkedSeries([season(1, "2001-01-01"), season(2, "2002-01-01")]), today: TODAY },
    );
    expect(result.seasons.map((s) => [s.number, s.scores.maria])).toEqual([
      [1, 5],
      [3, 9],
    ]);
    expect(result.notes).toEqual([]);
  });

  test("a movie gets no seasons", () => {
    expect(planSeasons(planned(raw(2, "M")), { kind: "movie", details: null, today: TODAY })).toEqual({
      seasons: [],
      notes: [],
    });
  });
});
