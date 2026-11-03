/**
 * Columns read from public.titles: an explicit list, never `*`, so a new
 * column cannot leak into the app by accident.
 */
export const TITLE_COLUMNS =
  "id, name, kind, year, actors, observations, watch_date, state, " +
  "score_maria, score_ignacio, seasons_watched, seasons_total, tmdb_id, " +
  "poster_path, created_at";

/** Columns of the `title_seasons` embed read together with each title. */
export const SEASON_COLUMNS =
  "season_number, state, watch_date, score_maria, score_ignacio";

/** What the repository selects for a title: its columns plus its seasons. */
export const TITLE_SELECT = `${TITLE_COLUMNS}, title_seasons(${SEASON_COLUMNS})`;

/** A season as embedded by PostgREST; `numeric` may arrive as a string. */
export interface SeasonRow {
  season_number: number;
  state: string;
  /** `date` column: YYYY-MM-DD. */
  watch_date: string | null;
  score_maria: number | string | null;
  score_ignacio: number | string | null;
}

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
  /** Embedded seasons; absent or null when the title has none. */
  title_seasons?: SeasonRow[] | null;
}

/** Writable columns of a new row (id and created_at are database-defaulted). */
export type TitleInsert = Omit<TitleRow, "id" | "created_at" | "title_seasons">;

/** A partial update of exactly the columns being changed. */
export type TitlePatch = Partial<TitleInsert>;

/** A new season row; scores are never set at creation. */
export interface SeasonInsert {
  title_id: string;
  season_number: number;
  state: string;
  watch_date: string | null;
}

/** A partial update of exactly the season columns being changed. */
export type SeasonPatch = Partial<
  Pick<SeasonRow, "state" | "watch_date" | "score_maria" | "score_ignacio">
>;
