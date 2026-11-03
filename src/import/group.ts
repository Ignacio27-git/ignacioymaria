import type { PreparedRow } from "./row";
import type { ReportNote } from "./types";

/** Where a title's seasons come from. */
export type SeasonPlan =
  | { kind: "explicit"; seasons: { number: number; row: PreparedRow }[] }
  /** No marker in the sheet: the aired seasons of TMDB (decided after the lookup). */
  | { kind: "allAired" };

export type PlannedTitle = {
  /**
   * Row that carries the title-level data (name, year, actors, state, date,
   * scores): the row of the highest season, or the only unmarked row.
   */
  prepared: PreparedRow;
  plan: SeasonPlan;
};

const asReport = (row: PreparedRow, note: Omit<ReportNote, "row" | "name">): ReportNote => ({
  ...note,
  row: row.row,
  name: row.displayName,
});

function groupByKey(rows: readonly PreparedRow[]): PreparedRow[][] {
  const groups = new Map<string, PreparedRow[]>();
  for (const row of rows) {
    const group = groups.get(row.key);
    if (group === undefined) groups.set(row.key, [row]);
    else group.push(row);
  }
  return [...groups.values()];
}

/**
 * One title per folded clean name (kind is not part of identity); each marked
 * row contributes the seasons it names, with its own state, date and scores.
 *
 * - No row marked: the first row in sheet order wins; the others are
 *   `duplicate` entries and their own notes are dropped.
 * - Some row marked: an unmarked row is a `duplicate` and is not imported. A
 *   season named twice keeps the first row (sheet order); the later row gets a
 *   `duplicate` note. Nothing is merged into one season.
 *
 * Groups follow the sheet order of their first row.
 */
export function groupSeasons(rows: readonly PreparedRow[]): {
  planned: PlannedTitle[];
  notes: ReportNote[];
} {
  const planned: PlannedTitle[] = [];
  const notes: ReportNote[] = [];

  for (const group of groupByKey(rows)) {
    const marked = group.filter((row) => row.seasons !== null);

    if (marked.length === 0) {
      const [first, ...rest] = group;
      planned.push({ prepared: first, plan: { kind: "allAired" } });
      for (const row of rest) {
        notes.push(
          asReport(row, {
            reason: "duplicate",
            original: row.displayName,
            decision: `duplicate of row ${first.row}, not imported`,
          }),
        );
      }
      continue;
    }

    for (const row of group) {
      if (row.seasons !== null) continue;
      notes.push(
        asReport(row, {
          reason: "duplicate",
          original: row.displayName,
          decision: `unmarked row of a series with season rows (first row ${marked[0].row}), not imported`,
        }),
      );
    }

    const taken = new Map<number, PreparedRow>();
    for (const row of marked) {
      const repeated: number[] = [];
      for (const number of row.seasons ?? []) {
        if (taken.has(number)) repeated.push(number);
        else taken.set(number, row);
      }
      if (repeated.length > 0) {
        const first = taken.get(repeated[0]) as PreparedRow;
        notes.push(
          asReport(row, {
            reason: "duplicate",
            original: row.displayName,
            decision: `season ${repeated.join(", ")} already imported from row ${first.row}, kept the first`,
          }),
        );
      }
    }

    const seasons = [...taken.entries()]
      .map(([number, row]) => ({ number, row }))
      .sort((a, b) => a.number - b.number);
    const carrier = seasons[seasons.length - 1].row;
    planned.push({ prepared: carrier, plan: { kind: "explicit", seasons } });

    // The carrier's own notes travel with the title; other contributing rows report theirs.
    for (const row of new Set(seasons.map((s) => s.row))) {
      if (row === carrier) continue;
      for (const own of row.notes) notes.push(asReport(row, own));
    }
  }

  return { planned, notes };
}
