/**
 * Columns read from public.titles: an explicit list, never `*`, so a new
 * column cannot leak into the app by accident.
 */
export const TITLE_COLUMNS =
  "id, name, kind, year, actors, observations, watch_date, state, " +
  "score_maria, score_ignacio, seasons_watched, seasons_total, tmdb_id, " +
  "poster_path, created_at";

/** A row as PostgREST returns it; `numeric` columns may arrive as strings. */
export interface TitleRow {
  id: string;
  name: string;
  kind: string;
  year: number | null;
  actors: string[];
  observations: string | null;
  /** `date` column: YYYY-MM-DD. */
  watch_date: string | null;
  state: string;
  score_maria: number | string | null;
  score_ignacio: number | string | null;
  seasons_watched: number | null;
  seasons_total: number | null;
  tmdb_id: number | null;
  poster_path: string | null;
  created_at: string;
}

/** Writable columns of a new row (id and created_at are database-defaulted). */
export type TitleInsert = Omit<TitleRow, "id" | "created_at">;

/** A partial update of exactly the columns being changed. */
export type TitlePatch = Partial<TitleInsert>;
