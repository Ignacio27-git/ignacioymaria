import type { Client } from "pg";

import { openLocalDb } from "../../scripts/e2e/local-db-guard";

export const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/**
 * Runs `work` with a short-lived connection to the local Supabase database.
 * The connection goes through the host guard: a non-local URL is refused
 * before anything is opened.
 */
export async function withDb<T>(work: (client: Client) => Promise<T>): Promise<T> {
  const client = await openLocalDb(DB_URL);
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}
