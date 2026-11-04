import { withDb } from "./db";

export interface SeedSeason {
  number: number;
  state: string;
  /** ISO day, or omitted for an unknown date. */
  watchDate?: string;
  scoreIgnacio?: number;
  scoreMaria?: number;
}

export interface SeedTitle {
  name: string;
  kind?: "movie" | "series";
  state: string;
  /** ISO day, or omitted for an unknown date. */
  watchDate?: string;
  scoreIgnacio?: number;
  scoreMaria?: number;
  /** ISO timestamp; the database default (now) when omitted. */
  createdAt?: string;
  /** TMDB poster path ("/abc.jpg"); no poster when omitted. */
  posterPath?: string;
  /** Series only: its season rows. Omitted leaves the series without seasons. */
  seasons?: readonly SeedSeason[];
}

/**
 * Empties the titles table. The E2E suite owns the local database: every
 * titles spec starts from nothing so counts and orders are exact.
 */
export async function clearTitles(): Promise<void> {
  await withDb((client) => client.query("delete from public.titles"));
}

/** Inserts titles straight into the database and returns their ids by name. */
export async function seedTitles(
  titles: readonly SeedTitle[],
): Promise<Record<string, string>> {
  return withDb(async (client) => {
    const ids: Record<string, string> = {};
    for (const title of titles) {
      const { rows } = await client.query<{ id: string }>(
        `insert into public.titles
           (name, kind, state, watch_date, score_ignacio, score_maria, created_at, poster_path)
         values ($1, $2, $3, $4, $5, $6, coalesce($7::timestamptz, now()), $8)
         returning id`,
        [
          title.name,
          title.kind ?? "movie",
          title.state,
          title.watchDate ?? null,
          title.scoreIgnacio ?? null,
          title.scoreMaria ?? null,
          title.createdAt ?? null,
          title.posterPath ?? null,
        ],
      );
      ids[title.name] = rows[0].id;
      for (const season of title.seasons ?? []) {
        await client.query(
          `insert into public.title_seasons
             (title_id, season_number, state, watch_date, score_ignacio, score_maria)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            rows[0].id,
            season.number,
            season.state,
            season.watchDate ?? null,
            season.scoreIgnacio ?? null,
            season.scoreMaria ?? null,
          ],
        );
      }
    }
    return ids;
  });
}

/** How many titles carry this name (an exact match). */
export async function countTitles(name: string): Promise<number> {
  return withDb(async (client) => {
    const { rows } = await client.query<{ count: string }>(
      "select count(*) from public.titles where name = $1",
      [name],
    );
    return Number(rows[0].count);
  });
}

/** Today's calendar day in Madrid, as the app computes it (A2). */
export function todayInMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(
    new Date(),
  );
}
