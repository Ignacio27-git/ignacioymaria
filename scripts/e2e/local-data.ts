/**
 * Snapshot and restore of the local `public.titles` and `public.title_seasons`
 * around an E2E run. Every function takes a connection that is already inside
 * the transaction it must be atomic with; `atomically` opens that transaction.
 */

/** The slice of a `pg` client these functions use. */
export interface Queryable {
  query(
    sql: string | { text: string; values?: unknown[] },
    values?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
}

export type SnapshotState = "absent" | "incomplete" | "complete";

export const SNAPSHOT_SCHEMA = "e2e_local_snapshot";

/** Session advisory lock that admits one E2E run at a time. */
export const RUN_LOCK_KEY = 7_340_001;

/**
 * True while a complete snapshot is pending. The destructive test helpers carry
 * it inside each statement, so a stray worker after the restore changes nothing.
 * If the schema is gone the statement fails with 42P01: that is a refusal too.
 */
export const SNAPSHOT_GATE = `exists (select 1 from ${SNAPSHOT_SCHEMA}.marker)`;

export const CLEAR_TITLES_SQL = `delete from public.titles where ${SNAPSHOT_GATE}`;

/** Parameters: name, kind, state, watch_date, score_ignacio, score_maria, created_at, poster_path. Zero rows means refused. */
export const SEED_TITLE_SQL = `insert into public.titles
  (name, kind, state, watch_date, score_ignacio, score_maria, created_at, poster_path)
select $1::text, $2::text, $3::text, $4::date, $5::numeric, $6::numeric,
  coalesce($7::timestamptz, now()), $8::text
where ${SNAPSHOT_GATE}
returning id`;

/** Parameters: title_id, season_number, state, watch_date, score_ignacio, score_maria. Zero rows means refused. */
export const SEED_SEASON_SQL = `insert into public.title_seasons
  (title_id, season_number, state, watch_date, score_ignacio, score_maria)
select $1::uuid, $2::int, $3::text, $4::date, $5::numeric, $6::numeric
where ${SNAPSHOT_GATE}`;

export const STATE_SQL = `select
  exists (select 1 from pg_namespace where nspname = '${SNAPSHOT_SCHEMA}') as has_schema,
  to_regclass('${SNAPSHOT_SCHEMA}.marker') is not null as has_marker,
  to_regclass('${SNAPSHOT_SCHEMA}.titles') is not null as has_titles,
  to_regclass('${SNAPSHOT_SCHEMA}.title_seasons') is not null as has_seasons`;

export const MARKER_ROWS_SQL = `select count(*)::int as n from ${SNAPSHOT_SCHEMA}.marker`;

const COLUMNS_SQL = `select column_name from information_schema.columns
where table_schema = $1 and table_name = $2 and is_generated = 'NEVER'
order by ordinal_position`;

const quote = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

async function count(q: Queryable, table: string): Promise<number> {
  const { rows } = await q.query(`select count(*)::int as n from ${table}`);
  return Number(rows[0].n);
}

/** Non-generated columns of a table, in table order. */
async function columnsOf(q: Queryable, schema: string, table: string): Promise<string[]> {
  const { rows } = await q.query(COLUMNS_SQL, [schema, table]);
  return rows.map((row) => String(row.column_name));
}

export async function readSnapshotState(q: Queryable): Promise<SnapshotState> {
  const { rows } = await q.query(STATE_SQL);
  const state = rows[0];
  if (!state.has_schema) return "absent";
  if (!state.has_marker || !state.has_titles || !state.has_seasons) return "incomplete";
  const marker = await q.query(MARKER_ROWS_SQL);
  return Number(marker.rows[0].n) === 1 ? "complete" : "incomplete";
}

/**
 * Copies both tables into the snapshot schema, marker last, so the marker only
 * exists for a complete copy. Never overwrites: any existing schema aborts.
 */
export async function takeSnapshot(q: Queryable): Promise<{ titles: number; seasons: number }> {
  const state = await readSnapshotState(q);
  if (state === "complete") {
    throw new Error("A snapshot is already pending; refusing to overwrite it.");
  }
  if (state === "incomplete") {
    throw new Error("The snapshot schema exists but is incomplete; refusing to continue.");
  }

  await q.query(`create schema ${SNAPSHOT_SCHEMA}`);
  for (const table of ["titles", "title_seasons"]) {
    const columns = (await columnsOf(q, "public", table)).map(quote).join(", ");
    await q.query(
      `create table ${SNAPSHOT_SCHEMA}.${table} as select ${columns} from public.${table}`,
    );
  }
  await q.query(
    `create table ${SNAPSHOT_SCHEMA}.marker as select 1 as version, now() as created_at,
       (select count(*) from ${SNAPSHOT_SCHEMA}.titles)::int as titles_count,
       (select count(*) from ${SNAPSHOT_SCHEMA}.title_seasons)::int as seasons_count`,
  );
  const { rows } = await q.query(
    `select titles_count, seasons_count from ${SNAPSHOT_SCHEMA}.marker`,
  );
  return { titles: Number(rows[0].titles_count), seasons: Number(rows[0].seasons_count) };
}

/**
 * Replaces both tables with the snapshot and drops it. A missing snapshot is a
 * no-op; an incomplete or mismatching one throws before anything is deleted.
 */
export async function restoreSnapshot(
  q: Queryable,
): Promise<{ restored: false } | { restored: true; titles: number; seasons: number }> {
  const state = await readSnapshotState(q);
  if (state === "absent") return { restored: false };
  if (state === "incomplete") {
    throw new Error("The snapshot schema is incomplete; refusing to restore from it.");
  }

  const marker = (
    await q.query(`select titles_count, seasons_count from ${SNAPSHOT_SCHEMA}.marker`)
  ).rows[0];
  const expected = { titles: Number(marker.titles_count), seasons: Number(marker.seasons_count) };
  if (
    (await count(q, `${SNAPSHOT_SCHEMA}.titles`)) !== expected.titles ||
    (await count(q, `${SNAPSHOT_SCHEMA}.title_seasons`)) !== expected.seasons
  ) {
    throw new Error("The snapshot row counts do not match its marker; refusing to restore.");
  }

  const lists: Record<string, string> = {};
  for (const table of ["titles", "title_seasons"]) {
    const live = await columnsOf(q, "public", table);
    const copy = await columnsOf(q, SNAPSHOT_SCHEMA, table);
    if ([...live].sort().join(",") !== [...copy].sort().join(",")) {
      throw new Error(
        `The columns of public.${table} changed since the snapshot (live: ${live.join(", ")}; snapshot: ${copy.join(", ")}); refusing to restore.`,
      );
    }
    lists[table] = live.map(quote).join(", ");
  }

  await q.query("delete from public.title_seasons");
  await q.query("delete from public.titles");
  await q.query(
    `insert into public.titles (${lists.titles}) select ${lists.titles} from ${SNAPSHOT_SCHEMA}.titles`,
  );
  await q.query(
    `insert into public.title_seasons (${lists.title_seasons}) select ${lists.title_seasons} from ${SNAPSHOT_SCHEMA}.title_seasons`,
  );

  const restored = {
    titles: await count(q, "public.titles"),
    seasons: await count(q, "public.title_seasons"),
  };
  if (restored.titles !== expected.titles || restored.seasons !== expected.seasons) {
    throw new Error(
      `Restore verification failed: expected ${expected.titles} titles and ${expected.seasons} seasons, found ${restored.titles} and ${restored.seasons}.`,
    );
  }
  await q.query(`drop schema ${SNAPSHOT_SCHEMA} cascade`);
  return { restored: true, ...restored };
}

/**
 * Runs `work` in one transaction that excludes other writers of both tables.
 * Waiting for the lock is bounded: on a timeout nothing ran and nothing changed.
 * The state must be read inside `work`, after the lock is held.
 */
export async function atomically<T>(
  q: Queryable,
  work: (q: Queryable) => Promise<T>,
  options: { lockTimeoutMs?: number } = {},
): Promise<T> {
  const lockTimeoutMs = Math.trunc(options.lockTimeoutMs ?? 15_000);
  await q.query("begin");
  try {
    await q.query(`set local lock_timeout = '${lockTimeoutMs}ms'`);
    await q.query("lock table public.titles, public.title_seasons in share row exclusive mode");
    const result = await work(q);
    await q.query("commit");
    return result;
  } catch (error) {
    // The original failure is the useful one; a dead connection cannot roll back anyway.
    await q.query("rollback").catch(() => undefined);
    throw error;
  }
}

/** Throws unless a snapshot is pending: the destructive helpers' pre-flight. */
export async function requireLiveSnapshot(q: Queryable): Promise<void> {
  let live: boolean;
  try {
    const { rows } = await q.query(`select ${SNAPSHOT_GATE} as live`);
    live = rows[0].live === true;
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") live = false;
    else throw error;
  }
  if (!live) {
    throw new Error(
      "No local-data snapshot is pending: refusing to touch the titles table. Run the E2E suite through `pnpm test:e2e`.",
    );
  }
}
