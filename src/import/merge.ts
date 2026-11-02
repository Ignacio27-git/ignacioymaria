import type { PreparedRow } from "./row";
import type { ReportNote } from "./types";

/** Unmarked rows rank below any marked row (a marked row has at least 0). */
const UNMARKED_RANK = -1;

const rank = (row: PreparedRow): number =>
  row.markerKind === null ? UNMARKED_RANK : (row.seasonsWatched ?? 0);

const asReport = (row: PreparedRow, note: Omit<ReportNote, "row" | "name">): ReportNote => ({
  ...note,
  row: row.row,
  name: row.displayName,
});

/** What the people need to re-enter the season later, with the values as imported. */
function describeRow(row: PreparedRow): string {
  const score = (value: number | null) => (value === null ? "-" : String(value));
  const date = row.watchDate.kind === "known" ? row.watchDate.date : "unknown";
  return `state ${row.state}, scores ${score(row.scores.maria)} / ${score(row.scores.ignacio)}, date ${date}`;
}

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
 * One title per folded clean name (kind is not part of identity).
 *
 * - No row marked: the first row in sheet order wins; the others are plain
 *   `duplicate` entries and their own notes are dropped.
 * - Some row marked (interim season merge, until ratings are per season): the
 *   row with the highest season wins (unmarked ranks lowest, ties go to the
 *   first in sheet order) and keeps its own state, scores, date and notes. The
 *   kept row is a series with the highest `seasonsWatched` of the group. Every
 *   other row is reported with its own data (`season_merge`) plus its own
 *   preparation notes, so nothing is lost silently.
 *
 * Kept rows follow the sheet order of each group's first occurrence.
 */
export function resolveCollisions(rows: readonly PreparedRow[]): {
  kept: PreparedRow[];
  notes: ReportNote[];
} {
  const kept: PreparedRow[] = [];
  const notes: ReportNote[] = [];

  for (const group of groupByKey(rows)) {
    if (group.length === 1) {
      kept.push(group[0]);
      continue;
    }

    if (group.every((row) => row.markerKind === null)) {
      const [first, ...rest] = group;
      kept.push(first);
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

    const winner = group.reduce((best, row) => (rank(row) > rank(best) ? row : best));
    const seasonsWatched = Math.max(...group.map((row) => row.seasonsWatched ?? 0));
    kept.push({ ...winner, markerKind: "series", seasonsWatched });
    for (const row of group) {
      if (row === winner) continue;
      for (const own of row.notes) notes.push(asReport(row, own));
      notes.push(
        asReport(row, {
          reason: "season_merge",
          original: describeRow(row),
          decision: `merged into row ${winner.row} (seasons watched ${seasonsWatched})`,
        }),
      );
    }
  }

  return { kept, notes };
}
