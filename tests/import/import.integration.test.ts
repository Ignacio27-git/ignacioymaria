import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { Client } from "pg";

import { INSERT_SQL, runImport, type DbClient, type RunDeps } from "../../scripts/import-run";
import { fakeTmdbFetch, movieResult, rawRow, seriesResult } from "./fakes";

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
  args: string[] = [],
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
  const code = await runImport(["--file", "synthetic.xlsx", ...args], deps);
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
  expect(result.logs.join("\n")).toContain("Inserted 2, already existing 0, TMDB conflicts 1, seasons inserted 0.");
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
  expect(second.logs.join("\n")).toContain("Inserted 0, already existing 1, TMDB conflicts 0, seasons inserted 0.");
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

  expect(second.logs.join("\n")).toContain("Inserted 1, already existing 1, TMDB conflicts 0, seasons inserted 0.");
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

// ---------------------------------------------------------------- seasons (1.8)

const WATCHED = "FF61D230";

const seasonsOf = async () =>
  (
    await admin.query(
      `select t.name, s.season_number, s.state, s.score_maria, s.score_ignacio, s.updated_at
         from public.title_seasons s join public.titles t on t.id = s.title_id
        where t.import_key like $1 order by t.import_key, s.season_number`,
      [KEY_LIKE],
    )
  ).rows;

const lastOfUs = () => [
  rawRow(2, name("tlou (t1)"), { fillArgb: WATCHED, scoreMaria: 9, scoreIgnacio: 8 }),
  rawRow(3, name("tlou (t2)"), { fillArgb: WATCHED, scoreMaria: 6, scoreIgnacio: 7.5 }),
];

// S44, S36: the same series on two rows keeps both seasons with their own scores.
test("a series on two season rows keeps both seasons with their own scores", async () => {
  const result = await run(lastOfUs(), { [name("tlou")]: [] });

  expect(result.code).toBe(0);
  expect(result.report).not.toMatch(/merge/i);
  expect(result.report).toContain("- Seasons inserted: 2");
  expect(await mine()).toHaveLength(1);
  expect(await seasonsOf()).toEqual([
    expect.objectContaining({ season_number: 1, state: "watched", score_maria: "9", score_ignacio: "8" }),
    expect.objectContaining({ season_number: 2, state: "watched", score_maria: "6", score_ignacio: "7.5" }),
  ]);
});

// S46: a second full run changes nothing.
test("a second run adds and changes nothing", async () => {
  const search = { [name("tlou")]: [] };
  await run(lastOfUs(), search);
  const before = await seasonsOf();

  const second = await run(lastOfUs(), search);

  expect(second.code).toBe(0);
  expect(second.logs.join("\n")).toContain("Inserted 0, already existing 1");
  expect(second.report).toContain("- Seasons inserted: 0");
  expect(await seasonsOf()).toEqual(before);
});

// S45: the local repair path, parents imported before seasons existed.
test("seasons attach to an already imported parent that has none", async () => {
  await admin.query(
    "insert into public.titles (name, kind, state, import_key) values ($1, 'series', 'watched', $2)",
    ["Edited parent", `pelis:${PREFIX} tlou`],
  );

  const result = await run(lastOfUs(), { [name("tlou")]: [] });

  expect(result.code).toBe(0);
  expect(result.logs.join("\n")).toContain("Inserted 0, already existing 1");
  expect((await mine()).map((r) => r.name)).toEqual(["Edited parent"]);
  expect((await seasonsOf()).map((r) => r.season_number)).toEqual([1, 2]);
});

// R6.6: insert-only, a conflict on (title, season) never overwrites.
test("an existing season is never overwritten by a re-run", async () => {
  const search = { [name("tlou")]: [] };
  await run(lastOfUs(), search);
  await admin.query(
    "update public.title_seasons set score_maria = 1, state = 'pending' where title_id = (select id from public.titles where import_key = $1) and season_number = 1",
    [`pelis:${PREFIX} tlou`],
  );

  await run(lastOfUs(), search);

  expect(await seasonsOf()).toEqual([
    expect.objectContaining({ season_number: 1, state: "pending", score_maria: "1" }),
    expect.objectContaining({ season_number: 2, score_maria: "6" }),
  ]);
});

// S38, S39: unmarked linked series gets only its aired seasons, never season 0.
test("an unmarked linked series gets its aired seasons only", async () => {
  const series = seriesResult(TMDB_BASE_ID + 1, name("aired"), [
    { season_number: 0, air_date: "2000-01-01" },
    { season_number: 1, air_date: "2001-01-01" },
    { season_number: 2, air_date: "2002-01-01" },
    { season_number: 3, air_date: "2999-01-01" },
    { season_number: 4, air_date: null },
  ]);

  const result = await run(
    [rawRow(2, name("aired"), { fillArgb: WATCHED, scoreMaria: 8, year: 2010 })],
    { [name("aired")]: [series] },
  );

  expect(result.code).toBe(0);
  expect((await seasonsOf()).map((r) => [r.season_number, r.score_maria])).toEqual([
    [1, "8"],
    [2, "8"],
  ]);
});

// S37: a range expands to one season per number, same data.
test("a season range creates every season with the same data", async () => {
  await run([rawRow(2, name("range (t1-t3)"), { fillArgb: WATCHED, scoreMaria: 8 })], { [name("range")]: [] });

  expect((await seasonsOf()).map((r) => [r.season_number, r.state, r.score_maria])).toEqual([
    [1, "watched", "8"],
    [2, "watched", "8"],
    [3, "watched", "8"],
  ]);
});

// S47: dry-run writes nothing.
test("a dry run writes neither titles nor seasons", async () => {
  const result = await run(lastOfUs(), { [name("tlou")]: [] }, undefined, ["--dry-run"]);

  expect(result.code).toBe(0);
  expect(await mine()).toEqual([]);
  expect(await seasonsOf()).toEqual([]);
});

// S48: a failing season insert rolls everything back, no partial seasons.
test("a failed season insert leaves neither titles nor partial seasons", async () => {
  const failSecondSeason = (client: Client): DbClient => {
    let seasons = 0;
    return {
      connect: () => client.connect(),
      end: () => client.end(),
      query: async (sql, params) => {
        if (/insert into public.title_seasons/i.test(sql) && ++seasons === 2) {
          return client.query("insert into public.title_seasons (title_id, season_number) values (null, 1)");
        }
        return client.query(sql, params);
      },
    };
  };

  const result = await run(
    [...lastOfUs(), rawRow(4, name("other"))],
    { [name("tlou")]: [], [name("other")]: [] },
    failSecondSeason,
  );

  expect(result.code).toBe(1);
  expect(await mine()).toEqual([]);
  expect(await seasonsOf()).toEqual([]);
});

// R6.9: movies import as before, with no seasons.
test("movies are imported unchanged and get no seasons", async () => {
  const movie = movieResult(TMDB_BASE_ID + 2, name("film"));
  const result = await run([rawRow(2, name("film"), { fillArgb: WATCHED })], { [name("film")]: [movie] });

  expect(result.code).toBe(0);
  expect(await mine()).toEqual([expect.objectContaining({ name: name("film"), tmdb_id: TMDB_BASE_ID + 2 })]);
  expect(await seasonsOf()).toEqual([]);
});
