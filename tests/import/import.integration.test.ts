import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { Client } from "pg";

import { INSERT_SQL, runImport, type DbClient, type RunDeps } from "../../scripts/import-run";
import { fakeTmdbFetch, movieResult, rawRow } from "./fakes";

/** Always the LOCAL Supabase database: never read from the environment. */
const LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/** Every row these tests create has an import_key starting with this prefix. */
const PREFIX = `zzit${Date.now().toString(36)}`;
const KEY_LIKE = `pelis:${PREFIX}%`;
const name = (suffix: string) => `${PREFIX} ${suffix}`;
/** Far above any real TMDB id, so a synthetic link never meets a real title. */
const TMDB_BASE_ID = 900_000_000 + (Date.now() % 1_000_000);

let admin: Client;

beforeAll(async () => {
  admin = new Client({ connectionString: LOCAL_DB_URL });
  await admin.connect();
});

const cleanup = () => admin.query("delete from public.titles where import_key like $1", [KEY_LIKE]);
afterEach(cleanup);
afterAll(async () => {
  await cleanup();
  await admin.end();
});

type RunResult = { code: number; logs: string[]; errors: string[]; report: string };

async function run(
  rows: ReturnType<typeof rawRow>[],
  search: Parameters<typeof fakeTmdbFetch>[0],
  wrapClient: (client: Client) => DbClient = (client) => client,
): Promise<RunResult> {
  const logs: string[] = [];
  const errors: string[] = [];
  let report = "";
  const deps: RunDeps = {
    env: { TMDB_READ_ACCESS_TOKEN: "fake-token", IMPORT_DB_URL: LOCAL_DB_URL },
    fileExists: () => true,
    readRows: async () => ({ rows, themedFills: 0 }),
    fetch: fakeTmdbFetch(search),
    createClient: (url) => wrapClient(new Client({ connectionString: url })),
    writeReport: async (_path, text) => {
      report = text;
    },
    log: (message) => logs.push(message),
    error: (message) => errors.push(message),
    now: () => new Date(),
  };
  const code = await runImport(["--file", "synthetic.xlsx"], deps);
  return { code, logs, errors, report };
}

const mine = async () =>
  (
    await admin.query(
      "select name, tmdb_id, observations, state from public.titles where import_key like $1 order by import_key",
      [KEY_LIKE],
    )
  ).rows;

vi.spyOn(console, "error").mockImplementation(() => undefined);

// Spec, TMDB: two different sheet names linking to the same TMDB title.
test("two sheet names with the same TMDB title: the second is a reported conflict, the run goes on", async () => {
  const shared = movieResult(TMDB_BASE_ID, name("alpha"), name("beta"));
  const result = await run(
    [rawRow(2, name("alpha")), rawRow(3, name("beta")), rawRow(4, name("gamma"))],
    { [name("alpha")]: [shared], [name("beta")]: [shared], [name("gamma")]: [] },
  );

  expect(result.code).toBe(0);
  expect(result.logs.join("\n")).toContain("Inserted 2, already existing 0, TMDB conflicts 1.");
  expect(await mine()).toEqual([
    expect.objectContaining({ name: name("alpha"), tmdb_id: TMDB_BASE_ID }),
    expect.objectContaining({ name: name("gamma"), tmdb_id: null }),
  ]);
  expect(result.report).toContain("not inserted: another title already has this TMDB id");
  expect(result.report).toContain(name("beta"));
});

// Spec, persistence: an imported row edited in the app is never overwritten.
test("a row edited in the app is untouched by a re-run", async () => {
  const rows = [rawRow(2, name("edited"))];
  expect((await run(rows, { [name("edited")]: [] })).code).toBe(0);
  await admin.query(
    "update public.titles set name = $2, observations = $3, state = 'watched' where import_key like $1",
    [`pelis:${PREFIX} edited`, "Edited in the app", "my notes"],
  );

  const second = await run(rows, { [name("edited")]: [] });

  expect(second.code).toBe(0);
  expect(second.logs.join("\n")).toContain("Inserted 0, already existing 1, TMDB conflicts 0.");
  expect(await mine()).toEqual([
    expect.objectContaining({ name: "Edited in the app", observations: "my notes", state: "watched" }),
  ]);
});

// Spec, persistence: deleting in the app means the next run brings it back.
test("a title deleted in the app is inserted again by a later run", async () => {
  const rows = [rawRow(2, name("deleted")), rawRow(3, name("kept"))];
  const search = { [name("deleted")]: [], [name("kept")]: [] };
  expect((await run(rows, search)).code).toBe(0);
  await admin.query("delete from public.titles where import_key = $1", [`pelis:${PREFIX} deleted`]);
  expect(await mine()).toHaveLength(1);

  const second = await run(rows, search);

  expect(second.logs.join("\n")).toContain("Inserted 1, already existing 1, TMDB conflicts 0.");
  expect((await mine()).map((r) => r.name)).toEqual([name("deleted"), name("kept")]);
});

// Spec, persistence: all or nothing.
test("a failed insert rolls back the whole transaction", async () => {
  const failSecondInsert = (client: Client): DbClient => {
    let inserts = 0;
    return {
      connect: () => client.connect(),
      end: () => client.end(),
      query: async (sql, params) => {
        if (sql === INSERT_SQL && ++inserts === 2) {
          // A not-null violation: not a unique conflict, so `on conflict do nothing` cannot absorb it.
          return client.query("insert into public.titles (name, kind) values (null, 'movie')");
        }
        return client.query(sql, params);
      },
    };
  };
  const rows = [rawRow(2, name("first")), rawRow(3, name("second")), rawRow(4, name("third"))];

  const result = await run(
    rows,
    { [name("first")]: [], [name("second")]: [], [name("third")]: [] },
    failSecondInsert,
  );

  expect(result.code).toBe(1);
  expect(result.errors.join("\n")).toContain("import failed:");
  expect(await mine()).toEqual([]);
});
