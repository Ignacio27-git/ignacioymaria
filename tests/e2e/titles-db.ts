import {
  CLEAR_TITLES_SQL,
  SEED_SEASON_SQL,
  SEED_TITLE_SQL,
  requireLiveSnapshot,
} from "../../scripts/e2e/local-data";
import { withDb } from "./db";

const REFUSED =
  "No local-data snapshot is pending: refusing to seed the titles table. Run the E2E suite through `pnpm test:e2e`.";

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
 * Empties the titles table. The E2E suite owns the local database for the run:
 * every titles spec starts from nothing so counts and orders are exact. The
 * delete carries the snapshot gate inside the statement, so without a pending
 * snapshot (a stray worker after the restore, or tests run without setup) it
 * deletes nothing and this throws.
 */
export async function clearTitles(): Promise<void> {
  await withDb(async (client) => {
    const result = await client.query(CLEAR_TITLES_SQL);
    // Zero rows is also a legitimate empty table: tell the two apart.
    if (!result.rowCount) await requireLiveSnapshot(client);
  });
}

/**
 * Inserts titles straight into the database and returns their ids by name.
 * Every insert is gated on a pending snapshot; a refused insert throws.
 */
export async function seedTitles(
  titles: readonly SeedTitle[],
): Promise<Record<string, string>> {
  return withDb(async (client) => {
    const ids: Record<string, string> = {};
    for (const title of titles) {
      const { rows } = await client.query<{ id: string }>(SEED_TITLE_SQL, [
        title.name,
        title.kind ?? "movie",
        title.state,
        title.watchDate ?? null,
        title.scoreIgnacio ?? null,
        title.scoreMaria ?? null,
        title.createdAt ?? null,
        title.posterPath ?? null,
      ]);
      if (rows.length === 0) throw new Error(REFUSED);
      ids[title.name] = rows[0].id;
      for (const season of title.seasons ?? []) {
        const inserted = await client.query(SEED_SEASON_SQL, [
          rows[0].id,
          season.number,
          season.state,
          season.watchDate ?? null,
          season.scoreIgnacio ?? null,
          season.scoreMaria ?? null,
        ]);
        if (!inserted.rowCount) throw new Error(REFUSED);
      }
    }
    return ids;
  });
}

/** Throws unless a snapshot is pending: the titles specs call it before touching anything. */
export async function requireSnapshot(): Promise<void> {
  await withDb((client) => requireLiveSnapshot(client));
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
