import type { Note } from "./types";

export type SeasonSplit = {
  /** Name without the marker, trimmed (intact when the marker is unparseable). */
  name: string;
  seasonsWatched: number | null;
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

export function splitSeason(rawName: string): SeasonSplit {
  const trimmed = rawName.trim();
  const group = TRAILING_GROUP.exec(trimmed);
  if (!group || !LOOKS_LIKE_SEASON.test(group[1])) {
    return { name: trimmed, seasonsWatched: null, hasMarker: false, note: null };
  }

  const marker = `(${group[1]})`;
  if (!WELL_FORMED.test(group[1])) {
    return {
      name: trimmed,
      seasonsWatched: null,
      hasMarker: false,
      note: {
        reason: "season",
        original: marker,
        decision: "season marker not understood, name kept and seasons unset",
      },
    };
  }

  const numbers = (group[1].match(/\d+/g) ?? []).map(Number);
  const highest = Math.max(...numbers);
  const name = trimmed.slice(0, group.index).trim();
  const note: Note | null =
    numbers.length === 1 && highest !== 1
      ? {
          reason: "season",
          original: marker,
          decision: `single season other than 1, seasons watched set to ${highest}`,
        }
      : null;
  return { name, seasonsWatched: highest, hasMarker: true, note };
}
