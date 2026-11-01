import { foldSearch } from "../domain/search";
import type { MatchCandidate, MatchKind, Note } from "./types";

export type MatchInput = {
  /** Clean name (season marker removed). */
  name: string;
  /** Single stored year, or null (empty, "-" or a range). */
  year: number | null;
  /** Kind fixed by a season marker, otherwise null. */
  markerKind: MatchKind | null;
  /** Year range / dash in the sheet: only a bias toward series. */
  seriesHint: boolean;
};

export type MatchDecision = {
  candidate: MatchCandidate | null;
  kind: MatchKind;
  notes: Note[];
};

const fold = (value: string) => foldSearch(value).trim().replace(/\s+/g, " ");

function describeInput(input: MatchInput): string {
  return input.year === null ? input.name : `${input.name} (${input.year})`;
}

/**
 * Clear-match rule: folded exact name, consistent kind and year within +-1 of
 * the stored year; with no stored year only a single exact-name candidate
 * counts. Anything else leaves the title unlinked (never guessed).
 */
export function decideMatch(
  input: MatchInput,
  candidates: readonly MatchCandidate[],
): MatchDecision {
  const wanted = fold(input.name);
  const exact = candidates.filter((c) => c.names.some((n) => fold(n) === wanted));

  const unlinked = (reason: string): MatchDecision => {
    const kind = input.markerKind ?? "movie";
    const notes: Note[] = [
      { reason: "unlinked", original: describeInput(input), decision: reason },
    ];
    if (input.markerKind === null) {
      notes.push({
        reason: "kind",
        original: describeInput(input),
        decision: "movie by default",
      });
    }
    return { candidate: null, kind, notes };
  };

  if (exact.length === 0) return unlinked("no exact-name candidate on TMDB");

  let pool = exact;
  if (input.markerKind !== null) {
    pool = pool.filter((c) => c.kind === input.markerKind);
    if (pool.length === 0) return unlinked("kind mismatch with the season marker");
  } else if (input.seriesHint && input.year === null) {
    const tv = pool.filter((c) => c.kind === "series");
    if (tv.length > 0) pool = tv;
  }

  if (input.year !== null) {
    const year = input.year;
    pool = pool.filter((c) => c.year !== null && Math.abs(c.year - year) <= 1);
    if (pool.length === 0) return unlinked("release year is not within 1 of the sheet year");
  }

  if (pool.length > 1) return unlinked("several candidates match");

  const candidate = pool[0];
  return { candidate, kind: candidate.kind, notes: [] };
}
