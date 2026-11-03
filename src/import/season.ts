import type { Note } from "./types";

export type SeasonSplit = {
  /** Name without the marker, trimmed (intact when the marker is unparseable). */
  name: string;
  /** Seasons the marker names, ascending (a range is expanded); null without a marker. */
  seasons: number[] | null;
  /** True only for a recognized, parsed marker (it implies a series). */
  hasMarker: boolean;
  note: Note | null;
};

/** Trailing parenthesised group at the end of the name. */
const TRAILING_GROUP = /\(\s*([^()]*?)\s*\)\s*$/;
/** Looks like a season marker: starts with temp / t. / t followed by a digit. */
const LOOKS_LIKE_SEASON = /^(?:temp\w*\.?|t\.|t(?=\d))/i;
/** A well-formed marker: prefix, a number, then more numbers joined by - y , &. */
const WELL_FORMED =
  /^(?:temp\w*\.?|t\.?)\s*\d+(?:\s*(?:-|y|,|&)\s*t?\.?\s*\d+)*$/i;

/** A range wider than this is a typo, not a season list. */
const MAX_SEASON = 100;

/** Numbers and the separators between them, in order: "1-t3 y 5" -> 1 "-" 3 "y" 5. */
const SEASON_TOKEN = /(\d+)|(-|y|,|&)/gi;

function seasonsOf(marker: string): number[] | null {
  const numbers: number[] = [];
  const separators: string[] = [];
  for (const token of marker.matchAll(SEASON_TOKEN)) {
    if (token[1] !== undefined) numbers.push(Number(token[1]));
    else if (numbers.length > 0) separators.push(token[2].toLowerCase());
  }
  const seasons = new Set<number>();
  for (const [index, from] of numbers.entries()) {
    if (from < 1 || from > MAX_SEASON) return null;
    seasons.add(from);
    if (separators[index] === "-") {
      const to = numbers[index + 1];
      if (to < from || to > MAX_SEASON) return null;
      for (let n = from; n <= to; n++) seasons.add(n);
    }
  }
  return [...seasons].sort((a, b) => a - b);
}

export function splitSeason(rawName: string): SeasonSplit {
  const trimmed = rawName.trim();
  const group = TRAILING_GROUP.exec(trimmed);
  if (!group || !LOOKS_LIKE_SEASON.test(group[1])) {
    return { name: trimmed, seasons: null, hasMarker: false, note: null };
  }

  const marker = `(${group[1]})`;
  const seasons = WELL_FORMED.test(group[1]) ? seasonsOf(group[1]) : null;
  if (seasons === null) {
    return {
      name: trimmed,
      seasons: null,
      hasMarker: false,
      note: {
        reason: "season",
        original: marker,
        decision: "season marker not understood, name kept and seasons unset",
      },
    };
  }

  const name = trimmed.slice(0, group.index).trim();
  const note: Note | null = /-/.test(group[1])
    ? {
        reason: "season",
        original: marker,
        decision: `range expanded to seasons ${seasons.join(", ")}`,
      }
    : null;
  return { name, seasons, hasMarker: true, note };
}
