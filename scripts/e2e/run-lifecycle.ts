import {
  RUN_LOCK_KEY,
  atomically,
  readSnapshotState,
  restoreSnapshot,
  takeSnapshot,
  type Queryable,
} from "./local-data";
import { openLocalDb } from "./local-db-guard";

export interface LifecycleClient extends Queryable {
  on(event: "error", listener: (error: Error) => void): unknown;
  end(): Promise<void>;
}

export interface DataOps {
  atomically<T>(q: Queryable, work: (q: Queryable) => Promise<T>): Promise<T>;
  readSnapshotState(q: Queryable): Promise<"absent" | "incomplete" | "complete">;
  takeSnapshot(q: Queryable): Promise<{ titles: number; seasons: number }>;
  restoreSnapshot(
    q: Queryable,
  ): Promise<{ restored: false } | { restored: true; titles: number; seasons: number }>;
}

export interface LifecycleDeps {
  url: string;
  /** Accounts the run may sign in with; allowlisted before the snapshot. */
  allowlist: readonly { email: string; person: string }[];
  openDb?: (
    url: string,
    options: { keepAlive: boolean; connectionTimeoutMillis: number },
  ) => Promise<LifecycleClient>;
  data?: DataOps;
  log?: (message: string) => void;
}

interface Run {
  client: LifecycleClient;
  /** Set only after the snapshot transaction committed. */
  owned: boolean;
  lost: boolean;
}

const REFUSED_LOCK =
  "Another E2E run is in progress (or a stale database backend still holds the run lock). Nothing was read or changed.";

/**
 * The start and end of one E2E run: one guarded connection holds an advisory
 * lock, takes the snapshot and gives the data back. Playwright's globalSetup
 * calls `begin`; the `globalTeardown` file calls `end`, which runs even when
 * setup threw. Process death releases the lock, and the next run recovers.
 */
export function createLifecycle(deps: LifecycleDeps) {
  const openDb = deps.openDb ?? openLocalDb;
  const data: DataOps = deps.data ?? { atomically, readSnapshotState, takeSnapshot, restoreSnapshot };
  const log = deps.log ?? ((message: string) => console.warn(message));

  let run: Run | undefined;
  let beginning: Promise<void> | undefined;

  async function release(client: LifecycleClient, lost: boolean): Promise<void> {
    if (!lost) {
      await client.query("select pg_advisory_unlock($1::bigint)", [RUN_LOCK_KEY]).catch(() => undefined);
    }
    await client.end().catch(() => undefined);
  }

  async function start(): Promise<void> {
    const client = await openDb(deps.url, { keepAlive: true, connectionTimeoutMillis: 10_000 });
    const current: Run = { client, owned: false, lost: false };
    client.on("error", (error: Error) => {
      current.lost = true;
      log(
        `E2E: the database connection was lost (${error.message}). The data will NOT be restored by this run; the snapshot is kept and the next run recovers it.`,
      );
    });
    run = current;

    try {
      const { rows } = await client.query("select pg_try_advisory_lock($1::bigint) as locked", [RUN_LOCK_KEY]);
      if (rows[0].locked !== true) {
        // Not ours: closing the connection must not unlock another run's lock.
        run = undefined;
        await client.end().catch(() => undefined);
        throw new Error(REFUSED_LOCK);
      }

      for (const { email, person } of deps.allowlist) {
        await client.query(
          "insert into public.allowed_emails (email, person) values ($1, $2) on conflict do nothing",
          [email, person],
        );
      }

      const recovered = await data.atomically(client, async (tx) => {
        const state = await data.readSnapshotState(tx);
        if (state === "incomplete") {
          throw new Error("The snapshot schema exists but is incomplete; refusing to start. Nothing was changed.");
        }
        let restored: Awaited<ReturnType<DataOps["restoreSnapshot"]>> | undefined;
        if (state === "complete") restored = await data.restoreSnapshot(tx);
        await data.takeSnapshot(tx);
        return restored;
      });
      current.owned = true;
      if (recovered?.restored) {
        log(
          `E2E: a snapshot left by an interrupted run was restored first (${recovered.titles} titles, ${recovered.seasons} seasons), then a new one was taken.`,
        );
      }
    } catch (error) {
      if (run === current) {
        run = undefined;
        await release(client, current.lost);
      }
      throw error;
    }
  }

  return {
    /** Guard, lock, allowlist, then recovery and snapshot in one transaction. */
    async begin(): Promise<void> {
      if (beginning || run) {
        throw new Error("An E2E run has already begun; call end() before beginning another.");
      }
      beginning = start();
      return beginning;
    },

    /** Restores what this run snapshotted, then releases the lock. A no-op when it owns nothing. */
    async end(): Promise<void> {
      if (!beginning) return;
      await beginning.catch(() => undefined);
      const finished = run;
      run = undefined;
      beginning = undefined;
      if (!finished) return;

      try {
        if (finished.lost) {
          throw new Error(
            "The database connection was lost during the run: the data was NOT restored. The snapshot is kept; the next run recovers it.",
          );
        }
        if (!finished.owned) return;
        const result = await data.atomically(finished.client, (tx) => data.restoreSnapshot(tx));
        if (!result.restored) {
          throw new Error("This run took a snapshot but none exists at teardown; the data could not be verified.");
        }
        log(`E2E: restored ${result.titles} titles and ${result.seasons} seasons.`);
      } finally {
        await release(finished.client, finished.lost);
      }
    },
  };
}
