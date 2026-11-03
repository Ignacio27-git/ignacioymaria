import {
  createTitle,
  err,
  ok,
  UNKNOWN_WATCH_DATE,
  type Result,
  type Title,
  type WatchDate,
} from "@/domain";

import type { SeasonInsert, SeasonRow, TitleInsert, TitleRow } from "./row";
import type { TitleFailure, TitleRecord } from "./types";

const unavailable = err<TitleFailure>({ kind: "unavailable" });

/** `numeric` may arrive as a string; anything unparseable stays NaN and fails the domain. */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return value.trim() === "" ? Number.NaN : Number(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function seasonRowToInput(season: SeasonRow) {
  return {
    number: season.season_number,
    state: season.state,
    watchDate:
      season.watch_date === null || season.watch_date === undefined
        ? UNKNOWN_WATCH_DATE
        : { kind: "known", date: season.watch_date },
    scores: {
      maria: toNumber(season.score_maria),
      ignacio: toNumber(season.score_ignacio),
    },
  };
}

/**
 * Row -> record through the domain constructor. A row the domain rejects is a
 * failure, never a partially rendered title (TC-1).
 */
export function rowToRecord(row: unknown): Result<TitleRecord, TitleFailure> {
  if (!isRecord(row)) return unavailable;
  const r = row as unknown as TitleRow;
  if (typeof r.id !== "string" || typeof r.created_at !== "string") {
    return unavailable;
  }

  const created = createTitle({
    name: r.name,
    kind: r.kind,
    state: r.state,
    year: r.year,
    actors: r.actors ?? [],
    observations: r.observations,
    watchDate:
      r.watch_date === null || r.watch_date === undefined
        ? UNKNOWN_WATCH_DATE
        : { kind: "known", date: r.watch_date },
    tmdbId: r.tmdb_id,
    posterPath: r.poster_path,
    seasonsWatched: r.seasons_watched,
    seasonsTotal: r.seasons_total,
    // Only series carry seasons; a movie's embed is ignored.
    ...(r.kind === "series" ? { seasons: (r.title_seasons ?? []).map(seasonRowToInput) } : {}),
    scores: {
      maria: toNumber(r.score_maria),
      ignacio: toNumber(r.score_ignacio),
    },
  });
  if (!created.ok) {
    console.error("titles row rejected", r.id);
    return unavailable;
  }
  return ok({ id: r.id, createdAt: r.created_at, title: created.value });
}

/** Title -> the writable columns of a new row. */
export function titleToInsert(title: Title): TitleInsert {
  const series = title.kind === "series";
  return {
    name: title.name,
    kind: title.kind,
    year: title.year,
    actors: [...title.actors],
    observations: title.observations,
    watch_date:
      title.watchDate.kind === "known" ? title.watchDate.date : null,
    state: title.state,
    score_maria: title.scores.maria,
    score_ignacio: title.scores.ignacio,
    seasons_watched: series ? title.seasonsWatched : null,
    seasons_total: series ? title.seasonsTotal : null,
    tmdb_id: title.tmdbId,
    poster_path: title.posterPath,
  };
}

/** The first insert of a season: scores are never set at creation. */
export function seasonToInsert(
  titleId: string,
  season: { number: number; state: string; watchDate: WatchDate },
): SeasonInsert {
  return {
    title_id: titleId,
    season_number: season.number,
    state: season.state,
    watch_date:
      season.watchDate.kind === "known" ? season.watchDate.date : null,
  };
}
