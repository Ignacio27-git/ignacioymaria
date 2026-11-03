import { Client } from "pg";

export const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/** Runs `work` with a short-lived connection to the local Supabase database. */
export async function withDb<T>(work: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}
