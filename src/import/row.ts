import type { Result } from "../domain/result";
import { foldSearch } from "../domain/search";
import { createTitle, type Title, type TitleError } from "../domain/title";
import type { WatchDate } from "../domain/watch-date";
import type { WatchState } from "../domain/watch-state";
import { stateFromFill } from "./color";
import type { MatchDecision } from "./match";
import { normalizeScore } from "./score";
import { splitSeason } from "./season";
import { parseSheetDate } from "./sheet-date";
import type { MatchKind, Note, RawRow, ReportNote, SeasonDraft } from "./types";

/** Everything decided from the sheet alone (no TMDB yet). */
export type PreparedRow = {
  row: number;
  /** Name as written in the sheet (for the report). */
  displayName: string;
  /** Clean name: season marker removed, trimmed. */
  name: string;
  /** Idempotency key: "pelis:" + folded clean name. Kind is not part of it. */
  key: string;
  markerKind: MatchKind | null;
  /** Seasons named by the marker (a range is expanded); null when unmarked. */
  seasons: number[] | null;
  year: number | null;
  seriesHint: boolean;
  state: WatchState;
  scores: { maria: number | null; ignacio: number | null };
  watchDate: WatchDate;
  actors: string[];
  observations: string | null;
  notes: Note[];
};

export type TmdbEnrichment = {
  posterPath: string | null;
  actors: readonly string[];
  seasonsTotal: number | null;
};

const YEAR = /^\d{4}$/;
const YEAR_RANGE = /^\d{4}\s*[-–]\s*\d{4}$/;

function foldKey(name: string): string {
  return foldSearch(name).trim().replace(/\s+/g, " ");
}

/** A single year is stored; "-" or a range stores nothing and only hints at a series. */
function parseYear(value: RawRow["year"]): { year: number | null; hint: boolean } {
  if (typeof value === "number") {
    return Number.isInteger(value) && YEAR.test(String(value))
      ? { year: value, hint: false }
      : { year: null, hint: false };
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (YEAR.test(text)) return { year: Number(text), hint: false };
    if (text === "-" || YEAR_RANGE.test(text)) return { year: null, hint: true };
  }
  return { year: null, hint: false };
}

export function prepareRow(raw: RawRow): PreparedRow {
  const displayName = String(raw.name).trim();
  const season = splitSeason(displayName);
  const notes: Note[] = [];
  if (season.note) notes.push(season.note);

  const color = stateFromFill(raw.fillArgb);
  if (color.offLegend) {
    notes.push({
      reason: "off_legend",
      original: color.offLegend.original,
      decision: `mapped to ${color.state} (distance ${color.offLegend.distance.toFixed(1)})`,
    });
  }

  const maria = normalizeScore(raw.scoreMaria, "B");
  const ignacio = normalizeScore(raw.scoreIgnacio, "C");
  for (const score of [maria, ignacio]) if (score.note) notes.push(score.note);

  const date = parseSheetDate(raw.watchDate, raw.watchDateFormat);
  if (date.note) notes.push(date.note);

  const { year, hint } = parseYear(raw.year);

  return {
    row: raw.row,
    displayName,
    name: season.name,
    key: `pelis:${foldKey(season.name)}`,
    markerKind: season.hasMarker ? "series" : null,
    seasons: season.seasons,
    year,
    seriesHint: hint,
    state: color.state,
    scores: { maria: maria.value, ignacio: ignacio.value },
    watchDate: date.watchDate,
    actors: raw.actors
      .split(/\r?\n/)
      .map((actor) => actor.trim())
      .filter((actor) => actor !== ""),
    observations:
      raw.observations === null || raw.observations === ""
        ? null
        : String(raw.observations),
    notes,
  };
}

export type BuiltRow =
  | { ok: true; key: string; title: Title; notes: ReportNote[] }
  | { ok: false; key: string; errors: readonly TitleError[]; notes: ReportNote[] };

/**
 * Prepared row plus the TMDB decision (and details, when linked) and the
 * planned seasons (series only) to a domain title. The result goes through `createTitle`, so it is valid by construction.
 */
export function buildImportRow(
  prepared: PreparedRow,
  decision: MatchDecision,
  details: TmdbEnrichment | null,
  seasons: readonly SeasonDraft[] = [],
): BuiltRow {
  const notes: Note[] = [...prepared.notes, ...decision.notes];
  const candidate = decision.candidate;
  const enrichment = candidate !== null ? details : null;
  if (candidate !== null && details === null) {
    notes.push({
      reason: "unlinked",
      original: prepared.displayName,
      decision: "TMDB details unavailable, left unlinked",
    });
  }

  const kind = decision.kind;
  const input = {
    name: prepared.name,
    kind,
    state: prepared.state,
    year: prepared.year,
    // Deprecated title-level column: the highest season, kept for compatibility.
    seasonsWatched:
      kind === "series" && seasons.length > 0
        ? Math.max(...seasons.map((s) => s.number))
        : null,
    seasons: kind === "series" ? seasons : undefined,
    seasonsTotal: enrichment && kind === "series" ? enrichment.seasonsTotal : null,
    tmdbId: enrichment && candidate ? candidate.tmdbId : null,
    posterPath: enrichment ? enrichment.posterPath : null,
    actors:
      prepared.actors.length > 0 || !enrichment
        ? prepared.actors
        : [...enrichment.actors],
    observations: prepared.observations,
    watchDate: prepared.watchDate,
    scores: prepared.scores,
  };

  const reportNotes: ReportNote[] = notes.map((note) => ({
    ...note,
    row: prepared.row,
    name: prepared.displayName,
  }));
  const created: Result<Title, readonly TitleError[]> = createTitle(input);
  return created.ok
    ? { ok: true, key: prepared.key, title: created.value, notes: reportNotes }
    : { ok: false, key: prepared.key, errors: created.error, notes: reportNotes };
}
