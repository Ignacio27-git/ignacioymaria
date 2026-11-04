import type { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { openLocalDb } from "../../scripts/e2e/local-db-guard";
import {
  CLEAR_TITLES_SQL,
  RUN_LOCK_KEY,
  SEED_SEASON_SQL,
  SEED_TITLE_SQL,
  SNAPSHOT_SCHEMA,
  atomically,
  readSnapshotState,
  requireLiveSnapshot,
  restoreSnapshot,
  takeSnapshot,
  type Queryable,
} from "../../scripts/e2e/local-data";
import { rollbackOnly } from "../../scripts/e2e/rollback-only";

/**
 * Runs the snapshot machinery against the REAL local database, inside one
 * transaction that is always rolled back (R8). The functions under test only
 * see `db`, a client that rejects anything that could end that transaction.
 * The one exception is the S5.5 lock case, which opens its own connections,
 * takes a table lock for a moment and writes nothing.
 */

/** Always the LOCAL Supabase database: never read from the environment. */
const LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const FINGERPRINT_SQL = `select
  (select count(*)::int from public.titles) as titles,
  (select count(*)::int from public.title_seasons) as seasons,
  (select coalesce(md5(string_agg(t::text, '|' order by id)), '') from public.titles t) as titles_md5,
  (select coalesce(md5(string_agg(s::text, '|' order by title_id, season_number)), '') from public.title_seasons s) as seasons_md5`;

/** Accounts a run legitimately adds; everything else about the allowlist and auth must not move. */
const ACCOUNTS_SQL = `select
  (select coalesce(md5(string_agg(a::text, '|' order by email)), '') from public.allowed_emails a
     where email not like 'e2e-%@example.test') as allowed_md5,
  (select coalesce(md5(string_agg(u::text, '|' order by id)), '') from auth.users u
     where email not like 'e2e-%@example.test') as users_md5`;

const SNAPSHOT_HASH_SQL = `select
  (select coalesce(md5(string_agg((to_jsonb(t) - 'name_search')::text, '|' order by id)), '') from public.titles t) as live_titles,
  (select coalesce(md5(string_agg((to_jsonb(t) - 'name_search')::text, '|' order by id)), '') from ${SNAPSHOT_SCHEMA}.titles t) as copy_titles,
  (select coalesce(md5(string_agg(to_jsonb(s)::text, '|' order by title_id, season_number)), '') from public.title_seasons s) as live_seasons,
  (select coalesce(md5(string_agg(to_jsonb(s)::text, '|' order by title_id, season_number)), '') from ${SNAPSHOT_SCHEMA}.title_seasons s) as copy_seasons`;

async function read(q: Queryable, sql: string): Promise<Record<string, unknown>> {
  return (await q.query(sql)).rows[0];
}

/** Why a run must not start, or null when the database is quiet. */
async function preflight(q: Queryable): Promise<string | null> {
  const { rows } = await q.query("select pg_try_advisory_xact_lock($1::bigint) as got", [RUN_LOCK_KEY]);
  if (rows[0].got !== true) return "another E2E run holds the run lock";
  const state = await readSnapshotState(q);
  if (state !== "absent") return `a local-data snapshot exists (${state})`;
  return null;
}

let raw: Client;
let db: Queryable;
let observer: Client;
let before: Record<string, unknown>;

beforeAll(async () => {
  // A separate autocommit connection that can only read: the independent witness.
  observer = await openLocalDb(LOCAL_DB_URL, { connectionTimeoutMillis: 5000 });
  await observer.query("set default_transaction_read_only = on");
  before = (await observer.query(FINGERPRINT_SQL)).rows[0];

  raw = await openLocalDb(LOCAL_DB_URL, { connectionTimeoutMillis: 5000 });
  // Outside the explicit transaction every statement is read-only; a stuck suite
  // loses its transaction (and its locks) instead of holding them.
  await raw.query("set default_transaction_read_only = on");
  await raw.query("set idle_in_transaction_session_timeout = '60s'");
  await raw.query("begin read write");
  db = rollbackOnly(raw);

  const reason = await preflight(db);
  if (reason) {
    throw new Error(`Refusing to run the integration suite: ${reason}. Nothing was changed.`);
  }
});

afterAll(async () => {
  await raw?.query("rollback").catch(() => undefined);
  await raw?.end().catch(() => undefined);
  await observer?.end().catch(() => undefined);
});

// Each case works inside its own savepoint and gives everything back.
beforeEach(async () => {
  await raw.query("savepoint case_start");
});
afterEach(async () => {
  await raw.query("rollback to savepoint case_start");
});

/** Gives back what the case did so far and opens a fresh savepoint. */
async function startOver() {
  await raw.query("rollback to savepoint case_start");
}

describe("harness safety", () => {
  it("the session is read-only outside the harness transaction", async () => {
    await expect(observer.query("delete from public.titles where false")).rejects.toMatchObject({
      code: "25006",
    });
  });

  it("S8.3 the wrapper refuses to end the transaction and the transaction stays usable", async () => {
    await expect(db.query("commit")).rejects.toThrow(/not allowed/);
    await expect(db.query("rollback")).rejects.toThrow(/not allowed/);
    expect((await db.query("select 1 as one")).rows[0].one).toBe(1);
  });

  it("S8.3 a statement after a lost transaction cannot write", async () => {
    const lost = await openLocalDb(LOCAL_DB_URL, { connectionTimeoutMillis: 5000 });
    try {
      await lost.query("set default_transaction_read_only = on");
      await lost.query("begin read write");
      await lost.query("rollback"); // the transaction is lost
      await expect(rollbackOnly(lost).query("delete from public.titles where false")).rejects.toMatchObject({
        code: "25006",
      });
    } finally {
      await lost.end();
    }
  });

  it("S8.2 refuses while another run holds the lock", async () => {
    const other = await openLocalDb(LOCAL_DB_URL, { connectionTimeoutMillis: 5000 });
    try {
      await other.query("set default_transaction_read_only = on");
      await other.query("begin");
      // The suite's own transaction holds the xact lock, exactly as a run would.
      expect(await preflight(other)).toMatch(/run lock/);
    } finally {
      await other.query("rollback").catch(() => undefined);
      await other.end();
    }
  });

  it("S8.2 refuses while a snapshot exists", async () => {
    await takeSnapshot(db);
    expect(await preflight(db)).toMatch(/snapshot exists \(complete\)/);
    await startOver();
    await db.query(`create schema ${SNAPSHOT_SCHEMA}`);
    expect(await preflight(db)).toMatch(/snapshot exists \(incomplete\)/);
  });
});

describe("snapshot (R2)", () => {
  it("S2.1 copies populated tables exactly and writes the marker", async () => {
    const live = await read(db, FINGERPRINT_SQL);
    const taken = await takeSnapshot(db);
    expect(taken).toEqual({ titles: live.titles, seasons: live.seasons });
    expect(await readSnapshotState(db)).toBe("complete");

    const hashes = await read(db, SNAPSHOT_HASH_SQL);
    expect(hashes.copy_titles).toBe(hashes.live_titles);
    expect(hashes.copy_seasons).toBe(hashes.live_seasons);
  });

  it("S2.2 marks empty tables as empty", async () => {
    await db.query("delete from public.title_seasons");
    await db.query("delete from public.titles");
    expect(await takeSnapshot(db)).toEqual({ titles: 0, seasons: 0 });
    expect(await readSnapshotState(db)).toBe("complete");
  });

  it("S4.2 will not overwrite a pending snapshot", async () => {
    await takeSnapshot(db);
    await expect(takeSnapshot(db)).rejects.toThrow(/already pending/);
    expect(await readSnapshotState(db)).toBe("complete");
  });

  it("S2.3 leaves the allowlist and the accounts alone through snapshot and restore", async () => {
    const accountsBefore = await read(db, ACCOUNTS_SQL);
    await takeSnapshot(db);
    await restoreSnapshot(db);
    expect(await read(db, ACCOUNTS_SQL)).toEqual(accountsBefore);
  });
});

describe("restore (R3)", () => {
  /** What a titles spec does to the table: empty it, then seed through the gated statements. */
  async function wreckLikeARun() {
    await db.query(CLEAR_TITLES_SQL);
    const { rows } = await db.query(SEED_TITLE_SQL, [
      "e2e-restore-probe", "series", "watched", "2026-01-02", 7.5, 8, "2026-01-03T10:00:00Z", "/probe.jpg",
    ]);
    expect(rows).toHaveLength(1);
    const seeded = await db.query(SEED_SEASON_SQL, [rows[0].id, 1, "watched", null, null, null]);
    expect(seeded.rowCount).toBe(1);
  }

  it("S3.1 reproduces every column, timestamps and seasons included", async () => {
    const original = await read(db, FINGERPRINT_SQL);
    await takeSnapshot(db);
    await wreckLikeARun();
    expect((await read(db, FINGERPRINT_SQL)).titles).toBe(1);

    expect(await restoreSnapshot(db)).toEqual({
      restored: true,
      titles: original.titles,
      seasons: original.seasons,
    });
    expect(await read(db, FINGERPRINT_SQL)).toEqual(original);
    expect(await readSnapshotState(db)).toBe("absent");
  });

  it("S3.2 restores a marked-empty snapshot to empty tables and drops it", async () => {
    await db.query("delete from public.title_seasons");
    await db.query("delete from public.titles");
    await takeSnapshot(db);
    await wreckLikeARun();
    await restoreSnapshot(db);
    expect(await read(db, FINGERPRINT_SQL)).toMatchObject({ titles: 0, seasons: 0 });
    expect(await readSnapshotState(db)).toBe("absent");
  });

  it("S3.3 with no snapshot changes nothing", async () => {
    const original = await read(db, FINGERPRINT_SQL);
    expect(await restoreSnapshot(db)).toEqual({ restored: false });
    expect(await read(db, FINGERPRINT_SQL)).toEqual(original);
  });

  it("S4.1 and S4.6 recover a leftover snapshot first, then take a fresh one", async () => {
    const original = await read(db, FINGERPRINT_SQL);
    await takeSnapshot(db);
    await wreckLikeARun();

    // What a run's start does in its one transaction.
    expect(await readSnapshotState(db)).toBe("complete");
    await restoreSnapshot(db);
    await takeSnapshot(db);

    expect(await read(db, FINGERPRINT_SQL)).toEqual(original);
    const hashes = await read(db, SNAPSHOT_HASH_SQL);
    expect(hashes.copy_titles).toBe(hashes.live_titles);
    expect(await readSnapshotState(db)).toBe("complete");
  });
});

describe("gate (S5.7)", () => {
  it("clearTitles and seedTitles refuse when the schema is gone (42P01) and change nothing", async () => {
    const original = await read(db, FINGERPRINT_SQL);

    await expect(db.query(CLEAR_TITLES_SQL)).rejects.toMatchObject({ code: "42P01" });
    await startOver();
    await expect(
      db.query(SEED_TITLE_SQL, ["gate-probe", "movie", "pending", null, null, null, null, null]),
    ).rejects.toMatchObject({ code: "42P01" });
    await startOver();
    await expect(requireLiveSnapshot(db)).rejects.toThrow(/snapshot/i);
    await startOver();

    expect(await read(db, FINGERPRINT_SQL)).toEqual(original);
  });

  it("an empty marker table blocks the statements without an error and changes nothing", async () => {
    const original = await read(db, FINGERPRINT_SQL);
    await db.query(`create schema ${SNAPSHOT_SCHEMA}`);
    await db.query(`create table ${SNAPSHOT_SCHEMA}.marker (version int)`);

    expect((await db.query(CLEAR_TITLES_SQL)).rowCount).toBe(0);
    const seeded = await db.query(SEED_TITLE_SQL, [
      "gate-probe", "movie", "pending", null, null, null, null, null,
    ]);
    expect(seeded.rows).toEqual([]);
    expect(await read(db, FINGERPRINT_SQL)).toEqual(original);
  });

  it("opens while a snapshot is pending", async () => {
    await takeSnapshot(db);
    await expect(requireLiveSnapshot(db)).resolves.toBeUndefined();
    const { rows } = await db.query(SEED_TITLE_SQL, [
      "gate-probe", "movie", "pending", null, null, null, null, null,
    ]);
    expect(rows).toHaveLength(1);
  });
});

describe("writers and locks (S4.6, S5.5)", () => {
  async function plainConnection(): Promise<Client> {
    return openLocalDb(LOCAL_DB_URL, { connectionTimeoutMillis: 5000 });
  }
  const LOCK_ALL = "lock table public.titles, public.title_seasons in share row exclusive mode";

  it("S5.5 aborts when a writer's lock outlasts lock_timeout, and nothing changes", async () => {
    const holder = await plainConnection();
    const contender = await plainConnection();
    try {
      await holder.query("begin");
      await holder.query("set local lock_timeout = '2s'");
      await holder.query(LOCK_ALL);

      let ran = false;
      await expect(
        atomically(
          contender,
          async () => {
            ran = true;
          },
          { lockTimeoutMs: 300 },
        ),
      ).rejects.toMatchObject({ code: "55P03" });
      expect(ran).toBe(false);
    } finally {
      await holder.query("rollback").catch(() => undefined);
      await holder.end();
      await contender.end();
    }
    expect(await read(observer, FINGERPRINT_SQL)).toEqual(before);
  });

  it("S4.6 a writer cannot slip in while the pair holds the table lock", async () => {
    const holder = await plainConnection();
    const writer = await plainConnection();
    try {
      await holder.query("begin");
      await holder.query("set local lock_timeout = '2s'");
      await holder.query(LOCK_ALL);

      await writer.query("set lock_timeout = '300ms'");
      // Matches no row, so it could not change data even if it were let through.
      await expect(writer.query("delete from public.titles where false")).rejects.toMatchObject({
        code: "55P03",
      });
    } finally {
      await holder.query("rollback").catch(() => undefined);
      await holder.end();
      await writer.end();
    }
  });
});

describe("the real rows (S8.1)", () => {
  it("are identical once the suite's transaction is rolled back", async () => {
    await raw.query("rollback"); // the harness ends its own transaction
    const after = (await observer.query(FINGERPRINT_SQL)).rows[0];
    expect(
      after,
      "The real titles or seasons changed during the suite. Editing data in the dev server while it runs would explain it; otherwise this is a bug.",
    ).toEqual(before);
    // afterEach rolls back to a savepoint that no longer exists; reopen one.
    await raw.query("begin read write");
    await raw.query("savepoint case_start");
  });
});
