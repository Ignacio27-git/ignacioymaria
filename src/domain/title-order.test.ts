import { describe, expect, test } from "vitest";

import { createTitle } from "./title";
import { sortTitles, type SortableTitle } from "./title-order";
import type { WatchState } from "./watch-state";

function item(
  id: string,
  overrides: {
    name?: string;
    createdAt?: string;
    state?: WatchState;
    date?: string;
    scores?: { maria?: number; ignacio?: number };
  } = {},
): SortableTitle {
  const created = createTitle({
    name: overrides.name ?? id,
    kind: "movie",
    state: overrides.state,
    watchDate: overrides.date
      ? { kind: "known", date: overrides.date }
      : undefined,
    scores: {
      maria: overrides.scores?.maria,
      ignacio: overrides.scores?.ignacio,
    },
  });
  if (!created.ok) throw new Error("bad fixture");
  return {
    id,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00+00:00",
    title: created.value,
  };
}

const ids = (items: readonly SortableTitle[]) => items.map((i) => i.id);

describe("sortTitles by nota", () => {
  test("orders by average desc and puts titles without scores last", () => {
    const sorted = sortTitles(
      [
        item("none"),
        item("seven", { scores: { maria: 7 } }),
        item("nine", { scores: { maria: 9, ignacio: 9 } }),
      ],
      "nota",
      "vistas",
    );
    expect(ids(sorted)).toEqual(["nine", "seven", "none"]);
  });

  test("ties break by name in Spanish order", () => {
    const sorted = sortTitles(
      [
        item("c", { name: "Zeta", scores: { maria: 5 } }),
        item("b", { name: "Ábaco", scores: { maria: 5 } }),
        item("a", { name: "Beta", scores: { maria: 5 } }),
      ],
      "nota",
      "vistas",
    );
    expect(ids(sorted)).toEqual(["b", "a", "c"]);
  });

  test("same name falls back to createdAt desc then id", () => {
    const sorted = sortTitles(
      [
        item("y", { name: "Same", createdAt: "2026-01-01T00:00:00+00:00" }),
        item("x", { name: "Same", createdAt: "2026-02-01T00:00:00+00:00" }),
        item("w", { name: "Same", createdAt: "2026-01-01T00:00:00+00:00" }),
      ],
      "nota",
      "vistas",
    );
    expect(ids(sorted)).toEqual(["x", "w", "y"]);
  });
});

describe("sortTitles by fecha in Vistas", () => {
  test("orders by watch date desc and puts unknown dates last", () => {
    const sorted = sortTitles(
      [
        item("unknown", { state: "watched" }),
        item("old", { state: "watched", date: "2025-01-01" }),
        item("new", { state: "watched", date: "2026-05-01" }),
      ],
      "fecha",
      "vistas",
    );
    expect(ids(sorted)).toEqual(["new", "old", "unknown"]);
  });
});

describe("sortTitles in Pendientes", () => {
  const urgentOld = item("urgentOld", {
    state: "urgent",
    createdAt: "2026-01-01T00:00:00+00:00",
  });
  const urgentNew = item("urgentNew", {
    state: "urgent",
    createdAt: "2026-03-01T00:00:00+00:00",
  });
  const pendingNew = item("pendingNew", {
    state: "pending",
    createdAt: "2026-04-01T00:00:00+00:00",
  });
  const pendingOld = item("pendingOld", {
    state: "pending",
    createdAt: "2026-02-01T00:00:00+00:00",
  });

  test("priority puts urgent first, then newest added", () => {
    const sorted = sortTitles(
      [pendingNew, urgentOld, pendingOld, urgentNew],
      "priority",
      "pendientes",
    );
    expect(ids(sorted)).toEqual([
      "urgentNew",
      "urgentOld",
      "pendingNew",
      "pendingOld",
    ]);
  });

  test("fecha sorts by createdAt desc, ignoring state", () => {
    const sorted = sortTitles(
      [urgentOld, pendingOld, pendingNew, urgentNew],
      "fecha",
      "pendientes",
    );
    expect(ids(sorted)).toEqual([
      "pendingNew",
      "urgentNew",
      "pendingOld",
      "urgentOld",
    ]);
  });
});

test("does not mutate its input", () => {
  const input = [item("b"), item("a")];
  const snapshot = [...input];
  sortTitles(input, "nota", "vistas");
  expect(input).toEqual(snapshot);
});

describe("sortTitles with seasons", () => {
  function seriesItem(
    id: string,
    seasons: { number: number; state?: string; maria?: number }[],
  ): SortableTitle {
    const created = createTitle({
      name: id,
      kind: "series",
      state: "watched",
      scores: { maria: 1 },
      seasons: seasons.map((s) => ({
        number: s.number,
        state: s.state,
        scores: { maria: s.maria },
      })),
    });
    if (!created.ok) throw new Error("bad fixture");
    return { id, createdAt: "2026-01-01T00:00:00+00:00", title: created.value };
  }

  test("nota orders a series by its derived average, not the title-level score", () => {
    const high = seriesItem("high", [{ number: 1, maria: 9 }]);
    const low = seriesItem("low", [{ number: 1, maria: 3 }]);
    expect(ids(sortTitles([low, high], "nota", "vistas"))).toEqual([
      "high",
      "low",
    ]);
  });

  test("priority uses the derived state of the highest season", () => {
    const urgent = seriesItem("urgent", [
      { number: 1, state: "watched" },
      { number: 2, state: "urgent" },
    ]);
    const plain = seriesItem("plain", [{ number: 1, state: "pending" }]);
    expect(ids(sortTitles([plain, urgent], "priority", "pendientes"))).toEqual([
      "urgent",
      "plain",
    ]);
  });
});
